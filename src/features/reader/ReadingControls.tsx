import { useSyncExternalStore } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useTranslation } from "react-i18next";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import { PaperPalette } from "../presentation/PaperPalette.tsx";

interface PreferencesProps {
  preferences: ReadingPreferences;
  onChange: (preferences: ReadingPreferences) => void;
}
interface Props extends PreferencesProps {
  presentation: PresentationSession;
  voices: { id: string; label: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function ReadingControls({
  preferences,
  onChange,
  presentation,
  voices,
  open,
  onOpenChange,
}: Props) {
  const { t } = useTranslation();
  const media = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  return (
    <aside className="reading-controls">
      <ReadingTransport
        narration={preferences.narration ?? false}
        media={media}
        presentation={presentation}
      />
      <button
        className="transport-button"
        aria-expanded={open}
        aria-controls="reading-preferences-panel"
        onClick={() => onOpenChange(!open)}
      >
        {t("readingPreferences")}
      </button>
      {open && (
        <aside
          id="reading-preferences-panel"
          className="reader-sidebar reading-sidebar"
          aria-label={t("readingPreferences")}
          onKeyDown={(event) => {
            if (event.key === "Escape") onOpenChange(false);
          }}
        >
          <header>
            <h2>{t("readingPreferences")}</h2>
            <button onClick={() => onOpenChange(false)} aria-label={t("close")}>
              ?
            </button>
          </header>
          <div className="reading-popover">
            <PaperPalette
              color={preferences.backgroundColor}
              onChange={(backgroundColor) => onChange({ ...preferences, backgroundColor })}
            />
            <BookTypography preferences={preferences} onChange={onChange} />
            <BookSound
              preferences={preferences}
              onChange={onChange}
              voices={voices}
              unavailable={media.voice === "unavailable"}
            />
            <AudioVolumes preferences={preferences} onChange={onChange} />
          </div>
        </aside>
      )}
    </aside>
  );
}
interface ReadingTransportProps {
  narration: boolean;
  media: ReturnType<PresentationSession["getSnapshot"]>;
  presentation: PresentationSession;
}

function ReadingTransport({ media, presentation, narration }: ReadingTransportProps) {
  const { t } = useTranslation();
  return (
    <div className="reading-transport">
      {!media.revealAll && !media.textComplete && (
        <button className="transport-button" onClick={presentation.revealRemaining}>
          {t("revealAll")}
        </button>
      )}
      <button
        className="transport-button"
        onClick={media.paused ? presentation.resume : presentation.pause}
      >
        {t(media.paused ? "resume" : "pause")}
      </button>
      {narration && (
        <button className="transport-button" onClick={presentation.replayNarration}>
          {t("replayVoice")}
        </button>
      )}
      {media.blocking && (
        <button className="transport-button" onClick={presentation.skipCinematic}>
          {t("skipCinematic")}
        </button>
      )}
    </div>
  );
}
const typography = [
  ["fontSize", ["small", "medium", "large"]],
  ["fontFamily", ["serif", "sans"]],
  ["lineHeight", ["comfortable", "spacious"]],
  ["reveal", ["progressive", "instant"]],
] as const;
function BookTypography({ preferences, onChange }: PreferencesProps) {
  const { t } = useTranslation();
  return typography.map(([field, options]) => (
    <label key={field}>
      {t(field === "reveal" ? "textReveal" : field)}
      <select
        aria-label={t(field === "reveal" ? "textReveal" : field)}
        value={preferences[field]}
        onChange={(event) => {
          const value = options.find((value) => value === event.target.value);
          if (value) onChange({ ...preferences, [field]: value });
        }}
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {t(value)}
          </option>
        ))}
      </select>
    </label>
  ));
}
function BookSound({
  preferences,
  onChange,
  voices,
  unavailable,
}: PreferencesProps & { voices: Props["voices"]; unavailable: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      {(["sound", "pageTurn", "narration"] as const).map((field) => (
        <label key={field}>
          <input
            type="checkbox"
            checked={preferences[field] ?? false}
            onChange={(event) => onChange({ ...preferences, [field]: event.target.checked })}
          />
          {t({ sound: "storySound", pageTurn: "pageTurn", narration: "readAloud" }[field])}
        </label>
      ))}
      {preferences.narration && (
        <NarrationPreferences
          preferences={preferences}
          onChange={onChange}
          voices={voices}
          unavailable={unavailable}
        />
      )}
    </>
  );
}
function AudioVolumes({ preferences, onChange }: PreferencesProps) {
  const { t } = useTranslation();
  const volumes = { sfx: 0.65, ambience: 0.3, music: 0.3, narration: 0.8, ...preferences.volumes };
  return (
    <>
      {" "}
      {(["sfx", "ambience", "music", "narration"] as const).map((channel) => (
        <label key={channel}>
          {t(`audioChannels.${channel}`)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volumes[channel]}
            aria-label={t(`audioChannels.${channel}`)}
            onChange={(event) =>
              onChange({
                ...preferences,
                volumes: {
                  ...volumes,
                  [channel]: Number(event.target.value),
                },
              })
            }
          />
        </label>
      ))}
    </>
  );
}
interface NarrationPreferencesProps {
  preferences: ReadingPreferences;
  onChange: (preferences: ReadingPreferences) => void;
  voices: { id: string; label: string }[];
  unavailable: boolean;
}

function NarrationPreferences({
  preferences,
  onChange,
  voices,
  unavailable,
}: NarrationPreferencesProps) {
  const { t } = useTranslation();
  const selectedVoice = voices.find((voice) => voice.id === preferences.narratorVoice) ?? voices[0];
  return (
    <>
      <label>
        {t("narratorVoice")}
        <select
          aria-label={t("narratorVoice")}
          title={t("voiceNextSegment")}
          value={selectedVoice?.id ?? ""}
          onChange={(event) => onChange({ ...preferences, narratorVoice: event.target.value })}
        >
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("deviceVoice")}
        <input
          type="checkbox"
          checked={preferences.deviceVoice ?? true}
          onChange={(event) => onChange({ ...preferences, deviceVoice: event.target.checked })}
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
      {unavailable && <p role="status">{t("voiceUnavailable")}</p>}
    </>
  );
}
