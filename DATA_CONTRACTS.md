# Proposed content and runtime contracts

Status: illustrative TypeScript, **not application code or a finalized API**. Implement schemas with the first vertical slice, then infer DTO types from them instead of maintaining two definitions. Runtime ports stay TypeScript interfaces. All IDs below are case-sensitive, author-assigned strings, never paragraph hashes or translated labels.

## Implemented Phase 1 subset

The executable contracts live in [src/contracts/story.ts](src/contracts/story.ts) and are deliberately smaller than the target examples below. Zod defines bundle, text-frame, save and reader-language schemas; types are inferred from them. The narrative-only bundle embeds compiled Ink, locale, release/runtime/digest identifiers and companion passage/segment IDs. The saved envelope contains the resolved text/choices and post-evaluation Ink state, plus run ID and revision. It contains no inactive RPG, audio, asset or cinematic fields.

Each choice uses the run ID/revision as its occurrence identity; the director rejects stale commands and concurrent writes. IndexedDB's atomic read/compare/update replaces the proposed generic single-writer lease, with less browser-specific infrastructure. Restore verifies the saved choices against Ink without calling Continue. Exact-build/language compatibility is enforced, and settings use a separate key. Whole-paragraph instant display means no partial-reveal cursor is needed yet.

The host-request choice convention is verified against real compiled Ink and a save round-trip in an isolated test. Its tag belongs **inside** the square-bracketed choice label, for example `* [Resolve # request:door.check]`. The Phase 1 player deliberately does not execute action requests. Add action receipts/results only with the first authorized gameplay integration. Future DTOs below remain design sketches, not unused runtime code.

The Phase 1 follow-up adds a small published manifest (`schemaVersion`, `storyId`, `defaultLocale`, unique `locales`). Availability comes from authored locale metadata, not a speculative fallback after any network failure. Reader settings schema 2 stores `language` and the now-unused legacy `welcomeSound` field (retained for compatibility); schema 1 migrates from `interfaceLocale`, retaining every locale's existing save. A missing translation uses the declared default bundle and its own save slot. Save schema 1 and compiled Ink digests are unchanged by the structural refactor.

## Contract ownership

| Artifact                                 | Authoritative source                                     | Validation boundary                                                                |
| ---------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Story graph, prose, variables, choices   | Localized Ink sources                                    | Compile; verify IDs, declared bridge variables, host requests and branch parity    |
| Story manifest and presentation metadata | Versioned JSON beside Ink                                | Zod plus semantic reference checks at publish and load                             |
| Assets/interactions                      | Catalog and declared interaction definitions             | IDs, safe paths/types, coordinates, permissions and reachable interaction bindings |
| Narration                                | Approved audio/timing manifest for exact spoken variants | Digests, language, voice rights, encoding/timing correspondence                    |
| RPG actions/state                        | Official RuleSet version and registered action payloads  | Mode-specific action schemas and RulesEngine invariants                            |
| Saves                                    | One atomic, versioned snapshot                           | Save schema, bundle/runtime/rules compatibility and state invariants               |

Schema version, story release, compiled Ink digest, RuleSet version, narration generation revision and reader settings version are distinct. A cosmetic asset update need not break story state; a changed Ink build is incompatible by default unless explicitly certified/migrated.

## Story, passages and presentation

The following blocks form one illustrative type vocabulary. Production schemas will impose integer, size, range, uniqueness and path constraints that plain TypeScript cannot express.

