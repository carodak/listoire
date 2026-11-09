import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface PaperPaletteProps {
  color?: string;
  onChange: (color: string) => void;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Sample a rendered image pixel when possible, otherwise the visible element background. */
function samplePageColor(target: Element, x: number, y: number): string | null {
  const img = target instanceof HTMLImageElement ? target : target.closest("img");
  if (img instanceof HTMLImageElement && img.complete && img.naturalWidth && img.naturalHeight) {
    const sampled = sampleImageColor(img, x, y);
    if (sampled) return sampled;
  }
  for (let node: Element | null = target; node; node = node.parentElement) {
    const value = getComputedStyle(node).backgroundColor;
    const match =
      /^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(value);
    if (match && Number(match[4] ?? 1) > 0.98)
      return rgbToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return null;
}

/** Colour-wheel eyedropper icon, deliberately close to a conventional sample tool. */
function SampleIcon() {
  const colors = [
    "#f4dc00",
    "#ffa600",
    "#fa5c11",
    "#e3203b",
    "#d30083",
    "#643e9d",
    "#3977b9",
    "#009c9b",
    "#18b256",
    "#a2d62a",
  ];
  const polar = (angle: number, radius: number) => {
    const radians = (angle * Math.PI) / 180;
    return `${(24 + radius * Math.cos(radians)).toFixed(2)} ${(24 + radius * Math.sin(radians)).toFixed(2)}`;
  };
  return (
    <svg viewBox="0 0 48 48" width="29" height="29" fill="none" aria-hidden="true">
      {colors.map((color, index) => {
        const start = index * 36 - 90,
          end = start + 35;
        const path = `M${polar(start, 20)} A20 20 0 0 1 ${polar(end, 20)} L${polar(end, 13)} A13 13 0 0 0 ${polar(start, 13)} Z`;
        return <path key={color} d={path} fill={color} />;
      })}
      <path
        d="m16 33 6-4 12-15 4 4-14 14-6 4z"
        fill="#1d1d1d"
        stroke="#1d1d1d"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="m17.5 33 4-3.3 8.5-10 3.2 3.2-10 8.3z"
        fill="#66b3ef"
        stroke="#171717"
        strokeWidth=".9"
      />
      <path d="m33 15 3.2-3.2a3.5 3.5 0 0 1 5 5L38 20z" fill="#101010" />
    </svg>
  );
}

export function PaperPalette({ color = "#f5ead7", onChange }: PaperPaletteProps) {
  const { t } = useTranslation();
  const [sampling, setSampling] = useState(false);
  const [sampleError, setSampleError] = useState(false);
  useEffect(() => {
    if (!sampling) return;
    document.documentElement.classList.add("sampling-paper-color");
    const pick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      // One deliberate click inside the book or its images, never a toolbar control.
      if (
        !target.closest(".reader") ||
        target.closest(".reader-toolbar, .reader-sidebar, .reader-modal")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const sampled = samplePageColor(target, event.clientX, event.clientY);
      setSampling(false);
      setSampleError(!sampled);
      if (sampled) onChange(sampled);
    };
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSampling(false);
      }
    };
    document.addEventListener("click", pick, true);
    document.addEventListener("keydown", cancel, true);
    return () => {
      document.removeEventListener("click", pick, true);
      document.removeEventListener("keydown", cancel, true);
      document.documentElement.classList.remove("sampling-paper-color");
    };
  }, [sampling, onChange]);
  return (
    <fieldset className="paper-palette">
      <legend>{t("paperColor")}</legend>
      <div className="paper-palette-options">
        {["#fff7ef", "#f5ead7", "#f3e5cf", "#faf8f2", "#e4e5e1", "#222b31", "#080b0d"].map(
          (value) => (
            <button
              key={value}
              type="button"
              aria-label={`${t("paperColor")} ${value}`}
              aria-pressed={color.toLowerCase() === value}
              title={value}
              style={{ background: value }}
              onClick={() => onChange(value)}
            />
          ),
        )}
        <label className="paper-palette-custom" title={t("customPaperColor")}>
          ✎
          <input
            aria-label={t("customPaperColor")}
            type="color"
            value={color}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <button
          className="paper-palette-sample"
          type="button"
          aria-pressed={sampling}
          title={t("samplePaperColor")}
          aria-label={t("samplePaperColor")}
          onClick={() => {
            setSampleError(false);
            setSampling((value) => !value);
          }}
        >
          <SampleIcon />
        </button>
      </div>
      {sampling && <small role="status">{t("samplePaperHint")}</small>}
      {sampleError && <small role="status">{t("samplePaperUnavailable")}</small>}
    </fieldset>
  );
}

function sampleImageColor(img: HTMLImageElement, x: number, y: number): string | null {
  try {
    const rect = img.getBoundingClientRect();
    const style = getComputedStyle(img);
    const scale =
      style.objectFit === "contain"
        ? Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
        : style.objectFit === "cover"
          ? Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
          : 0;
    const drawnWidth = scale ? img.naturalWidth * scale : rect.width;
    const drawnHeight = scale ? img.naturalHeight * scale : rect.height;
    const px = ((x - rect.left - (rect.width - drawnWidth) / 2) * img.naturalWidth) / drawnWidth;
    const py = ((y - rect.top - (rect.height - drawnHeight) / 2) * img.naturalHeight) / drawnHeight;
    if (px >= 0 && py >= 0 && px < img.naturalWidth && py < img.naturalHeight) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.drawImage(img, Math.floor(px), Math.floor(py), 1, 1, 0, 0, 1, 1);
        const pixel = context.getImageData(0, 0, 1, 1).data;
        if (pixel[3]! > 245) return rgbToHex(pixel[0]!, pixel[1]!, pixel[2]!);
      }
    }
  } catch {
    /* Cross-origin artwork cannot be read; use the paper background. */
  }

  return null;
}
