export function animationOptions(target: string, images: string[]) {
  if (target === "transition") return ["fade-out"];
  if (target === "page")
    return ["fade-in", "fade-out", "screen-shake", "light-flicker", "rain-overlay", "fog-overlay"];
  if (images.includes(target))
    return [
      "fade-in",
      "fade-out",
      "slow-zoom",
      "camera-zoom",
      "camera-pan",
      "parallax",
      "react-bits.noise",
      "react-bits.ripple-distortion",
      "react-bits.grid-distortion",
    ];
  return ["fade-in", "fade-out", "screen-shake"];
}
