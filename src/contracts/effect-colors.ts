import type { NarrativeEvent } from "./narrative-events.ts";
export function validateEffectColors(
  event: NarrativeEvent,
  palette: string[],
  invalid: (message: string) => void,
) {
  if (event.action.kind !== "effect") return;
  const effect = event.action.effect;
  const props = "props" in effect ? effect.props : effect;
  const colors = Object.entries(props)
    .filter(([key]) => key.toLowerCase().includes("color"))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));
  const normalize = (color: string) =>
    color.length === 4
      ? "#" +
        color
          .slice(1)
          .split("")
          .map((letter) => letter + letter)
          .join("")
      : color.toLowerCase();
  for (const color of colors)
    if (typeof color === "string" && !palette.map(normalize).includes(normalize(color)))
      invalid("Effect color is outside the story palette");
  const imageEffects = [
    "react-bits.noise",
    "react-bits.ripple-distortion",
    "react-bits.grid-distortion",
  ];
  if (effect.id.startsWith("react-bits.") && !imageEffects.includes(effect.id) && !colors.length)
    invalid("Colored effects need an explicit story palette");
}
