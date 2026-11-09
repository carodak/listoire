import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { typographyOptions } from "../../contracts/typography.ts";
import type { Typography } from "../../contracts/typography.ts";
import { TypographicText } from "../presentation/TypographicText.tsx";
import { SelectField } from "./Fields.tsx";
import "./text-toolbar.css";

export function TextToolbar({
  selection,
  apply,
}: {
  selection: () => string;
  apply: (format: Typography) => string | undefined;
}) {
  const [format, setFormat] = useState<Typography>({ style: "default" });
  const [hover, setHover] = useState<Typography["style"]>();
  const [sample, setSample] = useState("A whisper… then BOOM!");
  const [message, setMessage] = useState(
    "Select words in the script, preview a style, then apply.",
  );
  const preview = hover ? { style: hover } : format;
  const capture = () => {
    const text = selection();
    if (text.trim()) setSample(text);
  };
  return (
    <div className="text-toolbar" onPointerEnter={capture} onFocusCapture={capture}>
      <StyleMenu format={format} setFormat={setFormat} setHover={setHover} />
      {(Object.keys(typographyOptions) as (keyof Typography)[])
        .filter((key) => key !== "style")
        .map((key) => (
          <SelectField
            key={key}
            label={`Text ${key}`}
            value={format[key] ?? "preset"}
            options={["preset", ...typographyOptions[key]]}
            labels={{ preset: "From style" }}
            onChange={(value) =>
              setFormat((before) => {
                const next = { ...before };
                delete next[key];
                return value === "preset" ? next : { ...next, [key]: value };
              })
            }
          />
        ))}
      <button
        type="button"
        className="primary"
        onClick={() => {
          const error = apply(format);
          setMessage(error ?? "Typography applied. Preview the story to see it in context.");
        }}
      >
        Apply to selection
      </button>
      <div className="text-style-preview" aria-label="Typography preview">
        <TypographicText
          text={sample}
          typography={[{ start: 0, end: sample.length, format: preview }]}
        />
      </div>
      <p role="status">{message}</p>
    </div>
  );
}

function StyleMenu({
  format,
  setFormat,
  setHover,
}: {
  format: Typography;
  setFormat: (format: Typography) => void;
  setHover: Dispatch<SetStateAction<Typography["style"]>>;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details
      className="text-style-menu"
      ref={menu}
      onToggle={() => {
        if (!menu.current?.open) setHover(undefined);
      }}
    >
      <summary>Style: {format.style ?? "default"}</summary>
      <div role="group" aria-label="Text styles" onPointerLeave={() => setHover(undefined)}>
        {typographyOptions.style.map((style) => (
          <button
            key={style}
            type="button"
            aria-pressed={format.style === style}
            onPointerEnter={() => setHover(style)}
            onFocus={() => setHover(style)}
            onClick={() => {
              setFormat({ style });
              setHover(undefined);
              menu.current?.removeAttribute("open");
            }}
          >
            <TypographicText
              text={style}
              typography={[{ start: 0, end: style.length, format: { style } }]}
            />
          </button>
        ))}
      </div>
    </details>
  );
}
