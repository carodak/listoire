# Refactor log

## ☀ Morning summary (read this first)

**Done overnight.** E2E failures resolved as pre-existing (nothing reverted),
`sameOriginFetch` kept, vendor exclusion applied, secret scans and `npm audit` clean,
and 4 low-risk pass-3 changes, each its own commit (nothing pushed).
Score **94.7 → 95.0**, unit tests **269 → 392**, security candidates **48 → 10**.

**Needs your decision**

1. **24 pre-existing e2e failures** (×4 browsers = 98). Identical on `9f1afcd` (before
   any refactoring) and on current `main`. They look written for an earlier story
   (e.g. "Girl in the Photograph" heading, "Health" vs "♡Health"). Tests are off-limits
   for me: update them, or tell me which app behavior they should drive.
2. **Stale dev server on port 4173** (PID 37140, started 05:59, `cacheDir: .fallow/browser-vite-cache`).
   `reuseExistingServer` makes every local e2e run reuse it silently. I left it running.
3. **Coupling (−2.2) is structural.** 9 of the 11 over-threshold files are shared contracts,
   field components or test fixtures. The only real lever is the 12 reader components that
   import the `PresentationSession` class type to pass it down (prop drilling). A React
   context would cut that, but it's a medium-risk structural change.
4. **Look-alike merges (medium, not done):** `EditorFormDialog` for 5 form dialogs (~35 LOC);
   generic game-definition editor for Ability/Encounter/Item fields (~20 LOC).
5. **Error-text helper:** 9 copies of `error instanceof Error ? …`; reusing `message()` from
   `use-editor-project.ts` would push that file over the coupling threshold. Decide
   where `message()` should live.
6. Proposals waiting (not applied): **CSP** and the **`fallow security --gate new` CI step**
   (see "Security hardening").

Base commit: `45176fe` ("after claude, refa 1"). Coverage regenerated with
`npm run test:coverage` on these exact sources (269 unit + 45 e2e passed).

Health command used everywhere:
`npx fallow health --score --hotspots --coverage coverage/coverage-final.json || true`

## Step 0 — Baseline

| Metric                                                      | Value                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| Health score                                                | **94.7 A** (CLI rounds to "95")                         |
| Deductions                                                  | unit size −3.1, coupling −2.2, hotspots 0, all others 0 |
| Functions analyzed                                          | 2626 (16 over 60 LOC → 6.1 per 1k)                      |
| Files above coupling threshold                              | 11 of 249 (fan-in > p95 = 11) → 4.4%                    |
| Production LOC (src + tools, excl. tests and vendored code) | 20,349 (src only: 19,150)                               |
| Test LOC                                                    | 7,648                                                   |
| Unit tests (vitest)                                         | 269 in 39 files                                         |
| E2E tests (playwright)                                      | 292 in 17 files                                         |
| `fallow security` candidates                                | 48 (32 `public/editor/vendor/`, 11 `src/`, 5 `tools/`)  |

### Unit-size offenders (functions > 60 LOC)

Only one is production code; the other 15 are tests, which this task forbids changing.

| LOC             | Function                                            | Note               |
| --------------- | --------------------------------------------------- | ------------------ |
| 69              | `src/features/editor/ImageLayers.tsx` `ImageLayers` | production — fix   |
| 113, 86, 68, 62 | `tests/e2e/editor.spec.ts` (4 tests)                | test — untouchable |
| 103             | `tests/e2e/narration.spec.ts`                       | test               |
| 93, 79          | `tests/e2e/effects.spec.ts`                         | test               |
| 85              | `tests/e2e/presentation.spec.ts`                    | test               |
| 82              | `src/features/story-runtime/bundle-loader.test.ts`  | test               |
| 76, 71          | `tests/e2e/image-composition.spec.ts`               | test               |
| 69              | `src/features/story-runtime/game.test.ts`           | test               |
| 67, 64          | `tests/e2e/reader-request.spec.ts`                  | test               |
| 62              | `src/features/media/narration-manager.test.ts`      | test               |

### Coupling offenders (fan-in > 11)

