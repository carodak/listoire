import { useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  effectiveTypography,
  paragraphAlignments,
  typographyOptions,
  typographySettings,
} from "../../contracts/typography.ts";
import type { ParagraphAlign, Typography } from "../../contracts/typography.ts";
import { TypographicText } from "../presentation/TypographicText.tsx";
import type { EditorActions, SelectionFormat, TextToggle } from "./editor-actions.ts";
import "./text-toolbar.css";

type Setting = Exclude<keyof Typography, "style" | TextToggle>;
type Actions = Pick<
  EditorActions,
  | "selectionFormat"
  | "watchSelection"
  | "report"
  | "textStatus"
  | "applyPreset"
  | "patchText"
  | "toggleText"
  | "clearText"
  | "alignText"
>;
const toggles = ["bold", "italic", "underline", "strike"] as const;
const keys: Record<TextToggle, string> = {
  bold: "B",
  italic: "I",
  underline: "U",
  strike: "Shift+X",
};
const modifier = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "") ? "⌘" : "Ctrl+";

/** One label for a setting's value; a toggle that is on reads as its own name ("Bold"). */
function valueLabel(t: TFunction, key: Exclude<keyof Typography, "style">, value: string) {
  return value === "on" ? t(`editor.text.${key}`) : t(`editor.text.values.${key}.${value}`);
}
function settingsText(t: TFunction, format: Typography) {
  return Object.entries(format)
    .filter(([key]) => key !== "style")
    .map(([key, value]) => valueLabel(t, key as Setting, value))
    .join(" · ");
}

/** Formats the words selected in the Ink script at once; each control changes only itself. */
export function TextToolbar({ actions }: { actions: Actions }) {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(actions.watchSelection, () =>
    JSON.stringify({ ...actions.selectionFormat(), status: actions.textStatus() }),
  );
  const { format, align, status } = JSON.parse(snapshot) as SelectionFormat & { status: string };
  // A message belongs to the selection it was made for; moving the selection hides it.
  const message = status ? t(status) : "";
  const run = actions.report;
  const style = format.style ?? "default";
  const effective = effectiveTypography(format);
  const { style: _, ...changes } = format;
  const sets = settingsText(t, typographySettings({ style }));
  const summary = [
    style === "default"
      ? t("editor.text.noStyle")
      : t("editor.text.sets", { style: t(`editor.text.values.style.${style}`), settings: sets }),
    Object.keys(changes).length
      ? t("editor.text.changes", { settings: settingsText(t, changes) })
      : t("editor.text.noChanges"),
  ].join(" ");
  const select = (setting: Setting) => (
    <SettingSelect
      key={setting}
      setting={setting}
      format={format}
      onChange={(value) => run(actions.patchText({ [setting]: value }))}
    />
  );
  return (
    <div className="text-toolbar" role="group" aria-label={t("editor.text.toolbar")}>
      <div className="text-toolbar-row">
        <StylePicker style={style} onPick={(next) => run(actions.applyPreset(next))} />
        <Separator />
        {(["font", "size", "color"] as const).map(select)}
        <Separator />
        {toggles.map((key) => (
          <IconButton
            key={key}
            label={t(`editor.text.${key}`)}
            shortcut={keys[key]}
            pressed={effective[key] === "on"}
            onClick={() => run(actions.toggleText(key))}
          >
            <span className={`text-glyph-${key}`}>{t(`editor.text.glyph.${key}`)}</span>
          </IconButton>
        ))}
        <Separator />
        <div className="text-toolbar-group" role="group" aria-label={t("editor.text.alignGroup")}>
          {paragraphAlignments.map((value) => (
            <IconButton
              key={value}
              label={t(`editor.text.align.${value}`)}
              pressed={align === value}
              onClick={() => run(actions.alignText(value))}
            >
              <AlignIcon align={value} />
            </IconButton>
          ))}
        </div>
        <Separator />
        <IconButton
          label={t("editor.text.clear")}
          shortcut="\"
          onClick={() => run(actions.clearText())}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M6 5h12M12 5l-3 14M4 20L20 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </IconButton>
        <MoreSettings
          changed={(["direction", "spacing", "shape"] as const).some((key) => key in format)}
        >
          {(["direction", "spacing", "shape"] as const).map(select)}
        </MoreSettings>
      </div>
      {message ? (
        <p role="status" className="text-status">
          {message}
        </p>
      ) : (
        <p className="text-summary">{summary}</p>
      )}
    </div>
  );
}