```ts
type Id = string;
type Digest = string; // SHA-256 over canonical bytes
type Locale = "en" | "fr";
type Localized<T> = Partial<Record<Locale, T>>;
type Attribute = "STR" | "DEX" | "WIL";
type Rank = 1 | 2 | 3 | 4;
type StoryMode =
  | { kind: "narrative" }
  | { kind: "rpg"; combat: boolean; ruleSet: { id: Id; version: string } };

interface StoryManifest {
  schemaVersion: 1;
  id: Id;
  release: string;
  defaultLocale: Locale;
  metadata: Localized<{ title: string; description: string; author: string }>;
  languages: Partial<
    Record<
      Locale,
      {
        inkUrl: string;
        inkDigest: Digest;
        inkjsVersion: string;
        compilerVersion: string;
        narrationUrl?: string;
      }
    >
  >;
  mode: StoryMode;
  passagesUrl: string;
  assetsUrl: string;
  interactionsUrl?: string;
  visualIdentityId?: Id;
}

type Inline = { text: string; emphasis?: "em" | "strong" };
interface TextSegment {
  id: Id;
  locale: Locale;
  content: Inline[]; // resolved Ink output, safe formatting only
  spokenText: string;
  spokenTextDigest: Digest;
  variantId: Id; // authored finite variant, or a resolved digest ID
  roleId: Id; // narrator or character
  anchors: { id: Id; graphemeOffset: number }[];
}

interface PassageMetadata {
  id: Id;
  chapterId: Id;
  title: Localized<string>;
  segmentIds: Id[]; // allowed IDs; actual order follows emitted Ink output
  illustrationId?: Id;
  interactionId?: Id;
  cues: PresentationEvent[];
}

type Trigger =
  | { kind: "passage-start" }
  | { kind: "segment-start" | "segment-end"; segmentId: Id }
  | { kind: "anchor"; segmentId: Id; anchorId: Id }
  | { kind: "after-cue"; cueId: Id };

type Effect =
  | { kind: "fade"; target: "illustration" | "overlay"; opacity: number }
  | { kind: "camera"; target: "illustration"; zoom: number; x: number; y: number }
  | { kind: "shake"; target: "page" | "illustration"; intensity: number }
  | { kind: "flash"; target: "overlay"; intensity: number };

type Cue =
  | { kind: "effect"; effect: Effect; durationMs: number }
  | {
      kind: "audio";
      assetId: Id;
      channel: "music" | "ambience" | "sfx";
      operation: "play" | "stop";
      loop: boolean;
      fadeMs: number;
    }
  | { kind: "visual"; assetId: Id; transitionMs: number }
  | { kind: "sequence" | "parallel"; children: Cue[] };

interface PresentationEvent {
  id: Id;
  trigger: Trigger;
  delayMs: number;
  blocking: boolean; // only finite visual cues may block
  cue: Cue;
}

interface ReaderChoice {
  id: Id;
  label: Inline[];
}
interface DisplayFrame {
  passageId: Id;
  locale: Locale;
  occurrenceId: Id;
  segments: TextSegment[];
  choices: ReaderChoice[];
  sceneAssetId?: Id;
  ambienceAssetIds: Id[];
  chapterId: Id;
  milestoneId?: Id;
}
```

Ink emits `passage:<id>`, `segment:<id>` and `choice:<id>` tags; action boundaries reference a registered `action:<id>`. The exact host-choice convention must pass the InkJS spike in MODULES.md. No text matching, arbitrary CSS selectors, JavaScript, URLs supplied as effect code or opaque JSON scripts in Ink. Choice text is emitted by Ink, not duplicated as another branching definition in metadata.

First version needs passage/segment start/end triggers; finer anchors are optional. A later inline marker parser can remove approved anchor tokens while producing locale-specific grapheme positions. Translation may move an anchor while retaining its meaning/ID. Timing marks target those IDs. Do not reuse English offsets in French.

Anchor/segment reveal events fire at most once per occurrence. Reveal-all emits remaining reveal milestones in order; scheduled presentation cues are bounded/coalesced to prevent a burst of flashes, and their failure never prevents choices. Domain actions cannot be attached to a presentation event. A looping sound cannot be blocking. Sequences and parallel groups have bounded depth/count, deterministic child order and recursive cancellation; conflicting writes to the same visual property require explicit sequencing.

## Assets, themes and interactive images

```ts
interface Rights {
  owner: string;
  license: string;
  attribution?: string;
  provenanceRef: string;
}
interface Asset {
  id: Id;
  kind: "illustration" | "portrait" | "overlay" | "music" | "ambience" | "sfx";
  sources: { url: string; mime: string; digest: Digest }[];
  tags: string[]; // language-independent controlled vocabulary
  themes: Id[];
  mood: string[];
  location?: Id;
  lighting?: string;
  palette?: string[];
  usage: string[];
  aspectRatio?: number;
  focalPoint?: { x: number; y: number }; // normalized [0, 1]
  supportedEffects: Effect["kind"][];
  descriptions: Localized<{ alt: string; description: string }>;
  rights: Rights;
}
interface AssetQuery {
  kind?: Asset["kind"];
  themes?: Id[];
  tags?: string[];
  mood?: string[];
}
interface ReaderTheme {
  id: Id;
  label: Localized<string>;
  tokens: {
    background: string;
    foreground: string;
    accent: string;
    fontFamily: string;
    lineHeight: number;
  };
  decorationAssetIds: Id[];
}
interface InteractiveImage {
  id: Id;
  frontAssetId: Id;
  backAssetId?: Id;
  backDescription?: Localized<string>;
  zoom: { min: number; max: number };
  hotspots: {
    id: Id;
    side: "front" | "back";
    bounds: { x: number; y: number; width: number; height: number };
    label: Localized<string>;
    description: Localized<string>;
    interactionId?: Id; // registered narrative/domain command, never code
    once: boolean;
  }[];
}
```