| Fan-in | File                                                | Where the fan-in comes from                                                          |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 56     | `src/contracts/story.ts`                            | shared contract (by design)                                                          |
| 53     | `src/contracts/editor-project.ts`                   | shared contract                                                                      |
| 41     | `src/contracts/presentation.ts`                     | shared contract                                                                      |
| 32     | `src/contracts/game.ts`                             | shared contract                                                                      |
| 19     | `src/features/editor/Fields.tsx`                    | shared editor form fields                                                            |
| 19     | `src/contracts/cinematic.ts`                        | shared contract                                                                      |
| 17     | `tests/e2e/test.ts`                                 | e2e fixture — test, untouchable                                                      |
| 16     | `src/features/presentation/presentation-session.ts` | 12 reader components import the `PresentationSession` type to pass it down as a prop |
| 15     | `src/contracts/character.ts`                        | shared contract                                                                      |
| 13     | `src/contracts/illustration.ts`                     | shared contract                                                                      |
| 12     | `src/features/editor/compiler.ts`                   | 9 of 12 importers are tests/fixtures/tools                                           |

### Riskiest files (file scores with coverage)

`game-validation.ts` (CRAP 22.6, MI 74.7), `story.ts` (CRAP 20.6, fan-in 56),
`editor-actions.ts` (CRAP 20, MI 82.5), `ink-commands.ts` (CRAP 20),
`media-validation.ts` (CRAP 18, MI 76.7).

## Part 1 — Security

Every `src/` and `tools/` candidate was traced: its input is constant,
same-origin, or validated at the trust boundary, so none was exploitable. The six
`fetch()` candidates were then hardened anyway at your request (runtime same-origin
enforcement, commit `fa6f4d9`, see "Security hardening" below); the remaining
candidates are logged with reasons. Vendor candidates are waiting on a decision.

| Status                                                                             | Count |
| ---------------------------------------------------------------------------------- | ----- |
| Hardened in code (`fa6f4d9`): the six `fetch()` ssrf candidates                    | 6     |
| False positive, logged with reason (`compile-game`, `game-authoring` ×4, tools ×5) | 10    |
| Waiting on your decision (`public/editor/vendor/`)                                 | 32    |

### Waiting on decision — `public/editor/vendor/` (32 candidates)

`ace.js`, `ink-mode.js`, `ext-searchbox.js` and `ink-theme.css` are **live**:
`src/features/editor/ace.ts` injects `<script src="/editor/vendor/…">` for the
three scripts and loads the stylesheet at runtime. They are third-party Ace
(BSD, `public/licenses/ace-BSD.txt`) and Inky's ink mode (MIT,
`public/licenses/inky-web-MIT.txt`). Not modified.

`.fallowrc.json` already lists the folder in `ignoreFindings`, `health.ignore`
and `duplicates.ignore`, but `fallow security` ignores those; its own config
(`security.categories`) can only filter by category, not path. Dry run with a
temporary config: adding `"ignorePatterns": ["public/editor/vendor/**"]` takes
security from 48 → 16 candidates (0 vendor) and leaves the health score unchanged.

### Trace results (the first six rows are now enforced at runtime by `sameOriginFetch`)

