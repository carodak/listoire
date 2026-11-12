import { mediaLayouts } from "../../contracts/presentation.ts";
import { useTranslation } from "react-i18next";
import type { MediaEdit } from "./media-edit.ts";
interface MediaLayoutProps {
  layout: MediaEdit["layout"];
  onLayout: (layout: MediaEdit["layout"]) => void;
}

/** Where the picture sits on the reading page. */
export function MediaLayout({ layout, onLayout }: MediaLayoutProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="media-layout">
      <legend>{t("editor.image.onPage")}</legend>
      <div className="media-layout-cards">
        {mediaLayouts.map((type) => (
          <button
            type="button"
            key={type}
            aria-pressed={layout === type}
            title={t(`editor.image.layoutHints.${type}`)}
            onClick={() => onLayout(type)}
          >
            <span className="layout-mini" data-layout={type} />
            {t(`editor.image.layouts.${type}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
