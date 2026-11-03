# Listoire

A React/TypeScript reader for interactive stories. Phase 1 is complete: a small
English/French story validates InkJS branching, reader lifecycle and local saves.
The full house story and cinematic production belong to later authorized phases.

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

Fallow 3.38.1 is installed locally. The [initial health record](docs/phase1-health.json)
records the baseline without suppressing findings. The reader has one CRAP finding
based on Fallow's estimated coverage, despite its browser tests; raw
`fallow health` exits 1 for this finding, while the explicit report-only command
does not. Review it when adding reading controls; no artificial tests or blanket
suppression were added to improve the score.

Fallow's project-local Codex MCP registration and commit/push hook files are
installed. Existing Ponytail/Fallow skills were preserved. Codex project trust and
`/hooks` trust still control activation; automatic hook enforcement has not been
verified. Explicit CLI checks work independently. No telemetry was enabled.

## Structure and scope

- `src/contracts`: Zod schemas and minimal runtime types.
- `src/features/landing`: welcome, bounded text animation and its optional key taps.
- `src/features/reader`: React story presentation and reader styles.
- `src/features/story-runtime`: InkJS adapter, StoryDirector and bundle loading.
  Engine/coordinator files remain React-independent; the compiler stays in tools/tests.
- `src/persistence`: atomic IndexedDB operations, version checks and settings.
- `src/app`: application composition, reader-session lifetime and shared design tokens.
- `src/i18n`: shared EN/FR interface translations.
- `stories/foundation`: localized Ink and companion metadata.
- `tools/build-story.ts`: compiles reproducible bundles into ignored `public/stories`.

Features use direct imports, without barrel exports. Fallow retains separate
logical zones for loader, narrative and coordinator within `story-runtime`;
Oxlint forbids React imports throughout that feature. Shared storage/contracts
stay outside features because both welcome/preferences and reader use them.

## Edit a story

Edit **[stories/foundation/en.ink](stories/foundation/en.ink)** for English text and
**[stories/foundation/fr.ink](stories/foundation/fr.ink)** for French text. These are
the editable Ink sources, including prose, conditions, variables and choices.
Keep passage, segment and choice IDs aligned across translations. A passage starts
with a `passage:` tag, emitted paragraphs have `segment:` tags, and choice tags
belong inside the bracketed label, e.g. `* [Listen # choice:listen]`.

Edit **[metadata.json](stories/foundation/metadata.json)** for `storyId`, `release`,
`defaultLocale`, companion passage/segment IDs, and each locale's `title`/`chapter`.
An `en`/`fr` metadata entry declares that translation available and requires its Ink
file. Omitting an unavailable locale omits it from the generated manifest; the
compiler removes its stale generated bundle. The default locale must be available.
Interface and welcome wording live in **[src/i18n/i18n.ts](src/i18n/i18n.ts)**.

```sh
npm run stories:build
npm run check
```

Restart the development command after source edits, or rebuild before refreshing;
`npm run dev` and `npm run build` compile stories on startup. Ink files are not
watched automatically. Editing Ink changes its compiled digest, so existing saves
are preserved as incompatible rather than silently loaded into changed content.
Download progress before intentional story revisions; certified migrations are later work.

To add another story now, copy `stories/foundation` to `stories/<new-id>`, update its
Ink and metadata, and extend `tools/build-story.ts` to compile that directory to
`public/stories/<new-id>`. Use the same Bundle/Manifest schemas. The current app
selects **one active story**: change the `foundation` path and expected ID in
`src/features/story-runtime/bundle-loader.ts` when selecting the new story. Update
fixtures/browser assertions for its branches and languages. A directory alone does
not register a library entry; multi-story selection and authoring UI are deferred.

Do not edit `public/stories/**` (generated `manifest.json` and locale bundles) or
`dist/**` (production output). Rebuild them from Ink, metadata and application source.

Published assets resolve relative to the application base, and the static build
keeps a future Capacitor wrapper possible. No native application, RPG engine,
story audio/cinematic engine, editor or AI planner is implemented in Phase 1. The reader
uses instant paragraph display; progressive reveal and preferences start in Phase 2.
The welcome's short MP3 recording is separate from story narration/audio.
Browser autoplay may keep the intro silent. See [contributions.md](contributions.md)
for its CC0 attribution. The white reader canvas spans 94% of the available width,
with a centered text column capped at 800px.

See the [Phase 1 follow-up review](docs/phase1-followup-review.md) for the feature
refactor, critical assessment of Fallow/security candidates and verification results.

See [ARCHITECTURE.md](ARCHITECTURE.md), [MODULES.md](MODULES.md),
[DATA_CONTRACTS.md](DATA_CONTRACTS.md) and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
The RPG source has one approved erratum: the reference enemy example is **15 HP**
(about 74.1% victory), retaining its original formula and all other rules.
