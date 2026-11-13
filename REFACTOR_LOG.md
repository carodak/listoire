# Refactor log

## ☀ Summary — Pass 16 (read this first)

Branch **`fix/small`**, nothing pushed, nothing on `main`. Details in "Pass 16" at the end.

| Item                                     | Status                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| 1. WebKit "chooses, reloads…"            | **Done** `30d3d89`: read-aloud off as asked, **and an app bug fixed**             |
| 2. Combat ending at 320 px               | **Done** `35cffdf`: 320–1280 px on all four browsers; 320 tested                  |
| 3. Dev server: outdated bundle in worker | **Not fixed**: mechanism found, trigger not reproduced; options logged            |
| End-of-session checks                    | Chromium 128 passed; unit 505 passed; coverage 59.79 / 66.57 / 76.04 %; health 93 |

- **Item 1:** turning read-aloud off was not enough (still 2 failures in 10 on WebKit). When
  narration ended early, `NarrationManager.play` left its background clip requests running, so
  they kept going after read-aloud was off and the reload cut one off. `play` now cancels them;
  a unit test covers it. WebKit, `--repeat-each=10`: 10/10. Narration across a reload:
  `narration.spec.ts` (en and fr) now reloads in the middle of a clip.
- **Item 2:** at 320 px the title is `min(15px, 4vw)` and the player's stat line may wrap
  between stats. It was wider than its column and pushed the player's portrait off centre;
  WebKit was the most affected. Screenshot: `review-screenshots/combat-ending-320.png`.

### ⚠ Needs you

- **Dev server (item 3):** pick an option in "Pass 16 › Item 3". `noDiscovery` is small, but
  unproven, since I could not make the break happen. Or next time start the server with
  `DEBUG=vite:deps` to catch the trigger.

## ☀ Summary — Pass 15 (previous session)

Branch **`fix/small`**, nothing pushed, nothing on `main`. Your uncommitted `AGENTS.md` change is
still uncommitted (yours). Details in "Pass 15" at the end of this file.

| Item                                     | Status                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| 1. Combat ending at every width          | **Done** `0d23426`: 360–1920 px on all four browsers; 1280/768 tested     |
| 2. WebKit "chooses, reloads…" page error | **Explained, not fixable in the app** `7dcac63`: see "Needs you"          |
| End-of-session checks                    | Chromium 128 passed (2.0 min); unit 504 passed; health 93; coverage below |

Coverage (statements / branches / functions): 59.77 / 66.54 / 76.04 % (end of Pass 14: 59.80 /
66.60 / 76.04 %; start of Pass 14: 59.44 / 66.14 / 75.25 %). There was no JS change since Pass 14
(item 1 is CSS and test widths), so I read the 4-statement difference as run-to-run timing.

### ⚠ Needs you

- **WebKit page error (item 2):** it is WebKit's own report of a narration request the reload cut
  off, and it comes only from the dev narration server (never sent outside development). The app
  already handles the rejection. Aborting the request first did not stop WebKit's report, so I
  changed nothing in the app. The test still fails on WebKit, 7 of 10 runs. Three test-side
  options are in "Pass 15"; pick one and I'll apply it.
- **320 px combat ending:** "Adversaire charmé" still overflows (91 px in an 86 px gap), and on
  WebKit every outcome is off-centre at 320 px. 320 px was not in your list, so I left it.
- **Dev server:** twice, after a while, the editor's Ink compiler worker got a 504 (outdated
  `inkjs` bundle) and every editor test failed. The cause isn't known (a Vitest run is not it).
  A restart and warm-up fixed it both times; `node_modules/.vite` holds stale `deps_temp_*`
  folders from 2026-11-12 and no `deps` folder.

## ☀ Summary — Pass 14 (previous session)

Branch **`fix/small`** (from `main`), nothing pushed, nothing on `main`. Your uncommitted
`AGENTS.md` change is still uncommitted (yours). Details in "Pass 14" at the end of this file.

