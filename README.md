# Listoire

A bilingual (English/French) interactive book: a reader for Ink stories with RPG rules and
combat, narration and cinematic presentation, and a story editor (text, media composition,
narration, game configuration).

The story that ships is _The School of Impossible Things_ / _L'École des choses impossibles_
(Orée, release `oree-1.3.0`), stored in [stories/house/project.json](stories/house/project.json).
Mobile browsers are supported.

## Run locally

Use Node 24.11.1 or newer and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

`npm run dev` builds the story bundles into the ignored `public/stories/`, then starts Vite.
The welcome page offers **Play an existing story** and the **Story Editor** (`/editor`).
On Windows, run Vite, Vitest and Playwright from PowerShell, not Git Bash (its lowercase drive
letter breaks them).

One **Language** setting changes the interface and the story. Each language keeps its own
checkpoint; reading progress, Back history and preferences live in IndexedDB. A save that no
longer matches the story is kept and can be downloaded before starting again.

## Check changes

```sh
npm run check        # story build, typecheck, lint, format check, unit tests
npm run build        # production build into dist/
npm run quality      # fallow: dead code, architecture, duplication, health
npx --no-install playwright install chromium firefox webkit
npm run test:e2e     # chromium, firefox, webkit and mobile (Pixel 7)
npm run perf         # reader and editor timings in Chromium (needs a running dev server)
```

E2E and `npm run test:coverage` start or reuse a dev server on port 4173; set `E2E_PORT` to
use another port. `npm run quality:audit -- --base <git-ref>` audits a changeset; a Claude Code
hook runs it before commits. GitHub Actions (`.github/workflows/quality.yml`) runs the checks,
the build and the published-asset verification.

## Structure

- `src/contracts`: Zod schemas shared by the reader, the editor and the tools.
- `src/features/story-runtime`: Ink adapter, `StoryDirector` (progression, saves, Back) and
  bundle loading; no React.
- `src/features/rules`: the RPG rules (checks, combat, character, rewards); pure functions.
- `src/features/reader`, `presentation`, `media`, `character`, `landing`: the reading UI,
  scene playback and effects, audio and narration, the character panel, the welcome.
- `src/features/editor`: the Story Editor, its compiler worker and authoring forms.
- `src/persistence`: IndexedDB stores for reading saves, settings, editor drafts and uploads.
- `src/app`, `src/i18n`, `src/shared`: composition, EN/FR texts, shared components.
- `stories/house`: the shipped project, its narration list and the published copies of the
  library files it uses (`media/`). `stories/foundation` is a small test story.
- `tools/`: story build, narration export, asset preparation and the performance measurement.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md), [MODULES.md](docs/MODULES.md) and
[DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md).

## Edit the story

Open the **Story Editor** at `/editor`. It edits both languages' Ink scripts and their
configuration (scenes, media, effects, narration, game). Drafts autosave in this browser, with
up to 30 history checkpoints, and update this browser's reader when they compile. To share a
version, export a complete project backup and replace `stories/house/project.json`, then
restart the dev server. Never edit the generated `public/stories/` or `dist/`. See
[the Story Editor report](docs/story-editor/implementation.md).

Keep passage, segment, choice and interaction IDs identical across translations. Ink owns
variables and rewards; presentation never grants items or rolls dice.

## Assets and licences

Source libraries stay local under `assets/` (not published as such). The
[curated catalogue](assets/catalog/curated.json) records each library file's origin, hash and
optimised copy; the build copies the files the story uses into `stories/house/media/` (so a
fresh checkout builds without the libraries) and `public/stories/house/media/`. Licences and
attributions are in [contributions.md](docs/contributions.md).

Read aloud uses recorded or generated clips where the story has them (generated clips remain
previews until a person listens to them), otherwise the device's voice where the story allows
it. The optional local generation service is described in [narration.md](docs/narration.md).
