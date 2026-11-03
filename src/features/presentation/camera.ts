export function cameraTransform(scale: number, x: number | string = 0, y: number | string = 0) {
  const unit = (value: number | string) => (typeof value === "number" ? `${value}px` : value);
  return `translate(${unit(x)}, ${unit(y)}) scale(${scale})`;
}
export function imagePoint(
  clientX: number,
  clientY: number,
  bounds: { left: number; top: number; width: number; height: number },
) {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return {
    x: clamp((clientX - bounds.left) / Math.max(1, bounds.width)),
    y: clamp((clientY - bounds.top) / Math.max(1, bounds.height)),
  };
}
