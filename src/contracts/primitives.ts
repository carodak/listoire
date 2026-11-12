import { z } from "zod";

/** `#rgb` or `#rrggbb`: the forms the story palette compares (see effect-colors.ts). */
export const HexColorSchema = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);

/** A story ID: lower case, starting with a letter (passages, segments, assets, events…). */
export const IdSchema = z.string().regex(/^[a-z][a-z0-9.-]*$/);
/** A language: `fr` or `fr-CA`. */
export const LocaleSchema = z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/);
/** A SHA-256 digest in lower-case hex. */
export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
/** `#rrggbb`: page and palette colours. */
export const SixDigitColorSchema = z.string().regex(/^#[a-fA-F0-9]{6}$/);
