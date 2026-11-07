import type { StoryProject } from "../../contracts/editor-project.ts";
import type { PresentationBlock, ImageExamination } from "../../contracts/presentation.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import type { Illustration } from "../../contracts/illustration.ts";

export type MediaBlock = Extract<PresentationBlock, { kind: "media" }>;
export type Scene = NonNullable<
  StoryProject["languages"][string]["configuration"]["scenes"]
>[string];
export interface MediaEdit {
  kind: string;
  sceneId: string;
  id: string;
  shared: boolean;
  asset: string;
  layout: MediaBlock["layout"];
  examination: ImageExamination | null | undefined;
  alt: string;
  caption: string;
  width: number;
  align: "left" | "center" | "right";
  fit: "contain" | "cover";
  positionOverride: boolean;
  x: number;
  y: number;
  motion: Cinematic;
  illustration: Illustration | null;
  show: "page" | "segment" | "delay";
  segment: string;
  delay: number;
  persistence: number;
  effect: string;
  target: string;
  duration: number;
  intensity: number;
  volume: number;
  loop: boolean;
  fade: number;
  stop: boolean;
}
