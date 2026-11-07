import { useEffect, useState } from "react";
import type { MediaAsset } from "../../contracts/uploaded-media.ts";

export function useAssetSource(
  asset: MediaAsset | undefined,
  resolve: (asset: MediaAsset) => Promise<{ url: string; dispose: () => void }>,
) {
  const [resource, setResource] = useState<{ id: string; url: string | null }>({ id: "", url: "" });
  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void resolve(asset)
      .then((resource) => {
        if (cancelled) resource.dispose();
        else {
          dispose = resource.dispose;
          setResource({ id: asset.id, url: resource.url });
        }
      })
      .catch(() => {
        if (!cancelled) setResource({ id: asset.id, url: null });
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [asset, resolve]);
  return resource.id === asset?.id ? resource.url : "";
}
