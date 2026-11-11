# Proposed content and runtime contracts

The Story Editor adds executable `StoryProjectSchema`, `StoryConfigurationSchema`,
`PublishedProjectSchema` and `PreviewStateSchema` in `src/contracts/editor-project.ts`.
Project schema 1 stores localized Ink, metadata, defaults, missing-translation flags,
optional library facets and embedded recordings under the stable `house` ID.
Compiled bundles remain derived data, validated with `BundleSchema` before publication.
Bundle additions cover authored Ink, narration modes/voice selection, reading defaults,
embedded audio and image placement/timing. Strict speech settings include bounded pitch,
temperature, guidance, expressiveness and seed. Optional named voice profiles embed
permission-attested MP3/WAV references (at most 5 MB, duration checked at 6–30 seconds by
the local service); projects retain their aggregate 8 MB cap. Generated clips may carry
a settings digest so old settings cannot silently reuse a different voice preview.
Events may declare `phase: exit` for a bounded page fade-out on scene departure.
Media blocks add optional X/Y percentage offsets and cinematic preset settings with
bounded depth-layer references. Resolved frames carry optional executed `mediaAnchors`;
these are saved with the same Ink/domain checkpoint. Reader preferences add optional
page turning, off by default. Video assets have strict MP4/WebM paths and immutable
SHA-256/size/MIME identities with separate author-attested rights. Their binary bytes
live outside project history and enter complete backups as `uploadedFiles`.
The same scene/effect contracts validate
authoring forms, imported projects and normal playback. Story locales accept two-letter
language codes with an optional two-letter region; the interface supports English and French.
Editor records use a separate `listoire-editor/projects` database, optimistic revisions
and at most 30 version checkpoints. Reader gameplay saves and settings retain their
existing schema and database. See [the editor report](docs/story-editor/implementation.md).

Status: the implemented subset is defined by executable schemas in `src/contracts`; larger examples below remain illustrative TypeScript, **not a finalized API**. Implement schemas with the first vertical slice, then infer DTO types from them instead of maintaining two definitions. Runtime ports stay TypeScript interfaces. All IDs below are case-sensitive, author-assigned strings, never paragraph hashes or translated labels.

## Implemented Phase 1 subset

The executable contracts live in [src/contracts/story.ts](src/contracts/story.ts) and are deliberately smaller than the target examples below. Zod defines bundle, text-frame, save and reader-language schemas; types are inferred from them. The narrative-only bundle embeds compiled Ink, locale, release/runtime/digest identifiers and companion passage/segment IDs. The saved envelope contains the resolved text/choices and post-evaluation Ink state, plus run ID and revision. It contains no inactive RPG, audio, asset or cinematic fields. Since Pass 9 it may also hold `history`: up to 20 previous pages (oldest first), each with its Ink state, frame, and character/game state at that page, so Back still works after a reload. It is optional (older saves load without it, simply without Back), and it is dropped, never the save, when it is damaged, when a page's game state no longer validates, or when the save was written by an earlier compatible Ink version (`compatibleInkDigests`), whose pages can't be restored exactly.

