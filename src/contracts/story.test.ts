import { describe, expect, it } from "vitest";
import { fixtureBundle } from "../test-fixtures.ts";
import { BundleSchema } from "./story.ts";
import { allowsDeviceVoice, defaultReadingPreferences, defaultVolumes } from "./presentation.ts";

const digest = "a".repeat(64);
/** A valid bundle with one image and one narration recording for `threshold.key`. */
function bundle() {
  return {
    ...fixtureBundle(),
    assets: [
      { id: "door", type: "image", path: "media/door.webp", alt: "A door" },
      { id: "voice", type: "audio", path: "media/voice.mp3", alt: "" },
    ],
    cover: "door",
    scenes: { threshold: { title: "Threshold", progress: 0 } },
    narration: [
      {
        segmentId: "threshold.key",
        locale: "en",
        voiceId: "narrator",
        spokenTextDigest: digest,
        assetId: "voice",
        audioDigest: digest,
        durationMs: 1200,
        marks: [],
        approval: { status: "preview", reviewer: "tester", rightsReference: "test" },
      },
    ],
  };
}
type Bundle = ReturnType<typeof bundle>;
const issues = (value: unknown) => {
  const result = BundleSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

const rejections: [string, (b: Bundle) => unknown, string][] = [
  ["a repeated asset id", (b) => b.assets.push({ ...b.assets[0]! }), "Duplicate asset ID"],
  [
    "a scene for a passage the story lacks",
    (b) => {
      Object.assign(b.scenes, { attic: { title: "Attic", progress: 1 } });
    },
    "Unknown scene passage",
  ],
  ["a cover that is not an image", (b) => (b.cover = "voice"), "Unknown cover image"],
  ["a missing cover", (b) => (b.cover = "ghost"), "Unknown cover image"],
  [
    "narration for an unknown segment",
    (b) => {
      b.narration[0]!.segmentId = "attic.key";
    },
    "Invalid narration reference",
  ],
  [
    "narration pointing at a non-audio asset",
    (b) => {
      b.narration[0]!.assetId = "door";
    },
    "Invalid narration reference",
  ],
  [
    "narration recorded for another locale",
    (b) => {
      b.narration[0]!.locale = "fr";
    },
    "Invalid narration reference",
  ],
];

describe("BundleSchema", () => {
  it("accepts consistent assets, scenes and narration", () => {
    expect(issues(bundle())).toEqual([]);
  });

  it.each(rejections)("reports %s", (_, change, message) => {
    const b = bundle();
    change(b);
    expect(issues(b)).toContain(message);
  });

  it("reports an opponent portrait that is not an image", () => {
    const b = {
      ...bundle(),
      game: {
        encounters: [
          { id: "wolf", name: "Wolf", difficulty: "easy", profile: "balanced", portrait: "voice" },
        ],
      },
    };
    expect(issues(b)).toContain("Unknown opponent portrait");
  });

  // Media fetches rely on these two rules to stay same-origin (see REFACTOR_LOG.md, Part 1).
  it.each([
    "https://example.com/voice.mp3",
    "data:text/html;base64,PHNjcmlwdD4=",
    "javascript:alert(1)",
  ])("rejects embedded audio that is not an MP3 data URL: %s", (url) => {
    expect(issues({ ...bundle(), embeddedAudio: { voice: url } })).not.toEqual([]);
  });

  it.each([
    "../media/door.webp",
    "media/../../api/x.webp",
    "//example.com/door.webp",
    "media/door.svg",
  ])("rejects an asset path outside media/: %s", (path) => {
    const b = bundle();
    b.assets[0]!.path = path;
    expect(issues(b)).not.toEqual([]);
  });
});

it("shares the default volumes and the rule for device voices (REVIEW section 5 #2, #11)", () => {
  expect(defaultReadingPreferences.volumes ?? defaultVolumes).toEqual(defaultVolumes);
  expect(Object.keys(defaultVolumes).sort()).toEqual(["ambience", "music", "narration", "sfx"]);
  expect(["ai-live", undefined].map(allowsDeviceVoice)).toEqual([true, true]);
  expect(["disabled", "human", "ai-pregenerated"].map(allowsDeviceVoice)).toEqual([
    false,
    false,
    false,
  ]);
});
