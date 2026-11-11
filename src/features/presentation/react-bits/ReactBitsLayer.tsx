import { reducedMotionMedia } from "../../../contracts/reduced-motion.ts";
import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import type { ComponentType, LazyExoticComponent, ReactNode } from "react";
import type { ReactBitsEffect } from "../../../contracts/effects.ts";
import { reactBitsLoaders } from "./registry.ts";
const components = Object.fromEntries(
  Object.entries(reactBitsLoaders).map(([id, loader]) => [id, lazy(loader)]),
) as Record<ReactBitsEffect["id"], LazyExoticComponent<ComponentType<Record<string, unknown>>>>;
let webglAvailable: boolean | undefined;
function hasWebGL() {
  if (webglAvailable !== undefined) return webglAvailable;
  const context = document.createElement("canvas").getContext("webgl2");
  webglAvailable = Boolean(context);
  context?.getExtension("WEBGL_lose_context")?.loseContext();
  return webglAvailable;
}
const safety: Record<string, Record<string, unknown>> = {
  "react-bits.light-rays": { maxDevicePixelRatio: 1 },
  "react-bits.lightning": { dpr: 1, flicker: 0 },
  "react-bits.particles": { pixelRatio: 1, particleCount: 60 },
  "react-bits.dark-veil": { dpr: 1 },
  "react-bits.magic-rings": { maxDevicePixelRatio: 1 },
  "react-bits.noise": { fps: 12, flicker: 0 },
  "react-bits.ripple-distortion": { quality: "low" },
  "react-bits.aurora": { dpr: 1 },
  "react-bits.side-rays": { maxDevicePixelRatio: 1 },
  "react-bits.light-pillar": { quality: "low", resolution: 0.5 },
  "react-bits.splash-cursor": { quality: "low", contained: true },
  "react-bits.prismatic-burst": { quality: "low", dpr: 1 },
  "react-bits.ghost-fibers": { threads: 30 },
};

class EffectBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface ReactBitsLayerProps {
  effect: ReactBitsEffect;
  imageUrl?: string;
}

export function ReactBitsLayer({ effect, imageUrl }: ReactBitsLayerProps) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [permitted, setPermitted] = useState(false);
  const Component = components[effect.id];
  useEffect(() => {
    const motion = matchMedia(reducedMotionMedia);
    const check = () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection;
      const constrained =
        innerWidth < 700 || navigator.hardwareConcurrency < 4 || connection?.saveData;
      const gpu = effect.id === "react-bits.noise" || (!constrained && hasWebGL());
      setPermitted(!motion.matches && !document.hidden && gpu);
    };
    check();
    motion.addEventListener("change", check);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("resize", check);
    const observer = new IntersectionObserver((entries) =>
      setVisible(Boolean(entries[0]?.isIntersecting)),
    );
    if (root.current) observer.observe(root.current);
    const contextLost = () => setPermitted(false);
    root.current?.addEventListener("webglcontextlost", contextLost, true);
    const element = root.current;
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", check);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("resize", check);
      element?.removeEventListener("webglcontextlost", contextLost, true);
    };
  }, [effect.id]);
  const props = {
    ...effect.props,
    ...safety[effect.id],
    style: { width: "100%", height: "100%" },
    ...(effect.id === "react-bits.grid-distortion" ? { imageSrc: imageUrl } : {}),
    ...(effect.id === "react-bits.ripple-distortion" ? { src: imageUrl } : {}),
  };
  return (
    <div ref={root} className="react-bits-layer" aria-hidden="true" data-effect={effect.id}>
      {permitted && visible && (
        <EffectBoundary key={effect.id}>
          <Suspense fallback={null}>
            <Component {...props} />
          </Suspense>
        </EffectBoundary>
      )}
    </div>
  );
}