| Item                                                | Status                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| 1. "Waits for Fight" starts from a save             | **Done** `e922f49` (Pass 13's WebKit timeout)                          |
| (your commit `3d49890`: AGENTS.md + item 2's start) | Kept; item 2 builds on it, the probe it added is deleted               |
| 2. Phone combat ending                              | **Done** `2ce064d`                                                     |
| 3. `docs/contributions.md` images wording           | **Done** `9dcacfb` (Pass 13's "sketch pack licence wording")           |
| Part 2: tidy the tests                              | **Done** `01b61bc`, `f952f43`, and the last commit (log, reader tests) |
| End-of-session checks                               | Done, results below                                                    |

### Part 2, before → after

|                                                   | Before (`9dcacfb`)                                                                                                                                                                                                                  | After                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Test files / code lines (cloc, `src` + `tests`)   | 95 / 12,174                                                                                                                                                                                                                         | **94 / 11,747** (−3.5 %)                                                                                                                                                                                                                               |
| E2e TypeScript, specs + helpers (cloc)            | 33 / 5,407                                                                                                                                                                                                                          | **31 / 5,061** (−6.4 %)                                                                                                                                                                                                                                |
| E2e spec files only (cloc)                        | 26 / 4,937                                                                                                                                                                                                                          | **23 / 4,490** (−9.1 %)                                                                                                                                                                                                                                |
| E2e tests per browser                             | 143                                                                                                                                                                                                                                 | **128**                                                                                                                                                                                                                                                |
| Chromium e2e, 4 workers                           | 2.4 min (147 s wall)                                                                                                                                                                                                                | **2.1 min (127 s wall)**                                                                                                                                                                                                                               |
| Coverage: statements / branches / functions       | 59.44 / 66.14 / 75.25 %                                                                                                                                                                                                             | **59.80 / 66.60 / 76.04 %**                                                                                                                                                                                                                            |
| `fallow dupes` groups in tests (default)          | 1 (6 lines)                                                                                                                                                                                                                         | **0**                                                                                                                                                                                                                                                  |
| `fallow dupes --mode weak --min-tokens 30`, tests | 5 groups, 63 lines                                                                                                                                                                                                                  | **1 group, 8 lines**                                                                                                                                                                                                                                   |
| Health `--coverage` (floor 92)                    | 93                                                                                                                                                                                                                                  | **93**                                                                                                                                                                                                                                                 |
| Largest test files                                | image-editor.spec 1,358; editor.spec 710; authoring.test 629; presentation-session.test 580; typography.spec 417; director.test 414; reader-pages.spec 382; typography.test 348; reader-combat.spec 327; narration-manager.test 308 | typography.spec 416; director.test 414; media-authoring.test 410; reader-combat.spec 349; typography.test 348; image-layers.spec 344; presentation-session.test 315; editor-workspace.spec 313; image-composition.spec 309; narration-manager.test 308 |

Coverage after was measured once the specs were final, except for the last change (two reader
tests split apart again), which can only add. The coverage runner lists the new specs that hold
the former list's tests. That set includes a few tests merged in, so it is slightly larger.

**Targets:** coverage not lower ✔, chromium time not higher ✔, fewer test dupes ✔, one obvious
file per feature ✔. **Not met: e2e code −25 %** (−6.4 % for all e2e code, −9.1 % for specs).
Most e2e tests are distinct journeys; merging them removed setup, not assertions, and I did not
drop behaviours to reach a number. **~400 lines:** three files are slightly over
(typography.spec 416, director.test 414, media-authoring.test 410); I left them.

### End of session

- Chromium: 127 passed. Firefox, WebKit, mobile: 360 passed, 20 skipped (reference images are
  Chromium-only), **1 failed**: WebKit, see below. Unit: 504 passed. Typecheck, lint, format,
  `fallow audit --base main` verdict `warn` before each commit (never `fail`).

### ⚠ Needs you

- **WebKit, intermittent (it predates this pass):** "chooses, reloads the resolved passage…"
  sometimes fails on WebKit because the page reports
  `…/api/narration due to access control checks.` after `page.reload()`. The unchanged
  pre-Part-2 test also fails, 1 run in 4. It looks like WebKit reporting the narration request
  that the reload cut short. The app's own fetch code catches its errors, so I did not change it.
  My merge with "resetting a paused story" made it fail more often (2 in 3), so I put both
  original tests back. Your call: accept, or ignore that one message on WebKit in this test.
- **The 25 % e2e target** would need deleting behaviours or turning e2e checks into unit tests.
  One candidate: the effects engine e2e test (92 lines) has unit tests with fake animations, but
  it checks real browser styles. Say if you want that.
- **Desktop and tablet combat ending** (you said desktop unchanged, so I left it). The longest
  outcomes are wider than the gap between the portraits, measured on Chromium:
  - 1280 px: gap 337, "Adversaire charmé" 381;
  - 800 px: gap 237, "Adversaire charmé" 295;
  - 600 px: gap 139, "Fuite réussie" 174;
  - 561 px: gap 120, "Victoire !" 133.

  One-line fix if you want it: give the desktop title the phone's
  `max-width: calc(50% - var(--combat-portrait-size) + 5px)` and `white-space: normal` (only
  labels that do not fit would wrap).

- **Dev server:** the first baseline run had 55 editor failures because Vite had re-optimised
  `inkjs` mid-session ("Ink compiler could not start"). A restart fixed it.

### What to look at

- `review-screenshots/combat-ending-360.png` and `…-412.png`: "Adversaire charmé" between
  the portraits on a phone.

## Pass 14 — small fixes, then tidy the tests (branch `fix/small`)

### Item 2 — phone combat ending

- State found: your commit `3d49890` holds the previous session's leftovers (phone rules for the
  ending, the no-break space, the probe). The no-break space in "Victoire !" is there (U+00A0).
- Measured at 360 and 412 px: the gap between the portraits is 100 px, the title was capped at
  104 px, so "Fuite réussie" and "Adversaire charmé" overlapped by 2 px a side. The cap is now
  the gap itself minus 4 px (`calc(50% - var(--combat-portrait-size) + 5px)`, percentages of the
  summary), so it follows the real gap, scrollbar or not. Desktop rules untouched.
- Test (`reader-combat.spec.ts`, "reduced motion keeps every combat step…"): with no animation the
  layout is still, so it now checks all eight outcomes (en + fr, read from `src/i18n/i18n.ts`) at
  412 and 360 px: centred, inside the gap, no word spilling. It failed on the old 104 px (both
  long French labels) and passes now on chromium, firefox, webkit and mobile (36/36 in the spec).
  The lenient "inside the gap if it fits" check of the animated test is unchanged.
- Screenshots ("Adversaire charmé", mobile project): `review-screenshots/combat-ending-360.png`
  and `review-screenshots/combat-ending-412.png`.
- The probe `tests/e2e/zz-ending.spec.ts` is deleted.
- Audit: verdict `warn`. Two CSS duplicate-block warnings at `reader.css` lines 570 and 1107 are
  marked "introduced" but those lines are identical to `HEAD` (fallow attributes them to the
  touched file); not changed.

### Item 3 — images wording in `docs/contributions.md`

- The sketch pack row and paragraph now say: temporary placeholders generated with ChatGPT
  (OpenAI), to be replaced by the author's own artwork before publication. Removed: "supplied by
  the project's author, who authorises their publication (catalogue `rights.userAuthorization`)"
  and "Attribution required: No" (now "—"). This answers Pass 13's "Sketch pack licence wording".
- `docs/ARCHITECTURE.md` said "the author's sketch pack"; now "the sketch pack (temporary ChatGPT
  placeholders)". The catalogue under `assets/` is unchanged (AGENTS.md: source libraries stay
  unchanged).