| Candidate                                                               | Reason                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH `src/features/media/local-narration.ts:21` ssrf                    | The "env secret" is `import.meta.env.BASE_URL`, Vite's built-in public base path, not a `VITE_*` var and not a secret. URL is `${BASE_URL}api/narration[/editor-preview]`: same-origin, `redirect: "error"`, and the code returns early unless `import.meta.env.DEV`.                                                                   |
| `src/features/story-runtime/bundle-loader.ts:23` ssrf                   | URL built from `BASE_URL` + `"manifest" \| Locale`, then explicitly checked: http(s), same origin, no credentials, under the base path.                                                                                                                                                                                                 |
| `src/persistence/media-store.ts:27` ssrf                                | Root-relative `/stories/house/${asset.path}`; `path` must match `^media\/[a-z0-9.-]+\.(webp\|mp3\|mp4\|webm\|glb)$` (`presentation.ts:34`). Always same-origin.                                                                                                                                                                         |
| `src/features/editor/asset-validation.ts:21` ssrf                       | Root-relative `/stories/${storyId}/${asset.path}`; `storyId` matches `^[a-z][a-z0-9.-]*$`, path as above. HEAD, same-origin.                                                                                                                                                                                                            |
| `src/features/media/narration-clips.ts:72` ssrf                         | `audioUrl` comes only from `findRecording`: either `bundle.embeddedAudio[id]` (schema: `^data:audio\/mpeg;base64,…$`), `${BASE_URL}stories/${storyId}/${path}` (both regex-constrained), or the local-narration response (`audioPath` must match `^\/api\/narration\/audio\/[a-f0-9]{64}\.mp3$`). Bytes are SHA-256 checked afterwards. |
| `src/features/editor/narration-authoring.ts:10` ssrf                    | `result.audioUrl` comes only from `requestLocalNarration` (regex-validated path above).                                                                                                                                                                                                                                                 |
| `src/features/editor/compile-game.ts:17` dynamic-regex                  | The pattern interpolates `name` only from the hard-coded list `game_success`/`game_roll`/`game_hp`/`game_xp`/`game_outcome`. User script is the _subject_ of `.test()`, never part of the pattern; nothing to escape.                                                                                                                   |
| `src/features/editor/game-authoring.ts:58,59,63,67` prototype-pollution | `merge` is an array union by `id` (`[...existing, ...incoming.filter(new ids)]`), not a recursive object merge; it never copies keys. Both inputs are already `GameDefinitionSchema.parse`d. Matched on the name only.                                                                                                                  |
| `tools/run-test-coverage.ts:50` command-injection                       | Dev-only. Runs `process.execPath` with a hard-coded argument list.                                                                                                                                                                                                                                                                      |
| `tools/create-magic-story.ts:366,427` dynamic-regex                     | Dev-only. Interpolates page ids from the in-source `titles` table.                                                                                                                                                                                                                                                                      |
| `tools/editor-library.ts:44,48` header-injection                        | Dev-only Vite middleware. Header values are a fixed content type and numbers from `stat()` / a digits-only `Range` regex.                                                                                                                                                                                                               |

## Part 3 — Tests

Added 101 unit tests in 5 new files (one commit each). No production code
changed and **no bugs were revealed**: every rejection path behaved as written.

| Commit    | File                                         | Tests | What it covers                                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | -------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `4f35612` | `src/contracts/game-validation.test.ts`      | 31    | Every throw in `validateGameState`: repeated/unknown abilities and items, equipment slot/carry/HP-bonus mismatches, invalid encounters (unknown, HP over max, defeated character, impossible effect, no story choice), broken pending checks (unknown/non-check action, wrong choice, rolled without dice, no frame, invalid saved origin) and broken pending events; plus the states it must accept. |
| `5de183c` | `src/contracts/story.test.ts`                | 16    | `BundleSchema` refinements (duplicate asset, unknown scene passage, bad cover/portrait, narration for unknown segment / non-audio asset / other locale) and the two rules the Part 1 analysis depends on: `embeddedAudio` must be an MP3 `data:` URL; asset paths cannot leave `media/`.                                                                                                              |
| `57c8b5e` | `src/features/editor/editor-actions.test.ts` | 13    | Archive import (200 MB limit checked before reading, malformed JSON, non-project JSON, `.ink` replaces only the active language), compile/preview failures still clear `busy`, Find/Replace, media selection fallbacks, outline cursor. Worker compile is mocked.                                                                                                                                     |
| `030ebd1` | `src/features/editor/ink-commands.test.ts`   | 28    | Rejection of identifiers and labels/conditions that would inject Ink (newlines, `#`, brackets, braces, diverts), every command's output, created destinations, and that inherited keys like `toString` are not treated as commands.                                                                                                                                                                   |
| `c2ed097` | `src/contracts/media-validation.test.ts`     | 13    | All `validateMediaBlock` rules incl. the four previously uncovered ones.                                                                                                                                                                                                                                                                                                                              |