Keep story identity (cover/art direction), reader theme (page typography/decorations) and scene assets independent. Audio-only assets may omit visual fields; production schemas should make those kind-specific. License metadata is required before publication. A canonical tag vocabulary enables language-independent search; human-readable descriptions and alt text are localized.

Hotspot coordinates refer to the uncropped source image, not viewport pixels. Transform them with zoom/pan; use a contain layout for examination. Every pointer hotspot has a labeled keyboard/touch list equivalent. Turning over can show a description even without a back asset. A discovery consequence passes through the director and the same atomic action path as a choice, and its once receipt is saved.

## Narration

```ts
interface NarrationClip {
  segmentId: Id;
  variantId: Id;
  locale: Locale;
  roleId: Id;
  voiceId: Id;
  voiceRevision: string;
  spokenTextDigest: Digest;
  audio: { url: string; mime: string; digest: Digest; durationMs: number }[];
  timing?: { audioDigest: Digest; marks: { anchorId: Id; startMs: number; endMs: number }[] };
  source:
    | { kind: "human"; recordingRevision: string; rights: Rights }
    | {
        kind: "generated";
        provider: Id;
        modelRevision: string;
        settingsDigest: Digest;
        authorizationRef: string;
        watermark: string;
      };
  approval: { status: "approved"; reviewedAt: string; reviewer: string };
}
interface NarrationManifest {
  schemaVersion: 1;
  storyId: Id;
  release: string;
  locale: Locale;
  defaultVoiceId: Id;
  voices: { id: Id; label: string; roleIds: Id[]; authorizationRef: string }[];
  clips: NarrationClip[];
}
type NarrationSelection =
  | { kind: "clip"; clip: NarrationClip; fallbackUsed: boolean }
  | { kind: "dynamic"; providerId: Id; request: GenerationRequest }
  | { kind: "silent"; reason: "disabled" | "missing" | "unavailable" };
interface GenerationRequest {
  segmentId: Id;
  variantId: Id;
  locale: Locale;
  text: string;
  voiceId: Id;
  modelRevision: string;
  settingsDigest: Digest;
}
// Tool/service boundary; never imported into the browser player.
interface NarrationGenerator {
  generate(
    request: GenerationRequest,
    signal: AbortSignal,
  ): Promise<{ artifactUrl: string; digest: Digest; durationMs: number }>;
}
```

Draft/rejected clips stay in authoring artifacts, not the runtime manifest. Validate that every clip matches its exact normalized spoken text and active locale. Finite variants are declared by authors; a changed name or interpolated number requires its own recording or a configured fallback. Narration speed changes transport time mapping, not the stored timestamps. Timing must be regenerated/revalidated after trimming, re-encoding that changes alignment, or changing words.

Recorded and AI-generated clips have identical playback controls. Keep one transport owner in AudioManager for narration/music/ambience/SFX; NarrationManager selects clips and manages segment transitions, not a second independent audio engine. Ducking releases on success, failure, cancellation and narration-off.

## RPG state and action bridge

