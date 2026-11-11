import { useTranslation } from "react-i18next";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { VisualPreview } from "./MediaLibrary.tsx";
import type { Picture } from "./image-pictures.ts";

type Role = Picture["role"];
const depths: Role[] = ["foreground", "midground", "background"];

/**
 * The image's layers. A single image is one row; "+ Add layer" makes a layered scene, whose
 * layers are then listed by depth, front to back, as image editors do.
 */
export function PicturesPanel({
  pictures,
  assets,
  selected,
  title,
  onSelect,
  onChoose,
  onAddLayer,
  onMove,
}: {
  pictures: Picture[];
  assets: MediaAsset[];
  selected: number;
  title: (id: string) => string;
  onSelect: (index: number) => void;
  /** Opens the picker for this layer's image. */
  onChoose: (index: number) => void;
  onAddLayer: () => void;
  onMove: (index: number, role: Role) => void;
}) {
  const { t } = useTranslation();
  const layered = pictures.length > 1;
  const row = (picture: Picture) => {
    const asset = assets.find((item) => item.id === picture.image);
    const name = picture.image ? title(picture.image) : "";
    return (
      <div key={picture.index} className="image-layer">
        <button
          type="button"
          className="image-picture"
          draggable={layered}
          aria-label={name ? t("editor.image.selectNamed", { name }) : t("editor.image.noImage")}
          aria-pressed={Boolean(name) && selected === picture.index}
          onClick={() => onSelect(picture.index)}
          onDragStart={(event) =>
            event.dataTransfer.setData("text/x-picture", String(picture.index))
          }
        >
          {asset ? <VisualPreview asset={asset} /> : <span className="image-placeholder" />}
          <span>{name || t("editor.image.noImage")}</span>
        </button>
        <button
          type="button"
          className="image-choose"
          aria-label={name ? t("editor.image.chooseFor", { name }) : t("editor.image.choose")}
          onClick={() => onChoose(picture.index)}
        >
          {t("editor.image.choose")}
        </button>
      </div>
    );
  };
  return (
    <section
      className="image-pictures"
      aria-label={t(layered ? "editor.image.layers" : "editor.image.single")}
    >
      <h3>{t(layered ? "editor.image.layers" : "editor.image.single")}</h3>
      {layered
        ? depths.map((role) => (
            <div
              key={role}
              className="image-depth"
              role="group"
              aria-label={t(`editor.image.depth.${role}`)}
              // Drop a layer's row here to move it to this depth.
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const index = Number(event.dataTransfer.getData("text/x-picture"));
                if (!Number.isNaN(index)) onMove(index, role);
              }}
            >
              <span className="image-depth-name">{t(`editor.image.depth.${role}`)}</span>
              <div className="image-depth-pictures">
                {pictures.filter((picture) => picture.role === role).map(row)}
              </div>
            </div>
          ))
        : row(pictures[0]!)}
      <button
        type="button"
        className="image-add"
        title={t("editor.image.addLayerHint")}
        disabled={!pictures[0]?.image || pictures.length >= 12}
        onClick={onAddLayer}
      >
        {t("editor.image.addLayer")}
      </button>
    </section>
  );
}
