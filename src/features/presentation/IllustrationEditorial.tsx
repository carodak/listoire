import type { Scene3D } from "../../contracts/scene3d.ts";

interface IllustrationEditorialProps {
  edges?: Scene3D["pageEdges"];
  enabled?: boolean;
  mode?: string;
  layout?: string;
}

export function IllustrationEditorial({
  edges = "none",
  enabled = false,
  mode,
  layout,
}: IllustrationEditorialProps) {
  if (!enabled || mode === "none" || layout === "fullscreen") return null;
  return (
    <div className="illustration-editorial" aria-hidden="true" data-edges={edges}>
      <div className="editorial-atmosphere" />
      {edges !== "none" && (
        <svg className="editorial-foreground" viewBox="0 0 1000 700" preserveAspectRatio="none">
          {edges === "leaves" ? (
            <>
              <path
                d="M-20 730 Q70 590 48 390 M1020 730 Q890 570 950 345"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
              />
              {Array.from({ length: 8 }, (_, i) => (
                <g
                  key={i}
                  transform={`translate(${i % 2 ? 950 - i * 3 : 35 + i * 3},${650 - i * 32}) rotate(${i % 2 ? -125 : 30})`}
                >
                  <path d="M0 0 Q-45-8-62-52 Q-12-50 0 0 M0 0 Q18-45 54-57 Q55-16 0 0" />
                </g>
              ))}
            </>
          ) : (
            <>
              {Array.from({ length: 28 }, (_, i) => (
                <path
                  key={i}
                  d={`M${i * 39 - 30} 720 Q${i * 39 - 50} ${610 - (i % 5) * 14} ${i * 39 - 12} ${565 + (i % 4) * 19} Q${i * 39 - 15} 650 ${i * 39 - 6} 720Z`}
                />
              ))}
            </>
          )}
        </svg>
      )}
    </div>
  );
}
