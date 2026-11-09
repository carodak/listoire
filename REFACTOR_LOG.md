# Refactor log

## ☀ Summary — branch `features/reader-combat-editor` (read this first)

All work is on `features/reader-combat-editor` (13 commits on top of `main`, nothing pushed,
nothing committed to `main`). **Partially done:** Parts 0 and 1 are complete. Parts 2–5 were
**not started**: I ran out of working context, and I stopped at a clean, green state rather than
leave half-finished UI redesigns.

|                                                  | Before (`main`) | After (branch)                                                           |
| ------------------------------------------------ | --------------- | ------------------------------------------------------------------------ |
| Health score                                     | 95.0            | 94.8 (agreed floor; coupling +0.1 from the shared error helper)          |
| Production LOC (src + tools, excl. tests/vendor) | 20,369          | 20,712 (+343: shared components, combat log, victory, i18n)              |
| Unit tests                                       | 392             | **397**                                                                  |
| E2E tests                                        | 292             | **316** (+6 new specs' tests incl. side panels, editor tabs, typewriter) |
| `fallow security`                                | 10              | 10 (no new candidate)                                                    |

### What was done

- **Part 0.2:** `message()` → `src/contracts/error-message.ts`, 9 copies replaced.
- **Part 0.3a:** one `CloseButton` (`src/shared/`) for all 7 close controls (one glyph, translated label).
- **Part 0.3b:** one `ReaderSidebar` (`src/shared/`) for reading preferences + character panel:
  focus in on open, back to the opener on close, one Escape rule.
- **Part 0.3c:** full ARIA tab pattern (arrow keys, roving tabIndex, `aria-controls`,
  labelled `tabpanel`) for Ribbon and StoryOutline, reusing the inventory's keyboard logic
  (`src/shared/tab-keys.ts`).
- **Part 1.1:** text is shown in full by default; the typewriter is opt-in (Reading
  preferences → Text display → Progressive). With it on, a keyboard-reachable "Show all text"
  control returns (existing `revealAll` strings and `reveal` glyph).
- **Part 1.2:** combat log in reading order ("You attack… X damage dealt." then "The enemy
  attacks… X damage received."), item use and flee too, all through i18n (en+fr) from
  structured rule results; a claw slash + red flash on the enemy portrait when a blow lands;
  both skipped under reduced motion (new `useReducedMotion()` hook); the log stays visible.
- **Part 1.3:** combat runs until the enemy reaches 0 HP, then the combat window shows
  "Victory!" with the final blow, and the story continues on its own once the dice settle.
  No rule changes. The save format only gained optional fields (old saves still load).
- **REVIEW fixes in touched code:** structured combat results instead of English rule
  messages (#5, combat only); a third combat effect no longer breaks the save (section 3);
  CombatControls' `rolling` no longer sticks when a turn is refused (section 3).
- **Found and fixed: fresh dev servers reloaded pages mid-test** (504 "Outdated Optimize
  Dep" for `ogl` on first dice, `inkjs/full` in the editor worker). `optimizeDeps.include`
  now lists both. This made **5 reader-request tests and the editor's game-authoring tests
  fail on any new server, including CI**. Verified with a cleared cache.
- Part 0.1 so far: `welcome.spec` (3 tests) and `reader-request :108` updated; the other
  outdated tests are still pending (below).

### Design choices to review

- Close-button labels: reader uses translated `t("close")`; the English-only editor keeps
  "Close dialog" / "Close preview" / "Close gallery" (its tests and strings are English).
  "Close gallery" became an icon button.
- Side-panel Escape: closes from anywhere inside except within a nested modal or when
  another handler already handled the key; the panel container takes focus (no outline).
- Ribbon tabpanel is now named by its tab ("Text") instead of "Text commands".
- Reveal control is an icon button, shown only with the typewriter on and while text is
  still revealing. In instant mode, delayed media also appear at once (existing `revealAll`).
- Combat results gained optional fields `dealt`, `received`, `usedItem`, `healed`, `fled`
  (additive save-format change; `message` kept as fallback for old saves).
- Effects cap: a new effect replaces the oldest when two are active (schema max is 2).
- Victory hold: 2 s after the final dice settle (`VICTORY_HOLD_MS` in `GamePanel.tsx`).
  Only victory moves into the combat window; escape/defeat/charm keep the existing notice.
- `DiceRoll` still takes a `french` prop (existing API); I didn't widen the i18n refactor.

### Skipped / not done, and why

- **Part 0.1, remaining outdated e2e tests:** `house.spec` ×5, `reader.spec` ×9,
  `reader-polish :3` and the rest of `:29` (Orée's photograph has no reverse side, so the
  handwritten-reverse checks need a fixture story or a decision), `character.spec`,
  `narration.spec` ×2, `magnifier`, `media-workspace`. Triage and proposed fix per test are in
  "Task 1 — Triage" below.
- **Part 2 (audio), Part 3 (visuals + screenshots), Part 4 (Text UX), Part 5 (Image UX):** not
  started. Ran out of context. For Part 2, start with REVIEW #13 (5 s download timeout for clips
  up to 10 MB in `narration-clips.ts`; 4 s start timer in `audio-manager.ts`), which is the most
  likely cause of narration stopping, and #9 (`skipCinematic` clears layout timers).
- No screenshots were taken (Part 3 not started).

### How to try it

- `git switch features/reader-combat-editor`, `npm run dev`.
- **Text display:** open a story; text is complete. Reading preferences → Text display →
  Progressive, then turn a page: the "Show all text" icon appears in the toolbar (Tab +
  Enter works).
- **Side panels:** open Reading preferences or My Character; Escape closes and returns focus.
- **Editor tabs:** `/editor`, focus a ribbon tab, use ←/→.
- **Combat:** play Orée until the practice duel with Ysée: the log fills in turn order, blows
  flash on her portrait, and winning shows "Victory!" then moves on. In French too.
- E2E locally: port 4173 is taken, so use an untracked override that starts/reuses a
  server on 4175 (`playwright.local.config.ts`, listed in `.git/info/exclude`):
  `npx playwright test -c playwright.local.config.ts`.

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

## Pass 4

Port 4173 was **still held by the old server (PID 37140)** at the start of this pass.
Not reused: all app checks below ran against my own `npm run dev` on port 4174, which
I stopped afterwards.

### Task 1 — Triage of the 24 pre-existing e2e failures (report only, nothing changed)

Method: failure output from a fresh-server chromium run (and the long-lived-server run
for 3 tests that hit a cold-start `page.goto` timeout on the fresh server); the
running app probed with Playwright on 4174; `git log -S` to find when the app
stopped matching each expectation. **Every app-side change dates to `9f1afcd`
("before claude", 2026-11-09)**, which also edited several of these spec files,
so the specs were only partly updated.

| #     | Test (chromium; same in all 4 browsers)             | Test expects                                                                                | App does now                                                                                                                                                                                                                           | Verdict                                        | Proposed fix                                                                                                                                                                                                                                            |
| ----- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–5   | `house.spec` :12, :53, :106, :131, :176             | heading "The Girl in the Photograph" (old house story), then its photograph, branches, etc. | serves the Orée story; first page "The morning errands". "Girl in the Photograph" survives only in `stories/house/metadata.json` (the foundation fixture used by unit tests)                                                           | outdated test                                  | Retarget each test at the Orée page that has the feature (photograph/examination, failed audio, resource requests) or at a dedicated fixture story. Some may need deleting if the feature isn't in Orée.                                                |
| 6–12  | `reader.spec` :18, :52, :78, :106, :124, :147, :229 | first choice "Continue reading", prose "On the back…"                                       | first choice is "Get back before the kettle boils over"                                                                                                                                                                                | outdated test                                  | Replace the old story's choice/prose with Orée's (shared helper for "first choice").                                                                                                                                                                    |
| 13    | `reader.spec` :178                                  | `.eyebrow` with "The House That Remembered"                                                 | no `.eyebrow` element (removed in `9f1afcd`)                                                                                                                                                                                           | outdated test                                  | Drop or retarget the eyebrow assertion; keep the layout assertions.                                                                                                                                                                                     |
| 14    | `reader.spec` :212                                  | right-page art `paper.modern-male-character.webp`                                           | that asset is no longer in the story/catalog                                                                                                                                                                                           | outdated test                                  | Assert against the art Orée actually uses on that page.                                                                                                                                                                                                 |
| 15    | `reader-polish.spec` :3                             | heading "The Girl in the Photograph"                                                        | Orée heading                                                                                                                                                                                                                           | outdated test                                  | As #1–5.                                                                                                                                                                                                                                                |
| 16    | `character.spec` :2                                 | `.character-stats dt` = "Health", "STR", "DEX", "WIL"                                       | "♡Health": a decorative `<span aria-hidden="true">♡</span>` was added in `9f1afcd`                                                                                                                                                     | outdated test                                  | Match `/Health$/` (the accessible text is still "Health").                                                                                                                                                                                              |
| 17    | `welcome.spec` :3                                   | exactly one `svg` in the language button                                                    | two: `.language-flag` and `.language-chevron` (chevron added in `9f1afcd`)                                                                                                                                                             | outdated test                                  | `locator("svg.language-flag")`.                                                                                                                                                                                                                         |
| 18–19 | `narration.spec` :4 (en, fr)                        | visible text "Reading preferences" / "Préférences de lecture"                               | it's now an icon button with that `aria-label`                                                                                                                                                                                         | outdated test                                  | `getByRole("button", { name: … })`.                                                                                                                                                                                                                     |
| 20    | `magnifier.spec` :2                                 | "Examine the photograph" button on the opening page                                         | Orée's opening page has no examinable photograph (the feature still exists)                                                                                                                                                            | outdated test                                  | Navigate to an Orée page with an examination, or use a fixture story.                                                                                                                                                                                   |
| 21    | `media-workspace.spec` :3                           | library asset `paper.modern-male-character`                                                 | no longer in the catalog                                                                                                                                                                                                               | outdated test                                  | Use an asset id that exists.                                                                                                                                                                                                                            |
| 22–24 | `welcome.spec` :26, :94; `reader-polish.spec` :29   | a "Show all text" button after entering the story                                           | **removed** from `ReadingControls` in `9f1afcd`; its i18n key `revealAll` is still defined but unused. The only remaining way to skip the typewriter reveal is clicking a paragraph (`<p onClick>`), which keyboard users can't reach. | **unclear: possible accessibility regression** | Decide: (a) intentional → update tests to click the text, and delete the orphan `revealAll` strings; or (b) restore a keyboard-reachable control (app fix). Affects only users without reduced motion (with reduced motion the text appears instantly). |

Summary: 21 outdated tests (story content and UI redesigned on purpose in `9f1afcd`),
3 unclear (the removed "Show all text" control). No fix applied; each needs your approval.

### Task 2 — Error-message helper (first attempt: measured, reverted, asked)

The 9 copies plus the 4 existing `message()` users make 13 importers; the coupling
threshold is fan-in > 11. Measured options: new `src/contracts/error-message.ts` →
94.8 (coupling −2.4); next to `ReaderFailure` in `story.ts` → 95.0. Decision received:
use `src/contracts/error-message.ts` and accept 94.8 as the new floor (done in Pass 5).

### Task 3 — Security CI gate: committed `c09123e`

"Security regression gate" step after the changed-code audit in
`.github/workflows/quality.yml`: `npx --no-install fallow security --gate new
--changed-since "$AUDIT_BASE" --format json --quiet` (PRs only). Local check: exit 0.

### Task 4 — UI primitive inventory by behavior

Method: grep by behavior (`<dialog`/`showModal`, `role="dialog"`, Escape handlers,
close glyphs, backdrop `target === currentTarget`, `createPortal`, focus calls,
`role="tab"`, `<details>`, `aria-expanded`, `role="status"/"alert"`, raw form controls).

**W. Windows / modals / panels**

| #   | Implementation                                                               | Kind                        | Behavior / a11y                                                                                                   | Shared base?    |
| --- | ---------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------- |
| W1  | `src/shared/Dialog.tsx:5`                                                    | modal base                  | native `<dialog>` + `showModal()` (focus trap, inert page), Escape via `onCancel`, backdrop click, focus restored | base            |
| W2  | `src/shared/ReaderModal.tsx:15` (CharacterPanel ×2, CheckRoll, GamePanel ×2) | reader modal                | header (eyebrow, h2, SVG ×), content, footer close action                                                         | W1              |
| W3  | `src/features/editor/EditorDialog.tsx:12` (12 uses)                          | editor modal / docked panel | header (h2, actions, text × "Close dialog" + title); `docked` = non-modal `section role=region`                   | W1 (docked: no) |
| W4  | `src/features/reader/PhotographViewer.tsx:38`                                | modal                       | own heading, ✕ in aria-hidden span                                                                                | W1              |
| W5  | `src/features/presentation/SceneIllustration.tsx:204`                        | full-screen cinematic       | no header; Escape/backdrop = skip                                                                                 | W1              |
| W6  | `src/features/reader/ReadingControls.tsx:100`                                | non-modal side panel        | `aside.reader-sidebar`; Escape anywhere inside closes; text ×                                                     | no              |
| W7  | `src/features/character/CharacterPanel.tsx:62/97`                            | non-modal side panel        | `aside.reader-sidebar`; Escape only when the aside itself has focus; text ×                                       | no              |
| W8  | `src/features/editor/MediaLibrary.tsx` `LibraryFrame`                        | docked panel                | section + "Close gallery" text button                                                                             | no              |
| W9  | `src/app/EditorRoute.tsx:85`                                                 | preview page chrome         | text × "Close preview"                                                                                            | n/a             |
| W10 | `src/shared/LanguageSetting.tsx:40`                                          | popover menu                | `<details>`, Escape + refocus summary                                                                             | n/a             |

Every modal already goes through the one native `Dialog`; no hand-made overlay,
focus trap or portal window exists. The non-modal reader side panels (W6, W7) are one
primitive built twice with different Escape rules (fixed in Pass 5, 3b).

**C. Close buttons:** 7 implementations, 4 glyphs (text ×, ✕, inline SVG, text
"Close gallery"), names "Close dialog" / closeLabel / t("close") / "Close preview".
No shared component (added in Pass 5, 3a).

**B. Buttons:** `ToolbarGlyph` already shared for icon toolbar buttons. Primary buttons
use two deliberate CSS families (editor `.primary`, reader `.reader-modal-primary`);
no duplicated component. No change.

**F. Form fields:** editor `Fields.tsx` is the base. Raw `<select>`: 4 plain ones
(`NarrationRecorder`, `MediaDialog`, `DeviceVoices`, `EditorHeader.LanguageSelect`)
convertible to `SelectField`; 2 need disabled options (`ImageComposition`,
`VoiceDesigner`); 2 index pickers (`GameCatalog`, `GameEditor`) belong to the
game-definition merge. Reader `ReadingControls` keeps its own controls (reader may
not import editor). Deferred per decision unless a file is rewritten anyway.

**S. Loading/empty/error:** ~25 sites, all `<p role="status|alert">` and plain text.
Consistent; a wrapper would be a thin wrapper. No change.

**T. Tabs / collapsibles:** `InventoryTabs` (CharacterPanel) has the full pattern
(arrow keys, roving tabIndex, tabpanel). `Ribbon` lacks arrow keys; `StoryOutline` lacks
arrow keys and tabpanel (fixed in Pass 5, 3c). Collapsibles use native `<details>`
(8 sites + shared `Info`). Consistent.

**Planned look-alike merges (not approved yet):** `EditorFormDialog` for 5 form
dialogs (~35 LOC, medium); game-definition editor for Ability/Encounter/Item fields
(~20–25 LOC, medium).

## Pass 5 — branch `features/reader-combat-editor` (unattended)

E2E runs use an untracked `playwright.local.config.ts` (listed in `.git/info/exclude`)
that reuses **my own** dev server on port 4175. Port 4173 is still held by PID 37140;
4173/4180 were not used. A fresh Vite server needs ~60 s for its first page, so I warm it
once before a run instead of raising test timeouts.

| Commit    | Item                                                                  | Problem                      | Ponytail step       | Prod LOC Δ | Score                 |
| --------- | --------------------------------------------------------------------- | ---------------------------- | ------------------- | ---------- | --------------------- |
| `ee22970` | Log: e2e triage + primitive inventory                                 | —                            | —                   | 0          | 95.0                  |
| `3f1e0fc` | 0.2 `message()` → `src/contracts/error-message.ts`, 9 copies replaced | duplicated error text        | 2 reuse             | +5         | 94.8 (accepted floor) |
| `d2e3466` | 0.3a `CloseButton` (`src/shared/`) for 7 close controls               | 4 glyphs, inconsistent names | 6 minimal component | −25        | 94.9                  |

### Design choices to review

- **Close-button labels:** reader/character use the translated `t("close")`; the
  English-only editor keeps "Close dialog" / "Close preview" / "Close gallery",
  because its e2e tests and its other strings are English and not in i18n.
  The glyph is now ReaderModal's SVG × everywhere, so "Close gallery" became an icon button.

| `7eabfd4` | 0.3b `ReaderSidebar` (`src/shared/`) for reading preferences + character panel | two copies, different Escape rules, no focus handling | 6 minimal component | −2 | 94.9 |
| `b0d8e38` | 0.3c ARIA tab pattern for Ribbon + StoryOutline via `arrowKeyTabs` (from InventoryTabs) | editor tabs had no arrow keys / roving tabIndex; outline had no tabpanel | 2 reuse (moved helper) | +21 | 94.8 |
| `877e721` | `RibbonTabs` component | `Ribbon` grew to 64 lines with the tab pattern | 5 small change | +4 | 95.0 |
| `2750351` | 0.1 `welcome.spec:3` targets `svg.language-flag` | outdated test (chevron added in `9f1afcd`) | — | 0 | 95.0 |
| `7360891` | 1.1 text instant by default; typewriter opt-in; "Show all text" control restored | typewriter forced on everyone; no keyboard way to skip it | 1 delete (pinned default) + 2 reuse (strings, glyph) | +12 | 95.0 |

New tests: `tests/e2e/side-panels.spec.ts` (3), `tests/e2e/editor-tabs.spec.ts` (1),
`tests/e2e/typewriter.spec.ts` (2).

Test assertions updated because this pass changed the behavior on purpose:

- `welcome.spec` "original welcome…" and "blocked audio…": instead of clicking
  "Show all text", assert it is absent and the page's first choice is visible
  (Orée's first choice replaces the old story's "Continue reading": Part 0.1).
- `reader-polish.spec` "photograph keeps its dimensions…": the "Show all text" click
  became an absence check; the rest of the test still targets the old story (Part 0.1).
- `presentation-session.test` "resumes only visible videos…": constructs the session
  with `reveal: "progressive"` (it relied on that being the default). Assertions unchanged.

### Design choices to review (continued)

- **Side-panel Escape rule:** Escape closes from anywhere inside the panel except
  inside a nested `<dialog>` or when another handler already called
  `preventDefault` (the colour sampler does). Focus goes to the panel container on
  open (`tabIndex=-1`, no outline) and back to the opener on close.
- **Ribbon tabpanel name:** now `aria-labelledby` its tab ("Text") instead of
  `aria-label="Text commands"`, per the ARIA tab pattern.
- **Reveal control:** an icon button in the transport bar (existing `reveal` glyph,
  `t("revealAll")` as name and tooltip), shown only when the typewriter is on and
  the page is still revealing. Old condition kept (`!revealAll && !textComplete`).
- **Instant text and timed media:** in instant mode the existing `revealAll` logic
  also shows delayed media at once (as "instant" already did before it became the
  default).

### Found while testing (not caused by this branch)

- With a **fresh** dev server, 5 `reader-request.spec` tests fail (`.reader` missing
  after a combat: `:108`, `:215`, `:328`, `:350`, `:583`). Bisected: they fail the same
  way on `ee22970` (identical to `main`'s code), so they predate this branch. They passed
  last night only against the long-lived 4173 server. To investigate with Part 1.3.

| `0cce5e7` | REVIEW §3 + #5: structured combat damage, at most two stored effects | third effect broke the save; English rule text | 5 small change | +20 | 95.0 |
| `350775a`, `81f2a20` | pre-bundle `ogl` and `inkjs/full` | fresh dev server reloaded pages mid-test (e2e failures in CI) | 4 installed dependency config | +5 | 95.0 |
| `d7fed8c` | 1.2 + 1.3 combat log, hit feedback, in-window victory, `rolling` fix | no damage feedback; victory vanished into a separate notice | 6 minimal new code (+2 reuse ReaderModal/DiceRoll) | +170 | 94.8 |

Test assertions updated because this pass changed the behavior on purpose (continued):

- `reader-request.spec` "completes the French magic chapter…": the combat loop stops when
  the victory window appears, asserts "Victoire !", the chronological log, the localized item
  line and that no hit effect plays under reduced motion; it waits for the auto-continue
  instead of dismissing a notice.

## Pass 6 — combat endings, scroll-driven media, e2e, audio, visuals

Own dev server on port 4175 (`playwright.local.config.ts`); 4173/4180 not used.
Baseline (`8a78885`): score 94.8, prod LOC 20,712, 397 unit tests, 10 security candidates.
Check after every item: unit tests, oxlint, tsc, oxfmt, `vite build`, Fallow health, `fallow security`.

| Commit    | Item                                                           | Ponytail step            | Prod LOC Δ | Score |
| --------- | -------------------------------------------------------------- | ------------------------ | ---------- | ----- |
| `a79eaba` | Escape, defeat and charm end in the combat window like victory | 2 reuse (victory window) | +15        | 94.8  |
| (1b)      | Ended combat effects fade out; effect names translated         | 6 minimal new code       | +60        | 94.9  |

**1a notes**

- `CombatVictory` became `CombatEnding`: one window for every outcome the rules return
  (`victory`, `escaped`, `defeat`, `charmed`), same 2 s hold after the dice, Continue only
  when saving fails. Titles: `combat.outcome.*` (en: Victory! / Escaped / Defeated / Charmed;
  fr: Victoire ! / Fuite réussie / Défaite / Adversaire charmé — nouns, to avoid gendered
  participles). `combat.victory` moved into that group.
- **Design choice to review:** charm also moved into the window (the prompt named flee and
  defeat; the heading said "all combat endings").
- Classes renamed `combat-victory*` → `combat-ending*` (+ `data-outcome`).
- **Found: the French combat e2e was random.** Character stats and the dice seed come from
  `crypto.getRandomValues`; about half of the seeds I tried lose the first duel, which already
  failed the test before this change (it expects two victories). The test now pins both
  (`fixDice(page, 1)`), nothing else in it changed.
- Tests: new `combat-ending.test.ts` (5 cases, en/fr; fails on the previous GamePanel);
  new e2e "announces Defeated/Escaped in the combat window" (seeded). Updated assertions:
  `reader-request` French chapter — selector rename only, plus the fixed seed.

**1b notes**

- New `CombatEffects` (reader): one indicator per effect, keyed by ability. An effect that
  expires or is replaced stays for a 600 ms CSS fade (`aria-hidden`, removed on
  `animationend`); under reduced motion it is dropped at once (JS) and hidden (CSS).
- The indicator text was the raw English kind ("stun (1)"); it now goes through i18n
  (`combat.effect.*`: "Stunned (1)" / "Étourdissement (1)").
- Tests: `combat-effects.test.ts` (which effects ended; labels en/fr).
- **Not verified in a browser:** in Orée, only Dawnstroke applies an effect and no
  first-choice path learns it, so I could not reach a live effect (12 seeds tried). A fixture
  story with an effect ability would let an e2e check the fade.
