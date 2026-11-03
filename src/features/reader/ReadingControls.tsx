import { useSyncExternalStore } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useTranslation } from "react-i18next";
import type { ReadingPreferences } from "../../contracts/presentation.ts";

export function ReadingControls({
  preferences,
  onChange,
  presentation,
}: {
  preferences: ReadingPreferences;
  onChange: (preferences: ReadingPreferences) => void;
  presentation: PresentationSession;
}) {
  const { t } = useTranslation();
  const media = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  return (
    <aside className="reading-controls">
      <button
        className="transport-button"
        onClick={media.paused ? presentation.resume : presentation.pause}
      >
        {t(media.paused ? "resume" : "pause")}
      </button>
      {preferences.narration && (
        <button className="transport-button" onClick={presentation.replayNarration}>
          {t("replayVoice")}
        </button>
      )}
      {media.blocking && (
        <button className="transport-button" onClick={presentation.skipCinematic}>
          {t("skipCinematic")}
        </button>
      )}
      <details>
        <summary>{t("readingPreferences")}</summary>
        <div className="reading-popover">
          <label>
            {t("fontSize")}
            <select
              aria-label={t("fontSize")}
              value={preferences.fontSize}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  fontSize: event.target.value as ReadingPreferences["fontSize"],
                })
              }
            >
              {["small", "medium", "large"].map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("fontFamily")}
            <select
              aria-label={t("fontFamily")}
              value={preferences.fontFamily}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  fontFamily: event.target.value as ReadingPreferences["fontFamily"],
                })
              }
            >
              <option value="serif">{t("serif")}</option>
              <option value="sans">{t("sans")}</option>
            </select>
          </label>
          <label>
            {t("lineHeight")}
            <select
              aria-label={t("lineHeight")}
              value={preferences.lineHeight}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  lineHeight: event.target.value as ReadingPreferences["lineHeight"],
                })
              }
            >
              <option value="comfortable">{t("comfortable")}</option>
              <option value="spacious">{t("spacious")}</option>
            </select>
          </label>
          <label>
            {t("textReveal")}
            <select
              aria-label={t("textReveal")}
              value={preferences.reveal}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  reveal: event.target.value as ReadingPreferences["reveal"],
                })
              }
            >
              <option value="progressive">{t("progressive")}</option>
              <option value="instant">{t("instant")}</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.sound}
              onChange={(event) => onChange({ ...preferences, sound: event.target.checked })}
            />
            {t("storySound")}
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.narration ?? false}
              onChange={(event) => onChange({ ...preferences, narration: event.target.checked })}
            />
            {t("readAloud")}
          </label>
          {preferences.narration && (
            <>
              <label>
                {t("deviceVoice")}
                <input
                  type="checkbox"
                  checked={preferences.deviceVoice ?? true}
                  onChange={(event) =>
                    onChange({ ...preferences, deviceVoice: event.target.checked })
                  }
                />
              </label>
              <label>
                {t("voiceRate")}
                <input
                  aria-label={t("voiceRate")}
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={preferences.narrationRate ?? 1}
                  onChange={(event) =>
                    onChange({ ...preferences, narrationRate: Number(event.target.value) })
                  }
                />
              </label>
              {media.voice === "unavailable" && <p role="status">{t("voiceUnavailable")}</p>}
            </>
          )}
          {(["sfx", "ambience", "music", "narration"] as const).map((channel) => (
            <label key={channel}>
              {t(`audioChannels.${channel}`)}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={
                  preferences.volumes?.[channel] ??
                  (channel === "sfx" ? 0.65 : channel === "narration" ? 0.8 : 0.3)
                }
                aria-label={t(`audioChannels.${channel}`)}
                onChange={(event) =>
                  onChange({
                    ...preferences,
                    volumes: {
                      sfx: 0.65,
                      ambience: 0.3,
                      music: 0.3,
                      narration: 0.8,
                      ...preferences.volumes,
                      [channel]: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </details>
    </aside>
  );
}
