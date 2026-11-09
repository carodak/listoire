import type { VoiceProfile, SpeechSettings } from "../../contracts/speech.ts";
export async function speechOptions(
  voiceId: string,
  profiles?: VoiceProfile[],
  settings?: SpeechSettings,
): Promise<{ profile?: VoiceProfile; settings?: SpeechSettings; settingsKey?: string }> {
  const profile = profiles?.find((profile) => profile.id === voiceId);
  if (!profile && !settings) return {};
  const payload = { ...(profile ? { profile } : {}), ...(settings ? { settings } : {}) };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return {
    ...payload,
    settingsKey: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
      "",
    ),
  };
}
