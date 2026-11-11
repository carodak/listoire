import type { Illustration } from "../../contracts/illustration.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { illustrationDefaults } from "../../contracts/illustration.ts";

type Role = Illustration["base"]["role"];
type Placement = Illustration["base"];
/** A picture of a composition: the main one (index -1, `image`) or a layer (its index). */
export type Picture = Placement & { image: string; index: number };
/** The main picture and the composition, as the dialog edits them together. */
export interface Composition {
  image: string;
  value: Illustration;
}

export const picturesOf = ({ image, value }: Composition): Picture[] => [
  { image, ...value.base, index: -1 },
  ...value.layers.map((layer, index) => ({ ...layer, index })),
];

export function patchPicture(value: Illustration, index: number, patch: Partial<Placement>) {
  if (index < 0) return { ...value, base: { ...value.base, ...patch } };
  return {
    ...value,
    layers: value.layers.map((layer, at) => (at === index ? { ...layer, ...patch } : layer)),
  };
}

/** The frame that suits an image's own shape, from its stored dimensions. */
export function shapeOf(asset?: MediaAsset): Illustration["aspect"] | undefined {
  const size = asset?.dimensions;
  if (!size?.width || !size.height) return;
  const ratio = size.width / size.height;
  return ratio > 1.15 ? "landscape" : ratio < 0.87 ? "portrait" : "square";
}

/**
 * Adds a picture at a depth, whole in the frame ("contain"); the first picture becomes the
 * main one. Returns its index.
 */
export function addPicture({ image, value }: Composition, picture: string, role: Role) {
  if (!image)
    return {
      image: picture,
      value: { ...value, base: { ...illustrationDefaults(role).base, fit: "contain" as const } },
      index: -1,
    };
  const layer = { image: picture, role, x: 0, y: 0, scale: 1, fit: "contain" as const };
  return {
    image,
    value: { ...value, layers: [...value.layers, layer] },
    index: value.layers.length,
  };
}

/** A new image for a picture: same place and size, shown whole. */
export function changePicture({ image, value }: Composition, index: number, picture: string) {
  const whole = patchPicture(value, index, { fit: "contain" });
  if (index < 0) return { image: picture, value: whole };
  return {
    image,
    value: {
      ...whole,
      layers: whole.layers.map((layer, at) =>
        at === index ? { ...layer, image: picture } : layer,
      ),
    },
  };
}

/** Removes a picture; removing the main one makes the next picture the main one. */
export function removePicture({ image, value }: Composition, index: number): Composition {
  if (index >= 0)
    return { image, value: { ...value, layers: value.layers.filter((_, at) => at !== index) } };
  const [next, ...layers] = value.layers;
  if (!next) return { image: "", value: { ...value, base: illustrationDefaults().base } };
  const { image: promoted, ...base } = next;
  return { image: promoted, value: { ...value, base, layers } };
}

/** The same picture again, at the same depth, slightly shifted so both show. */
export function duplicatePicture(composition: Composition, index: number) {
  const picture = picturesOf(composition).find((item) => item.index === index)!;
  const { image, index: _, ...placement } = picture;
  const shift = (offset: number) => Math.max(-75, Math.min(75, offset + 6));
  const layer = { ...placement, image, x: shift(placement.x), y: shift(placement.y) };
  const { value } = composition;
  return {
    image: composition.image,
    value: { ...value, layers: [...value.layers, layer] },
    index: value.layers.length,
  };
}

/** Where a dragged picture lands: in front of or behind another one. */
export interface Drop {
  index: number;
  behind: boolean;
}

/**
 * Moves a picture to a depth, in front of or behind another picture (no target: the front of
 * that depth). A depth's pictures are drawn in order, the main one first, so the main picture
 * only changes depth and stays at the back of it: nothing goes behind it. Returns the value,
 * the moved picture's index and `order`, the old layer index at each new position.
 */
export function movePicture(value: Illustration, index: number, role: Role, target?: Drop) {
  const order = value.layers.map((_, at) => at);
  if (index < 0 || target?.index === index)
    return { value: patchPicture(value, index, { role }), index, order };
  const rest = order.filter((at) => at !== index);
  const position = !target
    ? rest.length
    : target.index < 0
      ? 0
      : rest.indexOf(target.index) + Number(!target.behind);
  rest.splice(position, 0, index);
  const layers = rest.map((at) =>
    at === index ? { ...value.layers[at]!, role } : value.layers[at]!,
  );
  return { value: { ...value, layers }, index: position, order: rest };
}
