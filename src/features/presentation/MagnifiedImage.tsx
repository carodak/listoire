import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cameraTransform, imagePoint } from "./camera.ts";

export function MagnifiedImage({
  src,
  alt,
  zoom = 1,
  instructions,
  children,
}: {
  src: string;
  alt: string;
  zoom?: number;
  instructions: string;
  children?: ReactNode;
}) {
  const image = useRef<HTMLImageElement>(null);
  const id = useId();
  const [point, setPoint] = useState({ x: 0.5, y: 0.5 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(2);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const measure = () => {
      if (image.current) setSize({ width: image.current.clientWidth, height: image.current.clientHeight });
    };
    const observer = new ResizeObserver(measure);
    if (image.current) observer.observe(image.current);
    measure();
    return () => observer.disconnect();
  }, []);
  const diameter = Math.min(160, size.width * 0.65, size.height * 0.65);
  const radius = diameter / 2;
  function locate(event: React.PointerEvent<HTMLDivElement>) {
    if (image.current)
      setPoint(imagePoint(event.clientX, event.clientY, image.current.getBoundingClientRect()));
  }
  return (
    <div
      className="magnified-image"
      role="group"
      tabIndex={0}
      aria-label={alt}
      aria-describedby={id}
      style={{ touchAction: "none", transform: cameraTransform(zoom) }}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onPointerMove={locate}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        {
          setActive(true);
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          locate(event);
        }
      }}
      onKeyDown={(event) => {
        const delta: Record<string, [number, number]> = {
          ArrowLeft: [-0.03, 0],
          ArrowRight: [0.03, 0],
          ArrowUp: [0, -0.03],
          ArrowDown: [0, 0.03],
        };
        if (delta[event.key]) {
          event.preventDefault();
          const [x, y] = delta[event.key]!;
          setPoint((point) => ({
            x: Math.max(0, Math.min(1, point.x + x)),
            y: Math.max(0, Math.min(1, point.y + y)),
          }));
        }
        if (event.key === "Home") {
          event.preventDefault();
          setPoint({ x: 0.5, y: 0.5 });
        }
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          setScale(Math.min(4, scale + 0.5));
        }
        if (event.key === "-") {
          event.preventDefault();
          setScale(Math.max(1.5, scale - 0.5));
        }
      }}
    >
      <img ref={image} src={src} alt={alt} />
      <span id={id} className="sr-only">
        {instructions}
      </span>
      {children}
      {active && diameter > 0 && (
        <div
          className="magnifier-lens"
          aria-hidden="true"
          data-x={point.x.toFixed(3)}
          data-y={point.y.toFixed(3)}
          style={{
            width: diameter,
            height: diameter,
            left: Math.max(0, Math.min(size.width - diameter, point.x * size.width - radius)),
            top: Math.max(0, Math.min(size.height - diameter, point.y * size.height - radius)),
          }}
        >
          <img
            src={src}
            alt=""
            style={{
              width: size.width,
              height: size.height,
              transformOrigin: "0 0",
              transform: cameraTransform(
                scale,
                radius - point.x * size.width * scale,
                radius - point.y * size.height * scale,
              ),
            }}
          />
        </div>
      )}
    </div>
  );
}
