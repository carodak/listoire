import type { StoryProject } from "../../contracts/editor-project.ts";
import { NarrationClipSchema } from "../../contracts/media.ts";
import { requestLocalNarration } from "../media/local-narration.ts";
import { speechOptions } from "../media/speech-options.ts";
import { textDigest } from "../../contracts/digest.ts";
import { audioDuration, cacheNarration, narrationBytes } from "./narration-authoring.ts";
import { parseTypography } from "../../contracts/typography.ts";
type Language = StoryProject["languages"][string];
interface Segment {
  id: string;
  text: string;
}
export async function generateNarrationPreview(
  storyId: string,
  locale: string,
  language: Language,
  segment: Segment | undefined,
  voice: string,
  signal: AbortSignal,
) {
  if (!segment || !voice) throw new Error("Choose a narrative segment and voice first.");
  const spoken = parseTypography(segment.text).text;
  const result = await requestLocalNarration(
    {
      storyId,
      locale,
      segmentId: segment.id,
      text: spoken,
      voiceId: voice,
      ...(await speechOptions(
        voice,
        language.configuration.voiceProfiles,
        language.configuration.speechSettings,
      )),
    },
    signal,
    true,
  );
  if (!result)
    throw new Error(
      "Local Chatterbox is unavailable. Start scripts/start-local.ps1; supported local languages are English and French.",
    );
  return { clip: result.clip, dataUrl: await cacheNarration(result, spoken, signal) };
}
export async function readHumanRecording(
  file: File,
  locale: string,
  segment: Segment | undefined,
  voice: string,
  recording: { rights: string; duration: number; marks: string },
) {
  if (!segment) throw new Error("Choose the narrative segment first.");
  if (!recording.rights.trim()) throw new Error("Record your rights attestation before uploading.");
  if (file.size > 5_000_000 || !file.name.toLowerCase().endsWith(".mp3"))
    throw new Error("Upload an MP3 smaller than 5 MB.");
  const { audioDigest, dataUrl } = await narrationBytes(await file.arrayBuffer());
  const durationMs = recording.duration ? recording.duration * 1000 : await audioDuration(dataUrl);
  const clip = NarrationClipSchema.parse({
    segmentId: segment.id,
    locale,
    voiceId: voice || "human",
    spokenTextDigest: await textDigest(parseTypography(segment.text).text),
    assetId: `recording.${audioDigest}`,
    audioDigest,
    durationMs,
    marks: JSON.parse(recording.marks),
    approval: { status: "preview", reviewer: "author-upload", rightsReference: recording.rights },
  });
  return { clip, dataUrl };
}
export function applyNarrationConfiguration(
  project: StoryProject,
  locale: string,
  language: Language,
) {
  const languages = { ...project.languages, [locale]: language };
  if (project.shareConfiguration)
    for (const [id, current] of Object.entries(languages)) {
      if (id === locale) continue;
      const profiles = language.configuration.voiceProfiles?.filter(
        (profile) => profile.model !== "nano" || id.startsWith("en"),
      );
      const voice = profiles?.find((profile) => profile.id === language.defaults.narratorVoice);
      languages[id] = {
        ...current,
        narrationMode: language.narrationMode,
        defaults: {
          ...current.defaults,
          narration: language.defaults.narration,
          narrationRate: language.defaults.narrationRate,
          deviceVoice: language.defaults.deviceVoice,
          ...(voice ? { narratorVoice: voice.id } : {}),
        },
        configuration: {
          ...current.configuration,
          speechSettings: language.configuration.speechSettings,
          ...(profiles
            ? {
                voiceProfiles: profiles,
                narratorVoices: profiles.map(({ id, label }) => ({ id, label })),
                narratorVoiceSelection: profiles.map((profile) => profile.id),
              }
            : {}),
        },
      };
    }
  return { ...project, languages };
}