function Separator() {
  return <span className="text-separator" aria-hidden="true" />;
}

function IconButton({
  label,
  shortcut,
  pressed,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="text-icon"
      aria-label={label}
      aria-pressed={pressed}
      title={shortcut ? `${label} (${modifier}${shortcut})` : label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function AlignIcon({ align }: { align: ParagraphAlign }) {
  const lines = [20, 14, 20, 12].map((width, index) => {
    const length = align === "justify" ? 16 : width - 4;
    const x = align === "center" ? 12 - length / 2 : align === "right" ? 20 - length : 4;
    return <path key={index} d={`M${x} ${6 + index * 4}h${length}`} />;
  });
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      stroke="currentColor"
      strokeWidth="2"
    >
      {lines}
    </svg>
  );
}

/** Shows the value these words really get: "Serif (from Mystery)", or the manual change. */
function SettingSelect({
  setting,
  format,
  onChange,
}: {
  setting: Setting;
  format: Typography;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const style = format.style ?? "default";
  const styleName = t(`editor.text.values.style.${style}`);
  const inherited = effectiveTypography({ style })[setting];
  // "(from Mystery)" only for what the style itself sets, not for plain-text values.
  const fromStyle = typographySettings({ style })[setting] !== undefined;
  const changed = format[setting] !== undefined;
  const name = t(`editor.text.${setting}`);
  const label = (value: string) => t(`editor.text.values.${setting}.${value}`);
  return (
    <span className={`text-setting${changed ? " changed" : ""}`}>
      <select
        aria-label={name}
        title={
          changed
            ? t("editor.text.changed", { name, style: styleName, value: label(inherited) })
            : name
        }
        value={format[setting] ?? inherited}
        onChange={(event) => onChange(event.target.value)}
      >
        {typographyOptions[setting].map((value) => (
          <option key={value} value={value}>
            {value === inherited && fromStyle
              ? t("editor.text.fromStyle", { value: label(value), style: styleName })
              : label(value)}
          </option>
        ))}
      </select>
    </span>
  );
}

function MoreSettings({ changed, children }: { changed: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <details className={`text-more${changed ? " changed" : ""}`}>
      <summary aria-label={t("editor.text.more")} title={t("editor.text.more")}>
        <span aria-hidden="true">⋯</span>
      </summary>
      <div className="text-popover">{children}</div>
    </details>
  );
}

/** A picker: the current style's name; each choice is drawn in its own style, with what it sets. */
function StylePicker({
  style,
  onPick,
}: {
  style: NonNullable<Typography["style"]>;
  onPick: (style: NonNullable<Typography["style"]>) => void;
}) {
  const { t } = useTranslation();
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details className="text-style-menu" ref={menu}>
      <summary
        title={t("editor.text.styleHint")}
        aria-label={`${t("editor.text.style")}: ${t(`editor.text.values.style.${style}`)}`}
      >
        {t(`editor.text.values.style.${style}`)}
      </summary>
      <div role="group" aria-label={t("editor.text.style")}>
        {typographyOptions.style.map((value) => {
          const name = t(`editor.text.values.style.${value}`);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={style === value}
              onClick={() => {
                menu.current?.removeAttribute("open");
                onPick(value);
              }}
            >
              <TypographicText
                text={name}
                typography={[{ start: 0, end: name.length, format: { style: value } }]}
              />
              <small>
                {settingsText(t, typographySettings({ style: value })) || t("editor.text.plain")}
              </small>
            </button>
          );
        })}
      </div>
    </details>
  );
}
