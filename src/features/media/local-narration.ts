import { NarrationClipSchema } from "../../contracts/media.ts";
import type { NarrationClip } from "../../contracts/media.ts";
import type { VoiceProfile, SpeechSettings } from "../../contracts/speech.ts";
import { sameOriginFetch } from "../../contracts/same-origin-fetch.ts";

export async function requestLocalNarration(
  request: {
    storyId: string;
    locale: string;
    segmentId: string;
    text: string;
    voiceId: string;
    profile?: VoiceProfile;
    settings?: SpeechSettings;
    settingsKey?: string;
  },
  signal: AbortSignal,
  editorPreview = false,
): Promise<{ clip: NarrationClip; audioUrl: string } | null> {
  if (!import.meta.env.DEV) return null;
  try {
    const response = await sameOriginFetch(
      `${import.meta.env.BASE_URL}api/narration${editorPreview ? "/editor-preview" : ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal,
        timeoutMs: 90000,
        maxBytes: 200000,
      },
    );
    if (!response.ok) return null;
    const source = await response.text();
    if (source.length > 200000) return null;
    const data = JSON.parse(source);
    const clip = NarrationClipSchema.parse(data.clip);
    if (
      !/^\/api\/narration\/audio\/[a-f0-9]{64}\.mp3$/.test(data.audioPath) ||
      clip.segmentId !== request.segmentId ||
      clip.locale !== request.locale ||
      clip.voiceId !== request.voiceId ||
      (request.settingsKey !== undefined && clip.settingsKey !== request.settingsKey)
    )
      return null;
    return { clip, audioUrl: `${import.meta.env.BASE_URL}${data.audioPath.slice(1)}` };
  } catch {
    return null;
  }
}
