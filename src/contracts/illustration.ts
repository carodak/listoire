import { z } from "zod";

export const illustrationRoles = ["background", "midground", "foreground"] as const;
const placement = {
  rotation: z.number().min(-180).max(180).optional(),
  role: z.enum(illustrationRoles),
  x: z.number().min(-75).max(75),
  y: z.number().min(-75).max(75),
  scale: z.number().min(0.2).max(3),
  // Optional (additive): tilt forward/back and turn left/right, and a mirror image.
  tiltX: z.number().min(-75).max(75).optional(),
  tiltY: z.number().min(-75).max(75).optional(),
  flip: z.boolean().optional(),
  // Optional (additive): "contain" shows the whole image; absent, the depth decides as before
  // (the back fills the frame, the others are whole).
  fit: z.enum(["contain", "cover"]).optional(),
};
export const IllustrationSchema = z
  .object({
    base: z.object(placement).strict(),
    layers: z.array(z.object({ image: z.string(), ...placement }).strict()).max(11),
    autoCrop: z.boolean().optional(),
    aspect: z.enum(["landscape", "portrait", "square"]),
    blend: z.enum(["none", "soft", "paper"]),
    wrap: z.enum(["none", "left", "right"]),
  })
  .strict();
export type Illustration = z.infer<typeof IllustrationSchema>;

export function illustrationDefaults(
  role: Illustration["base"]["role"] = "background",
  layers: string[] = [],
): Illustration {
  return {
    base: { role, x: 0, y: 0, scale: 1 },
    layers: layers.map((image, index) => ({
      image,
      role: index === layers.length - 1 ? "foreground" : "midground",
      x: 0,
      y: 0,
      scale: 1,
    })),
    aspect: role === "midground" ? "portrait" : "landscape",
    blend: "paper",
    wrap: "none",
  };
}