### Part 2 — tidy the tests

**Measured on the dev server warmed as AGENTS.md says.** The first baseline run had 55 editor
failures: Vite had re-optimised its dependencies mid-session and the editor's Ink compiler worker
still asked for the old `inkjs` bundle (504 "Outdated Optimize Dep", "Ink compiler could not
start"). Restarting and warming the server fixed it; nothing in the code was involved. If the
editor suddenly reports "Ink compiler could not start" during a session, restart the server.

**Deleted or merged e2e tests, and where each behaviour is still covered** (no assertion
removed unless listed as covered elsewhere):

| Former test (file)                                                       | Now                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| magnifier: pointer/touch coordinates, keys (`magnifier`)                 | Merged into `examination` "examination: under its image…" (all its checks)                                                                                                                                                |
| examination keyboard, turning, details, reload (`house`)                 | Same merged test                                                                                                                                                                                                          |
| examined image dimensions, zoom from centre, reverse (`reader-polish`)   | Same merged test                                                                                                                                                                                                          |
| Examine under its image, zoom, no Reset view (`reader-pages`)            | Same merged test; "no Turn over without a reverse" moved to the cropped-image test                                                                                                                                        |
| photograph magnification and focus after Escape (`editor`)               | Moved to `editor-media`. I first deleted it as covered by the examination test, but coverage showed it is the only covered test that draws a photograph hotspot, so it stays                                              |
| text complete on arrival; Show all text from the keyboard (`typewriter`) | Merged into `reading-preferences` "text display…" (default instant, Enter on Show all text)                                                                                                                               |
| text reaches its media before choices; toolbar follows (`reader-polish`) | Same merged test                                                                                                                                                                                                          |
| progressive text revealed, preferences persist (`house`)                 | Same merged test                                                                                                                                                                                                          |
| both side panels share one close control (`side-panels`)                 | Merged into `reading-preferences` "side panels take focus…"                                                                                                                                                               |
| character details and notes (`reader-data`)                              | Merged into `character` "character: starts collapsed…" (stats, inventory tabs, abilities, encounters, notes)                                                                                                              |
| English/French saves (`reader`) and progress/inventory/art (`house`)     | Merged into `reader-language` "English and French keep separate…"                                                                                                                                                         |
| resetting a paused story (`reader`)                                      | Kept separate: merged, it failed more often on WebKit (see "Needs you"), so both original tests stay as they were                                                                                                         |
| music and ambience really play (`audio-start`)                           | Merged into `audio` "Play starts audio in its click…" (same recorder, same page)                                                                                                                                          |
| typing recording tried once and paused (`welcome`)                       | Merged into `welcome` "blocked audio: the typing recording…" (its stub now records, as the other did)                                                                                                                     |
| the wordmark is not a button (`welcome`)                                 | Merged into the welcome test                                                                                                                                                                                              |
| authors a combat action, enables game mode (`image-editor`)              | Merged into `editor-workspace` "edits game rules, definitions and a combat action…" (Game Mode check added)                                                                                                               |
| the editor opens on the story's first passage (`editor-tabs`)            | Merged into `editor-workspace` "opens on the story's first passage; … ARIA tab pattern"                                                                                                                                   |
| start area holds Choose an image (`image-editor`)                        | **Deleted**: no image yet / + Add layer disabled / one Choose / no Choose after: `image-dialog` "a new image is one image"; + Add layer and Replace: `image-layers` "+ Add layer…"; start area gone: "ready-made scenes…" |
| no More options, each category its own section (`image-editor`)          | **Deleted**: section titles and order, all closed, "More options" absent, summaries "set: …": `image-dialog` "settings: folded sections…", "Interactivity…"                                                               |
| camera folded section + settings order (`image-editor`, two tests)       | Merged into `image-dialog` "settings: folded sections in order…"                                                                                                                                                          |
| ready-made scene names (`image-editor` "a new image…")                   | Moved to `image-dialog` "ready-made scenes are a closed toggle…" (the toggle's own test)                                                                                                                                  |

Moved unchanged (by feature): `page-frame` → `reader-layout`; reader layout tests from `reader`
and `reader-pages` → `reader-layout`; illustration and page-turn tests from `reader-pages`,
`reader` and `presentation` → `illustrations`; checks and dice from `reader-saves` and
`reader-pages` → `dice`; device voice from `presentation` and narrated typing from
`reader-pages` → `narration`; notes rejection, eyedropper, icons, portrait colour → `character`
/ `reading-preferences`; fixture-story tests → `examination` and `reader-combat`; `react-bits` →
`effects`; `editor` → `editor-project`, `editor-workspace`, `editor-media`, `editor-narration`;
`image-editor` → `image-dialog`, `image-layers`, `image-composition`, `image-references` (its
snapshot folder moved with it); `game-authoring` → `editor-workspace` / `editor-narration`.

**Changed assertions:** none weakened. Three became stricter or wider: the phone outcome check
(item 2); "ready-made scenes" now names three scenes; the incompatible-save test finds the save
by the bundle's key instead of a regular expression over all keys (same key).

**Shared helpers, one per feature:** `oree.ts` (reader: open Orée, change a bundle, language,
save before the first fight — `oree-saves.ts` merged in), `editor.ts` (find in Ink, backup,
import, caret, script, house project), `image-editor.ts` (Image dialog), `idb.ts` (IndexedDB
reads, writes, clear — replaces `editor-db.ts` and five inline copies), `speech.ts`,
`typography-story.ts`, `fixture-story.ts`. Outside tests: `memorySaveStore()` in
`save-manager.ts` (`01b61bc`), and `tools/measure-performance.ts` imports `caretTo`.

**Unit files over 400 lines split by area:** `authoring.test.ts` (629) → script authoring (241)

- `media-authoring.test.ts` (410); `presentation-session.test.ts` (580) → visuals (306) +
  `presentation-sound.test.ts` (276). Same 504 unit tests.

**One commit for items 1–4** (not one per item): merging, moving, renaming and the helpers touch
the same lines of the same files; separate commits would each have needed an intermediate
version of every file.

## Pass 15 — combat ending everywhere, WebKit narration error (branch `fix/small`)

### Item 1 — desktop and tablet combat ending

- The gap-based `max-width` (and wrapping) now applies at every width, as proposed. Alone it was
  not enough just above the phone breakpoint: at 561–600 px the portraits keep their full size
  and one word of the 22 px title ("Adversaire", 138 px) is wider than the gap (120–139 px). The
  compact title (15 px, small padding) now applies up to 640 px instead of 560 px; the portrait
  shrink in the same rule changes nothing above ~540 px (its formula only bites below).
- Measured with a temporary sweep (deleted), all eight outcomes, centred, inside the gap, no
  word spilling: 360–1920 px on Chromium, Firefox, WebKit and mobile, heights 640–1200. **320 px
  still fails** ("Adversaire" is 91 px in an 86 px gap; on WebKit at 320 every label is
  off-centre, a separate layout issue at that width). 320 was not in your list; left as is.
- `reader-combat.spec.ts` checks 1280, 768, 412 and 360 px (helper `outcomesFit`). It failed on
  the previous CSS at 1280 ("Adversaire charmé") and passes on all four browsers (40/40).

### Item 2 — WebKit "chooses, reloads the resolved passage…": what the error is

**Not fixed: no app change can fix it.** The test is unchanged and still fails on WebKit,
**7 of 10** runs with `--repeat-each=10`. What I found, with a temporary probe (deleted):

- Orée reads aloud by default, so the reader asks the dev narration server (`/api/narration`)
  for each paragraph; on the test server it answers 502 within milliseconds. When the test
  reloads, one or two of these requests are still in flight.
- WebKit's order on reload: `beforeunload` → it cancels the pending requests ("Load request
  cancelled"; the fetch rejects with `TypeError: Load failed`) → `pagehide` → `unload`. It then
  logs `Fetch API cannot load …/api/narration due to access control checks.` with the fetch's
  stack (`sameOriginFetch` ← `requestLocalNarration` ← `findRecording`). Playwright reports
  WebKit's log line as a page error. In the app the rejection is handled:
  `requestLocalNarration` catches it and returns `null`. It is not an uncaught exception.
- I tried making the app abort its own narration requests first, on `beforeunload`. The fetches
  then end as an expected `AbortError` (`aborted=true`) before WebKit cancels them, but **WebKit
  still logs the same line**: it reports any request pending while the document unloads,
  whoever aborted it. On `pagehide` it is too late anyway (it fires after the cancellation). I
  removed that code, since it changed nothing observable and would have interfered with the
  editor's unsaved-changes prompt (also on `beforeunload`).
- `keepalive` requests survive unload, but they are limited to 64 KB. A custom voice profile
  carries its reference recording as base64 (up to 5 MB), and stale requests would hold up the
  one-clip-at-a-time local generator after the reload. I did not use it.
- **Scope:** `requestLocalNarration` returns `null` at once outside development
  (`import.meta.env.DEV`). This request, and so this error, exists only on the dev server and
  in e2e; published readers never send it.

**Options (yours to choose; each changes the e2e test, which you asked to keep unchanged):**

1. In this test, ignore that one WebKit message (`/api\/narration due to access control checks/`)
   in its page-error list. One line, and it still catches every other error.
2. In this test, wait until no narration request is pending before `page.reload()`, e.g.
   `await page.waitForLoadState("networkidle")`, so nothing is in flight.
3. Turn read-aloud off before the reload, as `enterReader` does.

## Pass 16 — WebKit reload test, combat ending at 320 px, dev server (branch `fix/small`)

### Item 1 — WebKit "chooses, reloads…": read-aloud off, and the bug it uncovered

- Option 3 as asked: the test turns read-aloud off once the first page shows, as `enterReader`
  does. Turning it off right after Play is not enough: the story's own defaults (read-aloud on)
  are applied when it loads, over the change.
- **That alone still failed 2 of 10 on WebKit**, and a probe showed why: **an app bug.** Narration
  asks the local generator for the page's clips one after another, in the background. When
  playback ended early (here: the first paragraph has no clip, the generator is down),
  `NarrationManager.play` dropped its scope without aborting it. So the background queue kept
  asking for every remaining paragraph, even after read-aloud was turned off (`stop()` no longer
  reached it). The reload cut the last of these requests off, and WebKit reported it.
  **Fix:** `play` aborts its scope when it returns (one line, `narration-manager.ts`). New unit
  test in `narration-manager.test.ts`, "stops asking for the page's clips once narration has
  ended, even early": it failed before the fix (paragraphs two and three were still requested)
  and passes now.
- **Proof:** `--repeat-each=10` on WebKit: 10 of 10 pass (it failed 7 of 10 before).
- **Narration across a reload is covered by** `narration.spec.ts`, "generated en narration uses
  verified MP3s and responds to playback controls" and its "fr" twin. Until now no spec
  reloaded with the voice on, so I added the step there: a reload in the middle of a clip. The
  restored page stays silent until the reader replays it (by design, a restored page does not
  start narration on its own), then the voice, still on, narrates again. The unit test above
  covers the requests a stopped narration must not make. Both narration and reader specs: 52/52
  on four browsers.

### Item 2 — combat ending at 320 px

- Two causes, both inside the existing narrow-window rule (≤ 640 px), so desktop is unchanged:
  - "Adversaire" at 15 px (79 px) was wider than the title's 68 px of text room. The title is now
    `min(15px, 4vw)`: 15 px from 375 px up, 12.8 px at 320.
  - The player's stat line ("STR 18 / DEX 18 / WIL 18", `nowrap`) was wider than its 118 px
    column (122 px on Chromium, 128 on WebKit). It widened the player's whole column box, so its
    portrait was not centred in the column, and the gap's middle moved: on WebKit enough to put
    every outcome off centre. The line may now wrap there, between stats only (a no-break space
    joins each attribute to its value, `CombatControls.tsx`).
- Measured (temporary sweep, deleted): all eight outcomes centred, inside the gap, no word
  spilling, at 320, 340, 360, 375, 412, 500, 600, 640, 641, 768 and 1280 px on Chromium,
  Firefox, WebKit and mobile.
- `reader-combat.spec.ts` checks 1280, 768, 412, 360 and **320** px. On the previous code it
  fails at 320 (Chromium: "Adversaire charmé"; WebKit: every outcome); now 40/40 on four
  browsers. Screenshot: `review-screenshots/combat-ending-320.png`.

### Item 3 — dev server: the editor's compiler worker asks for an outdated bundle

**Not fixed: cause partly found, options below.** What I established (Vite 8.3.5,
`DEBUG=vite:deps`, temporary probes):

- **How the worker is loaded.** `compile-client.ts` starts
  `new Worker(new URL("./compiler.worker.ts", import.meta.url), { type: "module" })`; the worker
  imports `compiler.ts`, which imports `inkjs/full`. `vite.config.ts` pre-bundles `inkjs/full`
  and `ogl` (`optimizeDeps.include`) because the startup scan cannot see them. Vite serves a
  pre-bundled dependency as `/node_modules/.vite/deps/inkjs_full.js?v=<hash>` and writes that
  URL into the modules that import it.
- **The symptom, seen twice.** After a while, the server still served `compiler.ts` importing
  `inkjs_full.js?v=<old hash>`, and that URL answered **504** (Vite's "outdated optimized
  dependency"). The worker failed to load ("Ink compiler could not start") and every editor
  test failed. Pages are reloaded by Vite when its bundles change, but the worker's module
  kept the old URL. A restart and warm-up fixed it both times.
- **What would change the hash:** a re-bundle by the running server that changes existing
  bundles. Two were started this morning and never finished (`node_modules/.vite/deps_temp_*`
  from 08:53 and 08:55, around this morning's break).
- **Ruled out** (each tried on the warm server, the editor still compiling afterwards):
  - a Vitest run;
  - a second Vite server on another port, even though it rewrites the shared
    `node_modules/.vite/deps` folder ("Re-optimizing dependencies because vite config has
    changed", "removing old cache dir"; that is also why the folder was missing earlier);
  - a dependency discovered at runtime (`react-dom/server`): Vite re-bundled, but "optimized
    dependencies unchanged", so nothing went stale.
- **Not found:** what made the server re-bundle with changed files. Every bare import in
  the lazily loaded code (react-bits effects, dice, editor) is already in the startup scan.

**Options (your call, none applied):**

1. `optimizeDeps: { noDiscovery: true, include: [the 10 dependencies the scan finds] }`. A
   running server then never re-bundles, so the worker's URL cannot go stale. Cost: a new
   dependency must be added to the list, or dev fails loudly on it. Small, but I could not show
   it fixes the break because I could not trigger the break.
2. If it happens again: start the server with `DEBUG=vite:deps` (PowerShell:
   `$env:DEBUG = "vite:deps"`) and look for "new dependencies found" / "optimized dependencies
   changed" just before the first editor failure. That names the trigger, and option 1 or a
   one-line `include` then fixes it for sure.
3. Meanwhile: restart and warm the server (editor page until "No reported issues") when the
   editor reports "Ink compiler could not start", and run no second Vite server on this folder.
