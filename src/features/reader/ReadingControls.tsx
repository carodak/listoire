import { useSyncExternalStore } from "react";
import { ReaderSidebar } from "../../shared/ReaderSidebar.tsx";
import { CloseButton } from "../../shared/CloseButton.tsx";
import type { ReactNode } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useTranslation } from "react-i18next";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import { PaperPalette } from "../presentation/PaperPalette.tsx";
import { ToolbarGlyph } from "../../shared/ToolbarGlyph.tsx";
import { useDeviceVoices } from "../presentation/use-device-voices.ts";

interface PreferencesProps {
  preferences: ReadingPreferences;
  onChange: (preferences: ReadingPreferences) => void;
}
interface Props extends PreferencesProps {
  presentation: PresentationSession;
  bundle: StoryBundle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigation?: ReactNode;
}
export function ReadingControls({
  preferences,
  onChange,
  presentation,
  bundle,
  open,
  onOpenChange,
  navigation,
}: Props) {
  const { t } = useTranslation();
  const media = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  const availableVoices = useReaderVoices(presentation, bundle);
  return (
    <aside className="reading-controls">
      <label className="reader-master-volume" title={t("masterVolume")}>
        <span aria-hidden="true">♫</span>
        <span className="sr-only">{t("masterVolume")}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={preferences.masterVolume ?? 1}
          aria-label={t("masterVolume")}
          onChange={(event) =>
            onChange({ ...preferences, masterVolume: Number(event.target.value) })
          }
        />
      </label>
      {navigation}
      <ReadingTransport
        media={media}
        presentation={presentation}
        typewriter={preferences.reveal === "progressive"}
      />
      <button
        className="transport-button"
        aria-expanded={open}
        aria-controls="reading-preferences-panel"
        aria-label={t("readingPreferences")}
        title={t("readingPreferences")}
        onClick={() => onOpenChange(!open)}
      >
        <ToolbarGlyph name="settings" />
      </button>
      {open && (
        <PreferencesPanel
          {...{ preferences, onChange }}
          defaultPaperColor={bundle.readingDefaults?.backgroundColor}
          voices={availableVoices}
          unavailable={media.voice === "unavailable"}
          onClose={() => onOpenChange(false)}
        />
      )}
    </aside>
  );
}
function useReaderVoices(presentation: PresentationSession, bundle: StoryBundle) {
  const voices = presentation.voices;
  const allowDeviceVoices = !["disabled", "human", "ai-pregenerated"].includes(
    bundle.narrationMode ?? "",
  );
  const deviceVoices = useDeviceVoices(bundle.locale, allowDeviceVoices).map((voice) => ({
    id: `device:${voice.voiceURI}`,
    label: `${voice.name} (${voice.lang})`,
  }));
  return voices.concat(
    deviceVoices.filter((voice) => !voices.some((item) => item.id === voice.id)),
  );
}
function PreferencesPanel({
  preferences,
  onChange,
  defaultPaperColor,
  voices,
  unavailable,
  onClose,
}: PreferencesProps &
  Pick<NarrationPreferencesProps, "voices" | "unavailable"> & {
    defaultPaperColor?: string;
    onClose: () => void;
  }) {
  const { t } = useTranslation();
  return (
    <ReaderSidebar
      id="reading-preferences-panel"
      className="reading-sidebar"
      label={t("readingPreferences")}
      onClose={onClose}
    >
      <header>
        <h2>{t("readingPreferences")}</h2>
        <CloseButton onClick={onClose} />
      </header>
      <div className="reading-popover">
        <PaperPalette
          color={preferences.backgroundColor ?? defaultPaperColor}
          onChange={(backgroundColor) => onChange({ ...preferences, backgroundColor })}
        />
        <BookTypography preferences={preferences} onChange={onChange} />
        <BookSound
          preferences={preferences}
          onChange={onChange}
          voices={voices}
          unavailable={unavailable}
        />
        <AudioVolumes preferences={preferences} onChange={onChange} />
      </div>
    </ReaderSidebar>
  );
}
interface ReadingTransportProps {
  media: ReturnType<PresentationSession["getSnapshot"]>;
  presentation: PresentationSession;
  typewriter: boolean;
}

function ReadingTransport({ media, presentation, typewriter }: ReadingTransportProps) {
  const { t } = useTranslation();
  return (
    <div className="reading-transport">
      {typewriter && !media.revealAll && !media.textComplete && (
        <button
          className="transport-button reader-icon-button"
          aria-label={t("revealAll")}
          title={t("revealAll")}
          onClick={presentation.revealRemaining}
        >
          <ToolbarGlyph name="reveal" />
        </button>
      )}
      <button
        className="transport-button reader-icon-button"
        aria-label={t(media.paused ? "resume" : "pause")}
        title={t(media.paused ? "resume" : "pause")}
        onClick={media.paused ? presentation.resume : presentation.pause}
      >
        <ToolbarGlyph name={media.paused ? "play" : "pause"} />
      </button>
      {media.blocking && (
        <button
          className="transport-button reader-icon-button"
          aria-label={t("skipCinematic")}
          title={t("skipCinematic")}
          onClick={presentation.skipCinematic}
        >
          <ToolbarGlyph name="skip" />
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
function BookSound({ preferences, onChange, voices, unavailable }: NarrationPreferencesProps) {
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
      <NarrationPreferences
        preferences={preferences}
        onChange={onChange}
        voices={voices}
        unavailable={unavailable}
      />
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
  const selectedVoice = voices.find((voice) => voice.id === preferences.narratorVoice);
  return (
    <>
      <label>
        {t("narratorVoice")}
        <select
          aria-label={t("narratorVoice")}
          title={t("voiceNextSegment")}
          value={selectedVoice?.id ?? ""}
          onChange={(event) =>
            onChange({
              ...preferences,
              narratorVoice: event.target.value,
              ...(event.target.value.startsWith("device:") ? { deviceVoice: true } : {}),
            })
          }
        >
          <option value="">{t("automaticVoice")}</option>
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
