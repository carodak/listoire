import { storyFileUrl } from "../../contracts/app-path.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { NarrationClip, NarrationProgress } from "../../contracts/media.ts";
import { sha256, textDigest } from "../../contracts/digest.ts";
import { sameOriginFetch } from "../../contracts/same-origin-fetch.ts";
import { requestLocalNarration } from "./local-narration.ts";
import { speechOptions } from "./speech-options.ts";
import { narrationCharacters } from "./narration-progress.ts";
import type { AudioManager, PlaybackResult } from "./audio-manager.ts";

export async function findRecording(
  segment: Frame["segments"][number],
  bundle: StoryBundle,
  voiceId: string,
  signal: AbortSignal,
  editorPreview: boolean,
) {
  const digest = await textDigest(segment.text);
  const options = await speechOptions(voiceId, bundle.voiceProfiles, bundle.speechSettings);
  if (bundle.narrationMode === "disabled") return;
  const clip = bundle.narration?.find(function matchesClip(clip) {
    return (
      clip.segmentId === segment.id &&
      clip.locale === bundle.locale &&
      clip.spokenTextDigest === digest &&
      (!options.settingsKey ||
        clip.assetId.startsWith("recording.") ||
        clip.settingsKey === options.settingsKey) &&
      (!voiceId || clip.voiceId === voiceId) &&
      (bundle.narratorVoiceSelection === undefined ||
        bundle.narratorVoiceSelection.includes(clip.voiceId))
    );
  });
  const asset = bundle.assets?.find(
    (asset) => asset.id === clip?.assetId && asset.type === "audio",
  );
  if (clip && asset)
    return {
      clip,
      audioUrl: bundle.embeddedAudio?.[asset.id] ?? storyFileUrl(bundle.storyId, asset.path),
    };
  const local =
    voiceId && (!bundle.narrationMode || bundle.narrationMode === "ai-live")
      ? await requestLocalNarration(
          {
            storyId: bundle.storyId,
            locale: bundle.locale,
            segmentId: segment.id,
            text: segment.text,
            voiceId,
            ...options,
          },
          signal,
          editorPreview,
        )
      : null;
  return local?.clip.spokenTextDigest === digest ? local : undefined;
}

export async function playRecording(
  audio: AudioManager,
  clip: NarrationClip,
  text: string,
  audioUrl: string,
  rate: number,
  signal: AbortSignal,
  onProgress: (progress: NarrationProgress) => void,
): Promise<PlaybackResult> {
  if (clip.marks.some((mark) => mark.character > text.length)) return "unavailable";
  let url: string | undefined;
  try {
    // Download allowance grows with the clip (about 1 s per second of audio) for slow mobile links.
    const response = await sameOriginFetch(audioUrl, {
      signal,
      timeoutMs: 10000 + clip.durationMs,
      maxBytes: 10000000,
    });
    if (!response.ok) return "error";
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 10000000) return "error";
    if ((await sha256(bytes)) !== clip.audioDigest) return "error";
    if (signal.aborted) return "aborted";
    url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
    audio.setDucking(true);
    const playback = audio.play({
      url,
      channel: "narration",
      signal,
      rate,
      onTime: (seconds) => {
        onProgress({
          segmentId: clip.segmentId,
          characters: narrationCharacters(clip, text.length, seconds),
          done: false,
        });
      },
    });
    return await playback;
  } catch {
    return signal.aborted ? "aborted" : "error";
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
