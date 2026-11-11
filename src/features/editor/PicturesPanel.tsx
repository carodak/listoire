import { useTranslation } from "react-i18next";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { VisualPreview } from "./MediaLibrary.tsx";
import type { Picture } from "./image-pictures.ts";

type Role = Picture["role"];
const depths: Role[] = ["foreground", "midground", "background"];

/** The composition's pictures by depth, front to back, as image editors list layers. */
export function PicturesPanel({
  pictures,
  assets,
  selected,
  title,
  onSelect,
  onAdd,
  onMove,
}: {
  pictures: Picture[];
  assets: MediaAsset[];
  selected: number;
  title: (id: string) => string;
  onSelect: (index: number) => void;
  onAdd: (role: Role) => void;
  onMove: (index: number, role: Role) => void;
}) {
  const { t } = useTranslation();
  const empty = !pictures[0]?.image;
  return (
    <section className="image-pictures" aria-label={t("editor.image.pictures")}>
      <h3>{t("editor.image.pictures")}</h3>
      {depths.map((role) => (
        <div
          key={role}
          className="image-depth"
          role="group"
          aria-label={t(`editor.image.depth.${role}`)}
          // Drop a picture's row here to move it to this depth.
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const index = Number(event.dataTransfer.getData("text/x-picture"));
            if (!Number.isNaN(index)) onMove(index, role);
          }}
        >
          <span className="image-depth-name">{t(`editor.image.depth.${role}`)}</span>
          <div className="image-depth-pictures">
            {pictures
              .filter((picture) => picture.image && picture.role === role)
              .map((picture) => {
                const asset = assets.find((item) => item.id === picture.image);
                const name = title(picture.image);
                return (
                  <button
                    type="button"
                    key={picture.index}
                    className="image-picture"
                    draggable
                    aria-label={t("editor.image.selectNamed", { name })}
                    aria-pressed={selected === picture.index}
                    onClick={() => onSelect(picture.index)}
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/x-picture", String(picture.index))
                    }
                  >
                    {asset && <VisualPreview asset={asset} />}
                    <span>{name}</span>
                  </button>
                );
              })}
            <button
              type="button"
              className="image-add"
              aria-label={t(`editor.image.addTo.${role}`)}
              title={t(`editor.image.addTo.${role}`)}
              disabled={pictures.length >= 12}
              onClick={() => onAdd(role)}
            >
              {t("editor.image.addShort")}
              {empty && role === "background" && <small>{t("editor.image.startHere")}</small>}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
