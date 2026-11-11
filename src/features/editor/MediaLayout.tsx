import type { MediaEdit } from "./media-edit.ts";
interface MediaLayoutProps {
  layout: MediaEdit["layout"];
  onLayout: (layout: MediaEdit["layout"]) => void;
}

export function MediaLayout({ layout, onLayout }: MediaLayoutProps) {
  return (
    <fieldset>
      <legend title="Choose where the illustration appears on the reading page.">Type</legend>
      <div className="media-layout-cards">
        {(["inline", "wide", "right", "background", "fullscreen"] as const).map((type) => (
          <button
            type="button"
            key={type}
            aria-pressed={layout === type}
            title={
              {
                inline: "Illustration at this position in the text; can wrap nearby paragraphs.",
                wide: "Wide illustration between paragraphs.",
                right: "Full-height illustration alongside the reading page.",
                background: "Behind the reading page, with a text-safe overlay.",
                fullscreen: "Full-screen cinematic; disappears when its movement finishes.",
              }[type]
            }
            onClick={() => onLayout(type)}
          >
            <span className="layout-mini" data-layout={type} />
            {
              {
                inline: "Inline",
                wide: "Wide",
                right: "Right Page",
                background: "Background",
                fullscreen: "Cinematic",
              }[type]
            }
          </button>
        ))}
      </div>
    </fieldset>
  );
}
