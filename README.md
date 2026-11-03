# Listoire

A React/TypeScript cinematic reader. Combined Phases 2 and 3 implement the complete
English/French _The House That Remembered_, a saved initial character, accessible
photograph magnifier and reusable declarative audio/narration/visual engines.
See [the combined report](docs/phases2-3-report.md) for verification and production limits.

## Run locally

Use Node 24.11.1 or newer and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The localized welcome introduces the reader;
**Play an existing story** opens/resumes the current story. The subtitle reveals
over 2.2 seconds, with reduced-motion support. Creation is clearly marked Coming
soon. The welcome attempts the short keyboard recording at animation startup;
browser autoplay rejection is accepted and never delays access.

One **Language** setting updates the interface and the story when its translation
is declared available. Otherwise a localized note explains the available story
language. Each compiled language keeps its own checkpoint; no Ink state crosses
language versions. Old two-language preferences migrate using the prior interface
language, preserving all story saves. Progress and settings use IndexedDB;
incompatible saves are preserved and can be downloaded before restarting.
The download is a recovery/export copy; importing saves is not implemented yet.

## Check changes

```sh
npm run check
npm run build
npm run quality
npx --no-install playwright install chromium firefox webkit
npm run test:e2e
```

`check` compiles the story, typechecks, lints, checks formatting and runs focused
tests. `quality` gates dead code, dependencies, boundaries and duplication, then
prints an advisory health report. `npm run quality:audit -- --base <git-ref>` audits
a changeset. GitHub Actions runs these checks and the browser flows; it has not
been executed remotely as part of this local task. `npm run preview` serves the
production build locally after `npm run build`.

Fallow is installed locally. The [initial health record](docs/phase1-health.json)
remains historical. Current findings and verification are recorded in
[the combined report](docs/phases2-3-report.md). Estimated UI coverage is advisory.
Thresholds remain unchanged; pinned vendor files have scoped maintainability/formatting
exclusions while dependency and architecture analysis still traverses them.

Fallow's project-local Codex MCP registration and commit/push hook files are
installed. Existing Ponytail/Fallow skills were preserved. Codex project trust and
`/hooks` trust still control activation; automatic hook enforcement has not been
verified. Explicit CLI checks work independently. No telemetry was enabled.

## Structure and scope

- `src/contracts`: Zod schemas and minimal runtime types.
- `src/features/landing`: welcome, bounded text animation and its short keyboard recording.
- `src/features/reader`: progressive text, choices, settings, notes and photograph interaction.
- `src/features/presentation`: declarative session, eleven native effects, fourteen lazy official React Bits effects and shared camera/magnifier.
- `src/features/media`: four-channel AudioManager and exact-text NarrationManager.
- `src/features/character`: initial saved profile and collapsed character panel.
- `src/features/story-runtime`: InkJS adapter, StoryDirector and bundle loading.
  Engine/coordinator files remain React-independent; the compiler stays in tools/tests.
- `src/persistence`: atomic IndexedDB operations, version checks and settings.
- `src/app`: application composition, reader-session lifetime and shared design tokens.
- `src/i18n`: shared EN/FR interface translations.
- `stories/house`: published bilingual Ink, metadata and selected derivatives.
- `stories/foundation`: historical test fixture, excluded from publication.
- `tools/build-story.ts`: compiles reproducible bundles into ignored `public/stories`.

Features use direct imports, without barrel exports. Fallow retains separate
logical zones for loader, narrative and coordinator within `story-runtime`;
Oxlint forbids React imports throughout that feature. Shared storage/contracts
stay outside features because both welcome/preferences and reader use them.

## Edit the story

The authoritative narrative sources are [English Ink](stories/house/en.ink) and
[French Ink](stories/house/fr.ink). Keep passage, segment, choice and interaction
IDs identical across translations. Ink owns variables and rewards. The optional
photograph action is a tagged Ink choice; presentation callbacks never grant items.

[metadata.json](stories/house/metadata.json) supplies translated scene titles,
progress milestones, panel labels, photograph descriptions, asset IDs and bounded
effects. `assetAlt` contains localized illustration descriptions. Add schema-approved
metadata rather than executable React or generated code. Recompile with:

