import { z } from "zod";

/** `#rgb` or `#rrggbb`: the forms the story palette compares (see effect-colors.ts). */
export const HexColorSchema = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
