import { useEffect, useState } from "react";
import type { MediaAsset } from "../../contracts/presentation.ts";

export function useAssetSource(
  asset: MediaAsset | undefined,
  resolve: (asset: MediaAsset) => Promise<{ url: string; dispose: () => void }>,
) {
  const [resource, setResource] = useState<{ id: string; url: string | null }>({ id: "", url: "" });
  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    let image: HTMLImageElement | undefined;
    void resolve(asset)
      .then(async (resource) => {
        if (cancelled) {
          resource.dispose();
          return;
        }
        dispose = resource.dispose;
        if (asset.type === "image") {
          image = new Image();
          image.src = resource.url;
          await image.decode().catch(() => {});
        }
        if (!cancelled) setResource({ id: asset.id, url: resource.url });
      })
      .catch(() => {
        if (!cancelled) setResource({ id: asset.id, url: null });
      });
    return () => {
      cancelled = true;
      if (image) image.src = "";
      dispose?.();
    };
  }, [asset, resolve]);
  return resource.id === asset?.id ? resource.url : "";
}
