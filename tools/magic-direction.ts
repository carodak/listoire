import type { NarrativeEvent } from "../src/contracts/narrative-events.ts";

type Sound = Record<
  "rain" | "pages" | "magic" | "birds" | "air" | "water" | "impact" | "bells",
  string
>;
type Cue = [
  suffix: string,
  asset: string,
  channel: "sfx" | "music" | "ambience",
  volume: number,
  segment: number,
  loop: boolean,
];

export function magicCues(id: string, sound: Sound): NarrativeEvent[] {
  const paper: Cue = ["paper", sound.pages, "sfx", 0.3, 1, false];
  const cues: Record<string, Cue[]> = {
    atelier: [
      ["rain", sound.rain, "ambience", 0.15, 1, true],
      ["score", "oree.wonder", "music", 0.65, 1, true],
    ],
    lettre: [paper],
    bibliotheque: [paper],
    passage: [
      ["arrival", sound.magic, "sfx", 0.4, 1, false],
      ["birds", sound.birds, "ambience", 0.2, 1, true],
    ],
    lueur: [["light", sound.magic, "sfx", 0.28, 1, false]],
    "air-test": [["air", sound.air, "sfx", 0.4, 2, false]],
    "ecoute-test": [["water", sound.water, "sfx", 0.35, 2, false]],
    serre: [
      ["silence", "oree.silence", "music", 0.7, 2, true],
      ["impact", sound.impact, "sfx", 0.4, 2, false],
    ],
    apres: [
      ["return", sound.bells, "sfx", 0.22, 2, false],
      ["score", "oree.wonder", "music", 0.6, 3, true],
    ],
  };
  const events: NarrativeEvent[] = (Object.hasOwn(cues, id) ? cues[id] : []).map(
    ([suffix, assetId, channel, volume, segment, loop]) => ({
      id: `${id}.${suffix}`,
      trigger: { kind: "segment", segmentId: `${id}.p${segment}` },
      blocking: false,
      action: {
        kind: "audio",
        assetId,
        channel,
        volume,
        loop,
        fadeMs: channel === "sfx" ? 80 : 1400,
      },
    }),
  );
  return [
    ...events,
    ...(Object.hasOwn(visualCues, id) ? visualCues[id] : []).map(
      ([suffix, segment, effect, duration, intensity, color]) => ({
        id: `${id}.${suffix}`,
        blockId: "page",
        trigger: { kind: "segment" as const, segmentId: `${id}.p${segment}` },
        blocking: false,
        action: {
          kind: "effect" as const,
          effect: {
            id: effect,
            duration,
            intensity,
            target: "canvas" as const,
            ...(color ? { color } : {}),
          },
        },
      }),
    ),
  ];
}

type VisualCue = [
  suffix: string,
  segment: number,
  effect: "screen-shake" | "light-flicker",
  duration: number,
  intensity: number,
  color?: string,
];
const flash: VisualCue = ["spell-flash", 1, "light-flicker", 2700, 0.8, "#c7a55c"];
const visualCues: Record<string, VisualCue[]> = {
  atelier: [["board-beat", 2, "screen-shake", 2000, 0.12]],
  preuve: [["board-beat", 2, "light-flicker", 2000, 0.25, "#c7a55c"]],
  passage: [["board-beat", 1, "light-flicker", 2000, 0.35, "#c7a55c"]],
  duel: [["board-beat", 1, "screen-shake", 2000, 0.12]],
  apres: [["board-beat", 1, "light-flicker", 2000, 0.4, "#c7a55c"]],
  serre: [["camera-impact", 2, "screen-shake", 2000, 0.22]],
  lueur: [flash],
  "air-result": [flash],
  "ecoute-result": [flash],
  formule: [flash],
};