Note on metrics: the first draft of these tests had `describe` callbacks over
60 lines (case tables inline), which raised the unit-size deduction to −3.7,
and one test imported `narrative-events.ts`, pushing that module over the
coupling threshold (−2.4). Both were fixed in the tests themselves (case tables
moved to named module-level constants; the event type taken from
`validateMediaBlock`'s own signature) before committing.

A bug in my own first draft is worth noting for future tests:
`beforeEach(() => mock.mockReset())` returns the mock, and Vitest runs a function
returned from `beforeEach` as a teardown hook, so the mock was invoked after
each test. Use a block body.

## Security hardening (requested mid-task)

### Applied: one same-origin fetch helper — commit `fa6f4d9`

Ponytail step: 2 (reuse the guards the six call sites already had) → 6 (one small
helper). New `src/contracts/same-origin-fetch.ts` (contracts is the only zone
all six callers — media, persistence, content, editor — may import).

`sameOriginFetch(url, { timeoutMs, maxBytes, ...init })`:

- refuses, before any request, everything except same-origin `http(s)` URLs
  without username/password, and MP3 data URLs matching the schema regex
  (now defined once as `mp3DataUrl` and reused by `BundleSchema.embeddedAudio`);
- always sets `redirect: "error"` and `credentials: "same-origin"`;
- combines the caller's signal with an optional timeout;
- when the declared `Content-Length` exceeds `maxBytes`, cancels the body and
  returns `Response.error()` (`ok: false`). Every call site already treated
  "too large" exactly like "not ok", so each keeps its own outcome;
- passes the caller's original URL to `fetch` unchanged.

| Call site                | Before                                              | After (behavior kept)                                                                                                            |
| ------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `local-narration.ts`     | POST, signal+90 s, 200 kB → `null`                  | same; still `null` on block/oversize/error                                                                                       |
| `narration-clips.ts`     | GET, signal+5 s, 10 MB → `"error"`                  | same; post-read byte check and SHA-256 kept                                                                                      |
| `media-store.ts`         | GET, 15 s, 50 MB → throws "Missing uploaded media…" | same; `credentials` now explicit `same-origin` (the fetch default)                                                               |
| `narration-authoring.ts` | GET, signal, 5 MB → throws "Could not cache…"       | same                                                                                                                             |
| `asset-validation.ts`    | HEAD, 5 s                                           | same                                                                                                                             |
| `bundle-loader.ts`       | own protocol/origin/credential/base-path checks     | base-path check kept; the rest now in the helper. A blocked URL still ends as `ReaderFailure("content")` via the existing catch. |

Behavior changes: none intended. Edge case: a blocked URL now raises the helper's
`Error` instead of whatever `fetch` would have done. Every call site already
catches or propagates errors from that line, and no current input can reach that
path (see the schema rules above).

Tests: `src/contracts/same-origin-fetch.test.ts` (19): same-origin relative,
absolute and `URL` inputs plus MP3 data URLs pass unchanged with redirect/credentials
enforced; other origin, other port, http-on-https, `//evil.test`,
`user:secret@`, `user@`, non-audio data, WAV data, data URL with trailing
markup, `javascript:` and `blob:` are rejected before any request; size limit;
signal + timeout combination; behavior outside a browser. All 370 pre-existing
unit tests still pass unchanged (389 total at that point).

Fallow: 6 `ssrf` candidates → 1 on the helper's own `fetch()`, suppressed with ONE
line-level `// fallow-ignore-next-line security-sink` and the reason on the line
above. No file-level suppressions. `fallow security`: 48 → 42.
Checks: typecheck, lint, unit tests, `npm run build`, architecture (clean),
audit hook — all pass. Score 94.8 → 94.8.

### Proposal (not applied): Content-Security-Policy

What the code loads, checked in `src/`, `index.html` and `public/editor/vendor/`:

| Need                                                                                                                                                                             | Where                        | Directive                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| App bundle, Ace scripts injected from `/editor/vendor/`                                                                                                                          | `src/features/editor/ace.ts` | `script-src 'self'`                                                        |
| No `eval` / `new Function` (also none in vendored Ace)                                                                                                                           | grep                         | nothing extra needed                                                       |
| Compiler worker (`new Worker(new URL("./compiler.worker.ts"…), {type:"module"})`)                                                                                                | `compile-client.ts`          | `worker-src 'self'`                                                        |
| Ace injects `<style>` elements at runtime (`importCssString`); this Ace build has no `useStrictCSP` option. React `style={}` uses the CSSOM, which CSP does not block.           | `ace.js:1031`                | `style-src 'self' 'unsafe-inline'`                                         |
| Handwriting font (`cinematic.css` → `./handwriting.woff2`, bundled)                                                                                                              |                              | `font-src 'self'`                                                          |
| Story images, uploaded images via `URL.createObjectURL` (`smart-crop.ts`, `media-store.ts`), small assets Vite may inline                                                        |                              | `img-src 'self' data: blob:`                                               |
| Story audio/video, narration played from object URLs (`narration-clips.ts`), editor previews from data URLs and object URLs (`VoiceExample`, `VideoUpload`, `NarrationRecorder`) |                              | `media-src 'self' data: blob:`                                             |
| All runtime fetches go through `sameOriginFetch` (same origin or MP3 `data:`)                                                                                                    |                              | `connect-src 'self' data:`                                                 |
| No iframes, plugins or forms posting elsewhere                                                                                                                                   |                              | `object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'` |
| No external origins anywhere (no CDNs, fonts, analytics)                                                                                                                         | grep for `https?://`         | —                                                                          |

Proposed production policy:

```
default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline';
font-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:;
connect-src 'self' data:; object-src 'none'; frame-src 'none'; base-uri 'self';
form-action 'self'; frame-ancestors 'none'
```

Where to set it: the repo has no hosting config (no `vercel.json`, `netlify.toml`,
`_headers`, nginx or Capacitor config yet), so:

- **Preferred:** an HTTP response header from whatever host serves `dist/`. This is the only
  way to use `frame-ancestors` (ignored in `<meta>`).
- **Fallback:** `<meta http-equiv="Content-Security-Policy">` in `index.html` (drop
  `frame-ancestors`), added only to the production build. The Vite dev server
  needs inline scripts and a WebSocket for HMR, and the dev-only narration API.
  A small `transformIndexHtml` hook with `apply: "build"` in `vite.config.ts` keeps dev unaffected.
- Future Capacitor builds serve from a custom scheme; re-check `'self'` there.
- Removing `'unsafe-inline'` from `style-src` would require an Ace build with
  `useStrictCSP` (and loading `ace.css` as a file).

### Proposal (not applied): `fallow security` CI gate

`fallow security` supports a regression gate: `--gate new` fails (exit 8) only
when a change adds a new candidate on changed lines, and needs a diff source
(`--changed-since <ref>`). Verified locally: `npx fallow security --gate new
--changed-since 45176fe` → `gate_outcomes.security.status = "pass"`, exit 0.
There is deliberately no "fail on whole backlog" mode; `--format sarif` /
`--sarif-file` can feed GitHub code scanning.

Proposed step for `.github/workflows/quality.yml`, next to "Changed-code audit":

```yaml
- name: Security regression gate
  if: github.event_name == 'pull_request'
  env:
    AUDIT_BASE: ${{ github.event.pull_request.base.sha }}
  run: npx --no-install fallow security --gate new --changed-since "$AUDIT_BASE" --format json --quiet
```

## E2E failures — resolved: they predate all refactoring

The full e2e suite on `45176fe` reported 194 passed / 98 failed (24–25 per browser,
identical across chromium/firefox/webkit/mobile, so deterministic).

Two possible confounds were ruled out:

1. **Stale server.** Port 4173 was held by a long-running Vite server (PID 37140,
   started 05:59 with `cacheDir: .fallow/browser-vite-cache`), not by Playwright.
   Because `reuseExistingServer` is true outside CI, every local e2e run had silently
   reused it. **I did not kill it** (not mine).
2. **The refactor.** I ran the 9 affected spec files on chromium through a temporary
   config that starts a fresh `npm run dev` on port 4174, first at `fa6f4d9` (refactor +
   `sameOriginFetch`), then at `9f1afcd` ("before claude").

| Commit                             | Failed | Passed |
| ---------------------------------- | ------ | ------ |
| `fa6f4d9` (current)                | 24     | 9      |
| `9f1afcd` (before any refactoring) | 24     | 9      |

The failure lists are identical test-for-test (`comm` of both lists is empty). Dependencies,
Playwright config and every e2e test are byte-identical between the two commits.
Verdict: **pre-existing, unrelated to the refactor or the fetch helper, so nothing reverted.**
They look like tests written for an earlier story: e.g. `house.spec` waits for a
"Girl in the Photograph" heading, and `character.spec` expects "Health" where the panel
has rendered "♡Health" since before these passes. Per your rules I did not change tests.
Listed as "needs decision" in the morning summary. The temporary config was deleted;
the tree was returned to `main` and stories rebuilt.

## Pass 3 — Look-alikes and quality (overnight, unattended)

### Step 0 — Inventory (no code changes)

**Editor components, grouped by purpose** (`src/features/editor/`, 39 `.tsx` files):

| Group                 | Components                                                                                                                           | Real differences                                                                                                                                                                                                                                                                        | Est. LOC saved | Risk                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| Form fields           | `Field`, `CheckboxField`, `TextareaField`, `SelectField` (Fields.tsx), `NumberField` (MediaFields), `DurationField`                  | `DurationField` re-implements `Field`'s `<label>{label}<input/></label>` by hand (plus a help `<p>` and `value \|\| ""`). `NumberField` is a 10-site uncontrolled `defaultValue` wrapper over `Field`: keep.                                                                            | ~8             | low                                       |
| File inputs           | `NarrationRecorder` (MP3), `VideoUpload`, `VoiceExample`, `StoryEditor` (hidden import input)                                        | Identical handler: take `files[0]`, run an async upload, reset `input.value` afterwards. Labels/accept/disabled differ. One shared handler factory covers all four (not a new component).                                                                                               | ~14            | low                                       |
| Form dialogs          | `NarrationDialog`, `JsonProperties`, `CommandDialog`, `GameEditor`, `MediaDialog`                                                    | Same skeleton (`preventDefault` → try/apply/close → catch into error state → `<p role="alert">` → `EditorFormActions`) but the alert/hint order and extra wrappers (`fieldset`, keyed form, docked preview) differ. A shared `EditorFormDialog` would need a hint slot + form-key prop. | ~35            | **medium — look-alike merge, for review** |
| Error text            | 9 × `error instanceof Error ? error.message : String(error)` in editor files vs. the existing `message()` in `use-editor-project.ts` | Reuse is trivial, but importing `use-editor-project.ts` from 6 more files puts it over the coupling threshold (fan-in 6 → 12 > p95 11). Moving `message()` to a lower-level module first changes 3 existing importers.                                                                  | ~6             | medium (score)                            |
| Media pickers         | `MediaLibrary`, `MediaPicker`, `MediaSource`, `VisualPreview`, `LibraryFrame`                                                        | Different jobs (browse vs. pick vs. upload-or-pick). No merge.                                                                                                                                                                                                                          | 0              | —                                         |
| Voice / narration     | `VoiceDesigner`, `VoiceExample`, `DeviceVoices`, `VoiceControls`, `NarrationModeSelect`, `NarrationRecorder`                         | Each edits a different part of the language config. No merge.                                                                                                                                                                                                                           | 0              | —                                         |
| Outline / panels      | `StoryOutline` (`ProjectFiles`, `ScriptOutline`, `SceneMedia`), `EditorWorkspace`, `PanelDivider`                                    | Already split by tab.                                                                                                                                                                                                                                                                   | 0              | —                                         |
| Game definition forms | `AbilityFields`, `EncounterFields`, `ItemFields` (GameCatalog)                                                                       | Same frame (find by index → `update` via `replaceAt` → `DefinitionIdentity`) with different field sets; Fallow semantic dupes flags 24 lines. A generic "definition editor" needs per-kind field render props.                                                                          | ~20            | **medium — look-alike merge, for review** |

**Other features**: reader/presentation/character already share their dialog
shells (`shared/Dialog`, `shared/ReaderModal`); no further look-alike families
found by name/size scan (largest: `CharacterPanel.tsx` 525 lines, 12 components
already split by section).

### Quality review (React checklist)

Scans run on `main` (`fa6f4d9`):

- 3 State/effects: every `useEffect` that awaits/`then`s has an abort/active/
  disposed guard; every `setTimeout`/`setInterval` in a component has a matching
  clear; every `addEventListener` has a matching remove. **No issue found.**
- 4 Types: no `any`/`as any` in production code. **No issue found.**
- 5 Errors: the 7 empty `.catch(() => {})` are deliberate (write queues that
  already reported the previous failure; best-effort `play()`/`decode()` where
  autoplay/decoding refusal is expected). **No issue found.**
- 2 Components: duplicated logic listed in the inventory above (file-input
  handler, error text, form-dialog skeleton).
- 8 Performance: `EditorActions.open()` issues two consecutive `patchView`
  calls (`{ selectedMedia: undefined }` then `{ dialog }`) that are one state
  update. Merge into one call. Low risk.

### Ranked plan

| #   | Item                                                                            | Kind              | Risk   | Tonight?                                       |
| --- | ------------------------------------------------------------------------------- | ----------------- | ------ | ---------------------------------------------- |
| 1   | `DurationField` reuses `Field`                                                  | LOC / reuse       | low    | yes                                            |
| 2   | One file-input handler for the 4 upload inputs                                  | LOC / checklist 2 | low    | yes                                            |
| 3   | `EditorActions.open()`: one `patchView` instead of two                          | checklist 8       | low    | yes                                            |
| 4   | Shared error text (`message()`) without raising coupling                        | checklist 2       | medium | no — needs decision on where `message()` lives |
| 5   | `EditorFormDialog` for the 5 form dialogs                                       | look-alike merge  | medium | no — morning review                            |
| 6   | Generic game-definition editor (`AbilityFields`/`EncounterFields`/`ItemFields`) | look-alike merge  | medium | no — morning review                            |

### Pass 3 — executed (low-risk items only)

Measured after each change: unit tests, lint, typecheck, `npm run build`, health, `fallow security`.

| Commit                     | Change                                                                        | Problem fixed                                          | Ponytail step    | Prod LOC Δ | Score after             |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------- | ---------- | ----------------------- |
| `f74f619`                  | `ignorePatterns: ["public/editor/vendor/**"]` (approved)                      | vendor candidates in `fallow security`                 | —                | 0          | 94.9 (security 42 → 10) |
| `9894845`                  | `LayerList` owns its add-by-role buttons (`onAdd` prop)                       | unit size: `ImageLayers` 69 → 56 lines; DOM unchanged  | 5 small change   | +3         | 95.0                    |
| `f5c4540`                  | `DurationField` renders through `Field`                                       | checklist 2: hand-copied `Field` markup; DOM unchanged | 2 reuse          | 0          | 95.0                    |
| `1863221` + test `c01153a` | `uploadChosenFile()` in `Fields.tsx` replaces 4 identical file-input handlers | checklist 2: copy-pasted handler (×4)                  | 6 minimal helper | −10        | 95.0                    |
| `7c71398` (+1 test)        | `EditorActions.open()`: one merged `patchView` instead of two                 | checklist 8: redundant dispatch to a merging reducer   | 5 small change   | −1         | 95.0                    |

E2E for these: `image-composition` + `media-workspace` (6/7; the failing one is one of
the 24 pre-existing failures, failing at the same line as on `9f1afcd`), `editor` +
`game-authoring` (13/13). After 5 commits: `npx fallow` → 0 dead code, 0 clone groups,
all gates pass. Plan re-ranked: items 4–6 remain medium risk / look-alike merges, so they
were left for review. A final derived-state scan (effects that only copy into state) found nothing.

### Totals (this whole session's second task, from `45176fe`)

|                                                        | Before | After                                                    |
| ------------------------------------------------------ | ------ | -------------------------------------------------------- |
| Health score                                           | 94.7   | **95.0**                                                 |
| Unit size deduction                                    | −3.1   | **−2.8**                                                 |
| Coupling deduction                                     | −2.2   | −2.2 (unchanged; see needs-decision 3)                   |
| Production LOC                                         | 20,349 | 20,369 (+20: the 49-line fetch helper vs. −29 elsewhere) |
| Unit tests                                             | 269    | **392** (+123)                                           |
| E2E tests                                              | 292    | 292                                                      |
| `fallow security`                                      | 48     | **10** (all traced false positives)                      |
| Secret scans (`hardcoded-secret`, `secret-to-network`) | —      | 0 findings                                               |
| `npm audit` (all / production)                         | —      | 0 vulnerabilities                                        |