Implemented inline formatting (`src/contracts/typography.ts`): narrative words carry
`<typo …>` markup, parsed from an allowlist into `typography` spans on segments and choices
(never HTML). Settings: `style` (presets), `size`, `font`, `color`, `direction`, `spacing`,
`shape`, and `bold`, `italic`, `underline`, `strike` (`on`/`off`; `off` cancels what a preset
sets). Presets declare their bold/italic (Shout, Impact bold; Whisper italic). All keys are
optional, so markup written before a key existed parses unchanged. `color` is a named colour
(the reader mixes it with the page's text colour) or any colour as six lowercase hex digits
without `#` (`color="336699"`, drawn exactly; `#` would start an Ink tag). `size` is a named
size or a whole point size from 8 to 48 (`size="14pt"`): 12 pt is the reader's text size, so
point sizes follow the reader's Text size setting; the reader caps them by the paragraph's width. The illustrative `Inline`
type below (`emphasis: em | strong`) was never implemented; the typography spans replace it.
Paragraph alignment is an Ink line tag, `# align:center|right|justify` (`left`, the default, is
never stored), read into the segment's optional `align`. Translations may align differently:
the cross-language structure check ignores `align:` tags. Any other value is a content error.

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

Load strategy: validate → check versions/digests → migrate only supported save-schema changes → restore Ink/RPG/RNG → render saved frame without reapplying actions. Preserve incompatible saves and offer the matching release or explicit restart/export; never erase them silently. RuleSet changes and compiled Ink changes require dedicated migrations or a retained old release. An author can certify an Ink update as additive (pages added, nothing moved) by listing the earlier digests of the same release in the language configuration's `compatibleInkDigests` (copied into the bundle, max 20); such a save is accepted only if it still restores exactly at its saved frame (choices, interactions and facts), and the next commit writes the new digest. Any other digest stays incompatible.

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

## Implemented Phases 2 and 3 contracts

Executable Zod schemas live in `src/contracts/story.ts`, `character.ts`, `presentation.ts`,
`effects.ts` and `media.ts`. Infer types from these files rather than copying the broader
design sketches above. House release is `0.3.1`, mode `rpg-no-combat`; this denotes the
initial character profile only. Bundle/save mode must match. Save schema 1 remains
compatible with narrative-only foundation fixtures; RPG-profile mode requires character.

- Character health starts at 6/6. STR/DEX/WIL contain initial/current values and three
  validated dice results, with initial equal to their sum. Investigation and Intuition have Rank 1.
  Profile generation occurs once before the initial atomic checkpoint; restore retains it.
- Frame facts/actions are evaluated from declared Ink variables; restoration compares
  the full serialized Ink boundary. Inventory/encounter metadata filters by these facts.
  Removed Observation/Knowledge/Courage are not replaced by narrative attribute checks.
- Scenes declare image/progress/title and up to 30 events. Each stable event ID has a
  passage, segment or block trigger and bounded delay; action is allowlisted effect/audio/stop.
  Ordered blocks declare text IDs, media IDs/layouts and final choices. Semantic validation
  checks order, references, bounded full-screen sequences and artistic color constraints.
  Supported effect props are strict bounded subsets of upstream APIs. No executable
  code or arbitrary asset URLs may be supplied by metadata.
- Character portrait, scene event images/audio, examination and narration assets are
  included in the build allowlist. Four images come from downloaded TCP/Heritage
  files; TCP Human 5 carries a published attribution. Embedded prototype imagery is explicitly rejected by the publication tool.
- The optional bundle `cover` remains a validated registered image for story metadata.
  Page-specific Right Page blocks supply the reading artwork. Default artwork refresh
  changes only known identities, preserves custom drafts/checkpoints and uses the
  user-approved `house.night` source/provenance. Photograph hotspot coordinates belong
  to that illustration.
- Narration clips declare segment/locale/voice, NFC text and audio SHA-256, finite
  duration, monotonic timing marks and rights/review evidence. Status distinguishes
  human-approved production recordings from generated previews. The 72 demonstration
  clips are previews, with successful waveform/decode/hash checks and listening pending. Playback
  requires exact text/locale/hash identity. Missing/bad clips may use an enabled device
  voice of matching language, otherwise silent reading remains available.
- Settings schema 2 adds optional narration/deviceVoice/rate/narratorVoice and four channel volumes,
  alongside typography/reveal/sound. Settings remain independent of story saves.
- No media handles, animation timers, lens positions or transient receipts enter saves.
  Reload presents complete saved text and silent media; explicit replay is available.

Technical inventory evidence and editorial suggestions stay distinct. Curated resources
record original/optimized paths, hashes, excerpts and project-use rights. Unverified or
raw-library resources are never exposed in the publication. Old house saves are retained
as incompatible/exportable after Ink/mode changes; no automatic migration is claimed.

## Editor media additions

`RuntimeAssetSchema` optionally carries `model3d` metadata (category, compatible layer
roles, dimensions and real clip names), or `scene3d` composition metadata on a cached
image/video. GLB resources are self-contained, bounded and validated before loading;
external resource URLs and unsupported compressed formats are rejected. File identity
is `upload.<sha256>`, with validated extension, MIME, size, rights and, for video,
duration. Complete backups retain those files in the existing upload archive.

`Scene3DSchema` separates models/depth layers, shot/subject position, visual material
style, curated ambience and optional particles from existing `CinematicSchema` data.
Bundle validation checks every model reference, compatible role and animation clip.
The camera samples the same numeric preset frames used by normal cinematic effects;
model clips run on independent animation mixers. Output is baked to WebP/video.
Optional object transforms store anchor-relative XYZ position, Euler rotation in
degrees and uniform scale (0.25–3); visibility is independent of layer membership.
Optional camera data stores position, target and FOV, used as the unanimated base
for existing cinematic sampling. Old compositions without these fields retain
automatic framing. Ten material presets cover cel, gradient, posterized, rim,
halftone, hatching, glossy, painterly, pencil and color-ink sketch treatments. Optional `blendMode`
selects soft/atmospheric/no masking; the legacy `blend` flag remains supported.
Optional `environment` selects village/forest terrain dressing. It applies only
while scenery layers are visible; a single subject remains transparent. Generated
sky/soil/path/grass/hills are renderer-owned scenery, not additional source assets.
Compositions require at least one model, but no `main` element or character.
Village/forest presets start as places. Automatic framing uses visible subjects
when present, otherwise scenery; foreground framing objects do not displace the
scenery focus. `pageEdges` optionally selects none/leaves/grass editorial silhouettes.
Book blending shares page-colored haze, vignetting and text-safe gradients between
the live draft and cached image/video presentation; it does not add cinematic events.
Layer-anchor compensation is stored in existing relative transforms, preserving
world positions across removal/replacement without introducing a second placement schema.
The presentation binding's optional `silentVideo` identifies decorative 3D clips:
they autoplay muted when visible, including on restored pages, respect reduced
motion, and remain controlled by global reader pause/resume. No narrative event
is replayed just to resume a decorative clip. Normal uploaded video remains unchanged.
Ordinary reading does not load models or start a continuous 3D renderer. Right Page
and Background output may opt into a soft mask; existing background opacity retains
text contrast. Existing image/video contracts and Ink progression remain in use.

Media blocks optionally declare a reusable examination configuration; only their own
non-fullscreen image may be examined. Fullscreen completion removes the image and
its effects. Presentation reset clears paused clocks/audio/scopes. Reader preferences
allow a hex `backgroundColor`; it stays separate from story checkpoint state.

### Layered paper illustrations

An image media block may declare `illustration`: a base image placement, up to eleven
additional image layers (the same picture may appear more than once), landscape/portrait/square
aspect, none/soft/paper blending and none/left/right text wrapping. Every placement has a
background/midground/foreground role, finite bounded X/Y offsets and scale, and optionally a
rotation, a tilt (`tiltX` forward/back, `tiltY` left/right, −75° to 75°) and `flip` (mirror);
pictures without tilt or flip draw exactly as before. Bundle validation rejects unknown or
non-image layer references, mixed legacy `motion.layers` and illustration layers, and wrapping
outside Inline layout.
The existing block image, five layouts, examination, visibility, persistence and
bounded cinematic event contracts remain authoritative. Shared-language edits copy
layer asset dependencies as well as the base image. Backups retain the composition.

Camera presets add gentle-depth, cinematic-push-in, sideways-drift, character-focus
and atmospheric-still alongside the existing downward-reveal. Optional
`CinematicSchema.durationMs` is 1?30 seconds; authoring derives the existing effect
duration from it. Preset speed defaults remain available. This is a multiplane
illustration: planes are placed at camera distances 800 / 1600 / 5333.33 for
foreground / middleground / background. Explicit perspective projection samples
camera translation and dolly, giving 1 / 0.5 / 0.15 tracking at the neutral camera.
Projection is applied per plane through the existing EffectsEngine. This avoids
Windows WebKit's flattened nested CSS 3D while retaining the same camera mathematics.
It requires no WebGL context or continuous Three renderer in the reader.

Paper mode combines irregular alpha feathering and multiply/screen compositing,
selected from the actual page luminance. Soft mode retains page-colored haze.
Single static unscaled cutouts can use their actual alpha contour for text wrapping;
composed/cropped illustrations use a conservative polygon contour. Narrow layouts
return floated images to full width. Reduced motion freezes camera/atmosphere;
global pause, replay, page departure and cinematic completion own cancellation.
Reader-selected page color takes priority over the story default, outside checkpoints.