```ts
type RpgAction =
  | { kind: "attribute-check"; attribute: Attribute }
  | { kind: "ability-check"; abilityId: Id }
  | { kind: "item-change"; itemId: Id; quantityDelta: number }
  | { kind: "damage"; amount: number }
  | { kind: "start-combat"; encounterId: Id }
  | {
      kind: "combat-action";
      action:
        | { kind: "attack" }
        | { kind: "ability"; abilityId: Id }
        | { kind: "item"; itemId: Id }
        | { kind: "flee" };
    };
type RpgOutcome =
  | { kind: "check"; success: boolean; faces: number[]; xpAwarded: number }
  | { kind: "changed" }
  | {
      kind: "combat";
      status: "ongoing" | "victory" | "fled" | "defeat";
      damageDealt: number;
      damageTaken: number;
      xpAwarded: number;
    }
  | { kind: "rejected"; reason: string };
interface RuleSet {
  id: Id;
  version: string;
  sourceDigest: Digest;
  abilityThresholds: Record<Rank, number>;
  difficulty: Record<
    "Facile" | "Normal" | "Difficile" | "Boss",
    { adaptationPercent: number; targetWinPercent: number }
  >;
  profiles: Record<"Résistant" | "Équilibré" | "Offensif", number>;
}
interface RandomSource {
  die(sides: number): number;
}
interface RulesEngine {
  evaluate(
    rules: RuleSet,
    state: Readonly<RpgState>,
    action: RpgAction,
    random: RandomSource,
  ): { state: RpgState; outcome: RpgOutcome };
}
interface RpgState {
  character: {
    initial: Record<Attribute, number>;
    base: Record<Attribute, number>; // excluding equipment
    hp: number;
    baseMaxHp: number;
    xp: number;
    abilities: Record<Id, Rank>;
    inventory: { instanceId: Id; definitionId: Id; quantity: number }[];
    equippedItemIds: Id[];
  };
  combat?: {
    encounterId: Id;
    phase: "hero-action" | "resolved";
    round: number;
    enemy: {
      definitionId: Id;
      hp: number;
      maxHp: number;
      damage: number;
      difficulty: "Facile" | "Normal" | "Difficile" | "Boss";
      profile: "Résistant" | "Équilibré" | "Offensif";
    };
    effects: { id: Id; sourceAbilityId: Id; target: "hero" | "enemy"; remainingTurns: number }[];
    resolution?: "victory" | "fled" | "defeat";
  };
}
type BridgeAction =
  | { kind: "rpg"; action: RpgAction }
  | { kind: "story-interaction"; interactionId: Id };
interface ActionRequest {
  occurrenceId: Id;
  actionId: Id;
  payload: BridgeAction;
}
```

This is a representative action set, not a declaration that unspecified flee/healing/effect rules are settled. RuleSet is versioned official configuration interpreted by known functions, not an author-defined scripting language. Injected RNG is the only nondeterministic input; tests provide fixed draws and runtime evaluates against a draft of the persisted RNG state. Add typed equipment, healing and progression actions only with approved semantics. Encounter/item/ability definitions are immutable content referenced by ID, validated against the RuleSet. RulesEngine returns next state, dice evidence and outcome. RPGEngine coordinates this result. Derived equipment values are recomputed, not another persistent base statistic.

The narrative bridge allowlists result variables and value types; e.g. `last_check_success` receives an actual boolean. Narrative conditions inspect derived facts, never implement damage formulas. Relationships remain serialized in Ink, not duplicated in RpgState. Expose direct versioned RuleSet evaluation to future tooling for encounter checks, without exposing browser presentation.

## Saves, settings and engine ports

