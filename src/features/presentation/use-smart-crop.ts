import { useEffect, useState } from "react";
import { inkBounds } from "./smart-crop.ts";

export function useSmartCrop(source: string | undefined, enabled: boolean) {
  const [crop, setCrop] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!enabled || !source) return;
    let active = true,
      url: string | undefined;
    const image = new Image();
    image.onload = () => {
      const sample = document.createElement("canvas"),
        context = sample.getContext("2d", { willReadFrequently: true });
      if (!context || !active) return;
      const ratio = 256 / Math.max(image.naturalWidth, image.naturalHeight);
      sample.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      sample.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      try {
        context.drawImage(image, 0, 0, sample.width, sample.height);
        const bounds = inkBounds(
          context.getImageData(0, 0, sample.width, sample.height).data,
          sample.width,
          sample.height,
        );
        if (!bounds || bounds.width * bounds.height > 0.98) return;
        const width = image.naturalWidth * bounds.width,
          height = image.naturalHeight * bounds.height;
        const output = document.createElement("canvas"),
          draw = output.getContext("2d");
        const scale = Math.min(1, 2048 / Math.max(width, height));
        output.width = Math.max(1, Math.round(width * scale));
        output.height = Math.max(1, Math.round(height * scale));
        draw?.drawImage(
          image,
          image.naturalWidth * bounds.x,
          image.naturalHeight * bounds.y,
          width,
          height,
          0,
          0,
          output.width,
          output.height,
        );
        output.toBlob(
          (blob) => {
            if (!blob || !active) return;
            url = URL.createObjectURL(blob);
            setCrop({ source, url });
          },
          "image/webp",
          0.95,
        );
      } catch {
        /* Keep the original when a browser cannot inspect an image. */
      }
    };
    image.src = source;
    return () => {
      active = false;
      image.onload = null;
      image.src = "";
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, enabled]);
  return enabled && crop && crop.source === source ? crop.url : source;
}
