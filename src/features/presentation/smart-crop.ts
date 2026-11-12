import { useEffect, useState } from "react";

export function useSmartCrop(source: string | undefined, enabled: boolean) {
  const [crop, setCrop] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!enabled || !source) return;
    let active = true,
      url: string | undefined;
    const original = source;
    const image = new Image();
    image.src = original;
    async function load() {
      let result = original;
      try {
        await image.decode();
        if (!active) return;
        const blob = await cropImage(image);
        if (!active) return;
        if (blob) {
          url = URL.createObjectURL(blob);
          result = url;
          const decoded = new Image();
          decoded.src = url;
          await decoded.decode().catch(() => {});
        }
      } catch {
        /* Unreadable or cross-origin images keep their original frame. */
      }
      if (active) setCrop({ source: original, url: result });
    }
    void load();
    return () => {
      active = false;
      image.src = "";
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, enabled]);
  return enabled ? (crop && crop.source === source ? crop.url : undefined) : source;
}

function cropImage(image: HTMLImageElement): Promise<Blob | null> | null {
  const sample = document.createElement("canvas");
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const ratio = 256 / Math.max(image.naturalWidth, image.naturalHeight);
  sample.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  sample.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const bounds = inkBounds(
    context.getImageData(0, 0, sample.width, sample.height).data,
    sample.width,
    sample.height,
  );
  const crop = cropOutput(image.naturalWidth, image.naturalHeight, bounds);
  if (!crop) return null;
  const output = document.createElement("canvas");
  const draw = output.getContext("2d");
  if (!draw) return null;
  output.width = crop.width;
  output.height = crop.height;
  draw.drawImage(image, ...crop.source, 0, 0, crop.width, crop.height);
  return new Promise((resolve) => output.toBlob(resolve, "image/webp", 0.95));
}

/** The cropped picture: its source rectangle and size (at most 2048 px); null to keep it whole. */
export function cropOutput(width: number, height: number, bounds: ReturnType<typeof inkBounds>) {
  if (!bounds || bounds.width * bounds.height > 0.98) return null;
  const source = [
    width * bounds.x,
    height * bounds.y,
    width * bounds.width,
    height * bounds.height,
  ] as const;
  const scale = Math.min(1, 2048 / Math.max(source[2], source[3]));
  return {
    source,
    width: Math.max(1, Math.round(source[2] * scale)),
    height: Math.max(1, Math.round(source[3] * scale)),
  };
}

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
