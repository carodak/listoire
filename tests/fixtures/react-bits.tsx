import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactBitsEffectSchema } from "../../src/contracts/effects.ts";
import { ReactBitsLayer } from "../../src/features/presentation/react-bits/ReactBitsLayer.tsx";
import { reactBitsLoaders } from "../../src/features/presentation/react-bits/registry.ts";
import "../../src/features/presentation/cinematic.css";
function Harness() {
  const [id, setId] = useState("");
  return (
    <>
      <label>
        Effect
        <select value={id} onChange={(event) => setId(event.target.value)}>
          <option value="">Off</option>
          {Object.keys(reactBitsLoaders).map((key) => (
            <option key={key}>{key}</option>
          ))}
        </select>
      </label>
      <div style={{ position: "relative", width: 500, maxWidth: "90vw", height: 300 }}>
        {id && (
          <ReactBitsLayer
            key={id}
            effect={ReactBitsEffectSchema.parse({ id, duration: 500, props: {} })}
            imageUrl="/stories/house/media/heritage.photograph.webp"
          />
        )}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
