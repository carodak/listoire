export function inkBounds(data: Uint8ClampedArray, width: number, height: number) {
  const corners = [0, (width - 1) * 4, width * (height - 1) * 4, (width * height - 1) * 4];
  const background = [0, 1, 2].map(
    (channel) => corners.reduce((sum, index) => sum + data[index + channel]!, 0) / 4,
  );
  const pale = background.every((channel) => channel > 220);
  let left = width,
    top = height,
    right = 0,
    bottom = 0,
    count = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      if (
        data[at + 3]! < 24 ||
        (pale && background.every((channel, index) => Math.abs(channel - data[at + index]!) < 35))
      )
        continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      count++;
    }
  if (count < width * height * 0.01) return null;
  const padding = Math.ceil(Math.max(right - left, bottom - top) * 0.06);
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width, right + padding + 1);
  bottom = Math.min(height, bottom + padding + 1);
  return {
    x: left / width,
    y: top / height,
    width: (right - left) / width,
    height: (bottom - top) / height,
  };
}