```sh
npm run stories:build
```

Restart the dev server after authoring changes; there is no source-file watcher.
Generated `public/stories/house/**` and `dist/**` must not be edited. The old
foundation source is retained for deterministic regression tests, compiled into
ignored `.fallow/fixtures`, and excluded from production. Its existing save slots
are untouched; the full story uses separate `house` EN/FR slots.

To add another story, author a source directory with matching Ink/metadata and an
explicit licensed resource list, then wire the compiler and active loader to that
story. A folder alone does not register a story. A library picker/editor is deferred.

## Local source assets and catalogs

Large resources remain under `assets/audio/se/` and `assets/images/heritage-library/`.
They are excluded from Git. The extraction tool preserves ZIP originals and extracted
filenames. The user subsequently deleted the 279 top-level ZIPs; completion markers
remain, and the two nested archives were also extracted.
The following offline commands require Python 3.14, Pillow and FFmpeg/FFprobe on PATH:

```sh
python -X utf8 tools/asset-library.py extract
python -X utf8 tools/asset-library.py inventory
python -X utf8 -m unittest discover -s tools -p test_asset_library.py
python -X utf8 tools/verify-assets.py
```

Extraction checks free space, validates every path before writing, rejects collisions
and symlinks, verifies ZIP CRCs while streaming, and resumes using completed-archive
markers. Inspect `assets/catalog/extraction-report.json` for failures. A repeat run
checks source signature and extracted sizes before skipping completed archives.
After regenerating catalogs, run `npm run format` before the quality checks.
Technical inventories contain media plus accompanying license/vector documents;
curated descriptions are separated from unreviewed filename-based suggestions.

[Curated assets](assets/catalog/curated.json) trace selected source files, hashes,
license evidence and optimized derivatives. To regenerate only these copies:

```sh
python -X utf8 tools/prepare-assets.py
npm run stories:build
```

Only resource IDs referenced by localized story metadata are copied into its
published `media/` directory. Unknown rights, unknown IDs, unsafe paths and stale
optimized hashes fail compilation. Prebuilt selected derivatives in
`stories/house/media/` let normal development/CI build without the full collections.
The reader never imports the full inventory or animation catalog.

The development-only [25-effect catalog](assets/catalog/animations.json) records
11 implemented core effects and 14 locally vendored official React Bits components
loaded only when requested. The sole added runtime dependency is `ogl`. Run
`python -X utf8 tools/catalog-effects.py` to regenerate from pinned official source
metadata (network access is needed when its ignored verification cache is absent).
No overlay textures, external AI, vector database or asset backend are required.

Read [contributions.md](contributions.md) for permissions and restrictions. These
local libraries are not a redistribution resource for third-party authors. All published images now come from the downloaded Heritage library; the original
HTML is used only as a story/layout/interaction reference.

The reader uses a 94% white canvas with an 800px text column. Preferences persist
separately from story checkpoints. Reduced motion displays complete text and static
images; **Show all text** is available during reveal. Reload restores the evaluated
frame, complete text and paused audio without reapplying Ink actions. Sound effects
are off by default; playback rejection never blocks choices. The approved landing
keeps its own optional startup recording and no extra controls.

See [ARCHITECTURE.md](ARCHITECTURE.md), [MODULES.md](MODULES.md),
[DATA_CONTRACTS.md](DATA_CONTRACTS.md), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
and [the combined report](docs/phases2-3-report.md). Combat, visual editor, AI planner
and Capacitor remain deferred. Initial profile: 6/6 HP, saved 3d6 STR/DEX/WIL, two
Rank 1 abilities without narrative checks. Previous house saves remain exportable
but need an explicit restart after this Ink/profile change.

Read aloud selects approved exact-text clips when authored. No production recordings
are supplied yet; enable device voice fallback to use a matching browser/OS voice.
It may be unavailable on a device; voice failure never blocks reading. The engine
already supports validated recordings, timing marks, ducking, pause/resume and replay.
Offline narration generation and human voice production are later work.
