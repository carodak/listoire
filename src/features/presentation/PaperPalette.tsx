import { useTranslation } from "react-i18next";

interface PaperPaletteProps {
  color?: string;
  onChange: (color: string) => void;
}

export function PaperPalette({ color = "#080b0d", onChange }: PaperPaletteProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="paper-palette">
      <legend>{t("paperColor")}</legend>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {["#f3e5cf", "#faf8f2", "#e4e5e1", "#080b0d"].map((value) => (
          <button
            type="button"
            key={value}
            aria-label={`${t("paperColor")} ${value}`}
            aria-pressed={color.toLowerCase() === value}
            title={value}
            style={{
              background: value,
              width: 32,
              height: 32,
              border: color.toLowerCase() === value ? "2px solid #ab7f40" : "1px solid #888",
              padding: 0,
            }}
            onClick={() => onChange(value)}
          />
        ))}
        <input
          aria-label={t("customPaperColor")}
          title={t("customPaperColor")}
          type="color"
          value={color}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </fieldset>
  );
}
