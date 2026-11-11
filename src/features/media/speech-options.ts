import type { VoiceProfile, SpeechSettings } from "../../contracts/speech.ts";
import { sha256 } from "../../contracts/digest.ts";
export async function speechOptions(
  voiceId: string,
  profiles?: VoiceProfile[],
  settings?: SpeechSettings,
): Promise<{ profile?: VoiceProfile; settings?: SpeechSettings; settingsKey?: string }> {
  const profile = profiles?.find((profile) => profile.id === voiceId);
  if (!profile && !settings) return {};
  const payload = { ...(profile ? { profile } : {}), ...(settings ? { settings } : {}) };
  return {
    ...payload,
    settingsKey: await sha256(new TextEncoder().encode(JSON.stringify(payload))),
  };
}