```ts
interface RngSnapshot {
  algorithm: string;
  version: number;
  state: string;
}
interface SaveCommon {
  schemaVersion: 1;
  storyId: Id;
  release: string;
  inkDigest: Digest;
  inkjsVersion: string;
  locale: Locale;
  runId: Id;
  revision: number;
  updatedAt: string;
  inkStateJson: string; // includes Ink variables, visit history, Ink RNG
  frame: DisplayFrame; // already evaluated text and choices
  presentation: {
    segmentId?: Id;
    revealedGraphemes: number;
    firedCueIds: Id[];
    discoveredHotspotIds: Id[];
  };
  receipts: { occurrenceId: Id; actionId: Id; result: RpgOutcome | null }[];
  pendingRequest?: ActionRequest; // e.g. Ink waiting for active combat to resolve
}
type SaveData =
  | (SaveCommon & { mode: "narrative" })
  | (SaveCommon & {
      mode: "rpg";
      ruleSet: { id: Id; version: string };
      rpg: RpgState;
      rpgRng: RngSnapshot;
    });

interface ReaderSettings {
  schemaVersion: 2;
  language: Locale;
  welcomeSound: boolean;
  themeId: Id;
  fontId: Id;
  fontSizeRem: number;
  lineHeight: number;
  graphemesPerSecond: number;
  narrationEnabled: boolean;
  preferredVoiceId?: Id;
  narrationRate: number;
  volumes: Record<"narration" | "music" | "ambience" | "sfx", number>;
  animations: boolean;
  reducedMotion: "system" | "on";
}
type NarrativeBoundary =
  | { kind: "frame"; frame: DisplayFrame }
  | { kind: "request"; request: ActionRequest }
  | { kind: "end" };
interface NarrativeEngine {
  advanceToBoundary(): NarrativeBoundary;
  choose(choiceId: Id): void;
  resolveRequest(actionId: Id, result: RpgOutcome | null): void;
  serialize(): string;
  restore(state: string): void;
}
interface SaveStore {
  read(slotId: Id): Promise<unknown>; // validate at the adapter boundary
  write(slotId: Id, save: SaveData): Promise<void>;
  remove(slotId: Id): Promise<void>;
}
type Completion = "completed" | "cancelled" | "failed" | "timed-out";
interface PlaybackHandle {
  finished: Promise<Completion>;
  cancel(): void;
}
interface TextPresentationPort {
  present(frame: DisplayFrame, signal: AbortSignal): PlaybackHandle;
  revealAll(): void;
}
```

SaveManager owns parsing/version checks and uses SaveStore; the director supplies one coherent envelope. Slot identity includes story, language and user-selected slot. UI settings are stored separately; failure to parse settings restores safe defaults, not progression reset.

Automatic checkpoints occur after frame/domain commits and combat actions; reveal position can be debounced within the same coherent frame. Offer manual save/export without creating another state model. Keep the last valid checkpoint when writes fail, show a retry/export action and clearly mark unsaved play. Serialize writes; use a per-slot single-writer guard so two tabs cannot silently overwrite one another. A later cloud adapter will need conflict revisions, not just another HTTP implementation of blind write.

Load strategy: validate → check versions/digests → migrate only supported save-schema changes → restore Ink/RPG/RNG → render saved frame without reapplying actions. Preserve incompatible saves and offer the matching release or explicit restart/export; never erase them silently. RuleSet changes and compiled Ink changes require dedicated migrations or a retained old release. The initial release promises exact-build restores only.

## Validation and failure policy

Implement schemas once with Zod and infer types. A minimal style example:

```ts
import { z } from "zod";
const PointSchema = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
  })
  .strict();
type Point = z.infer<typeof PointSchema>;
```

Publishing checks schemas plus unique IDs, references, allowed modes/actions/effects, asset existence, narration coverage/digests, all supported languages, bounded cue graphs, declared interpolation variants and compilation errors. Static reachability checks cannot prove every dynamic Ink path. For the manually shipped demo, exercise authored paths and bound adapter drain loops. A step budget cannot interrupt one synchronous Ink Continue call: future untrusted author previews require an isolated worker with a termination watchdog. Test published content for runaway execution before release; schema validation alone cannot prove termination.

At runtime, validate fetched bundles and saves before use; allow only relative bundle paths or configured trusted asset origins, with path traversal and unsupported media types rejected. Render prose as text/approved nodes; forbid arbitrary HTML and generated JavaScript. Imported rich text, if introduced, needs explicit sanitization.

| Failure                                                       | Publication                                                        | Reader behavior                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Broken Ink, required metadata/action reference, wrong RuleSet | Reject                                                             | Retain prior checkpoint; show recoverable content error, retry/library controls |
| Missing optional image                                        | Warn or reject according to author-required flag                   | Alt/placeholder; continue reading                                               |
| Unknown optional effect                                       | Reject until removed/replaced                                      | Skip defensively; settle completion                                             |
| Failed audio, absent exact narration variant                  | Report coverage gap; require author acceptance for silent segments | Silent reading; no wrong-language/wrong-text recording                          |
| Invalid timing                                                | Reject timing artifact                                             | Segment-level reveal without precise synchronization                            |
| Storage unavailable / incompatible save                       | Not a publishing concern                                           | Preserve data; explain retry/export/restart choices; no silent overwrite        |

A future AI proposal uses these same schemas and semantic validators, adds its base source revision and diagnostics, and requires author review before publishing. Validation is a capability allowlist, not a mechanism for executing arbitrary generated behavior.
