# Refactor log

## ☀ Summary — Pass 7 (read this first)

Branch `features/reader-combat-editor`, 13 commits on top of `ddeb027` (nothing pushed, nothing
on `main`). **All items (1a–d, 2–6) are done**, plus the approved test-only fixture story. Two
things need you (⚠).

|                                         | Start (`ddeb027`) | Now (`c19d209`)               |
| --------------------------------------- | ----------------- | ----------------------------- |
| Health (`--score --hotspots`), floor 92 | 92.5              | **92.2**                      |
| Production TS LOC (src + tools)         | 21,023            | 21,354 (+331)                 |
| Unit tests                              | 414               | **423** (+ 1 Python test)     |
| E2E, chromium (fresh server)            | 85/85             | **102/102 green** (+17 tests) |
| `fallow security`                       | 10                | 10 (same findings)            |

### What was done

- **Fixture story** `cc26d73`: compiled inside the test, served to that page only; restores the
  photograph-discovery test and adds a browser test for the effect fade.
- **1a** `0cb39c9`: Back after a fight or reward restored the page with post-fight HP/XP/items
  (history saved the page as it was _left_). Now it keeps the page as it was reached. Test first.
- **1b** `b1f3b75`: **measured** with your local generator — after a page turn during a
  generation, the new page's requests got **429 after 2 s** and the page stayed silent. Server now
  queues, answers cached clips at once and drops abandoned requests; the reader asks for the whole
  page in order; "Preparing narration…" while a paragraph generates. Earlier audio fixes confirmed
  in the browser (unlock in reader and editor, sound effects, music, a 7 s download).
- **1c** `3bf07d9`: the flash covered only the page below the menu; now the whole view, with an
  even wash. **1d** `bb393f6`: shake ≈ 9 px instead of 1.7 px, over 600 ms; none under reduced motion.
- **2** `8407bde` + `920053e`: compact reward cards (your reference image) instead of the blocking
  item/ability window; far right on wide screens, over the menu's title row on narrow screens and
  mobile; 10 s bar, pause on hover/focus, ×, translated, `role="status"`.
- **3** `5144b5c` + `322663d`: "The Care of Ysée" / « Les soins d'Ysée » is a new Orée page
  (en + fr) after the guardian fight, with "+N HP" as a notification. Old saves keep loading
  (see ⚠ below for how).
- **4** `a5d0ee2`: one combat window from first turn to the end; two beats per turn (your blow,
  1 s, the enemy's), item/ability popup inside the window, fixed-height log, the outcome between
  the portraits, the defeated side fades, the window fades out.
- **5** `9266bf8`: your two PNG icons in the toolbar, tinted with the text colour (CSS mask).
- **6** `c19d209`: fixed frame above 760 px; only the text scrolls; side art stays; mobile keeps
  page scroll.

### ⚠ Needs you

- **Restart your narration server** (`narration.py serve`, still running the old code since
  7:37 PM) to get the 1b server fix. Then re-run the timing probe:
  `npx playwright test -c review-screenshots/probe.config.ts` (`FAST=1` for quick page turns).
  The two new "soins" paragraphs have no published clip yet (`narration.py prepare` would
  generate them; I didn't load a second model beside yours).
- **Story updates and saves:** any Ink edit used to make every save "another story version".
  I added an optional, author-declared `compatibleInkDigests` (earlier digests of the same
  release whose saves still load if they restore exactly at their page). Orée lists its previous
  en/fr build. Please confirm you're happy with this rule (documented in `DATA_CONTRACTS.md`).

### Design choices to review

- Rewards: no stack existed in the code — the old reward was a modal; I built the stack and
  removed that modal. Narrow screens/mobile: one card at a time over the menu's title row (the
  only place that never covers text); the others count down unseen.
- A reward choice now continues the story immediately (no "Continue reading" stop).
- Abilities use the same in-window popup as items (one code path).
- The combat outcome is centred between the portraits on a paper pill (a 3-column layout
  clipped the player on mobile); on phones it overlaps the portraits' edges slightly.
- Icons are PNG (237 KB and 497 KB for 24 px icons): a small export or SVG would load faster.
- Fixed frame only above 760 px; phones keep normal page scroll (reasons in the task 6 note).

### Screenshots and recordings (untracked, `review-screenshots/p7-before|p7-after/`)

- `flash-*`, `shake-*`, `effects-*.webm` (1c/1d) · `toolbar-*`, `page-*` (5, three themes)
- `reward-*.png/.webm` (2) · `care-*` (3) · `duel-*.png`, `duel-*.webm` (4) · `frame-*.png/.webm` (6)
- Specs to re-run them: `effects`, `shots` (SCENES=page), `rewards`, `care`, `combat`, `frame`
  in `review-screenshots/` with `-c review-screenshots/shots.config.ts` (server on 4175).

### How to try it

`npm run dev`, then in the reader:

- **Back after a fight:** win the duel with Ysée, continue, press Back: HP/XP are as before the fight.
- **Narration:** restart `narration.py serve`, turn pages quickly: each page narrates; while a
  paragraph generates, the toolbar shows "Preparing narration…".
- **Flash/shake:** page "A coin suspended in the air" (flash, menu included); page "The watch
  without a spring" (shake).
- **Rewards:** accept Nour's letter: a card at the far right (or over the title on a narrow window).
- **Event page:** after the guardian, "Let Ysée tend your injuries" → "The Care of Ysée" + "+N HP".
- **Combat:** the training duel: Use an item (popup, Escape), attack (two beats), win (outcome
  between portraits, fade-out).
- **Fixed page:** a long page on a desktop window: scroll — the menu and Nour's portrait stay.
- E2E: keep one dev server on 4175 and warm it first (a cold server fails its first test).

### Skipped / next steps

- Prefetching the _next_ page's narration (unknown until the reader chooses).
- The 15 s no-progress narration limit has unit tests only (a browser stall can't be produced
  reliably).
- Editor Text UX and Media → Image UX remain for a later session.

## ☀ Summary — Pass 6 (previous session)

Branch `features/reader-combat-editor`, 22 commits on top of `8a78885` (nothing pushed, nothing
on `main`). **Tasks 1–4 are done.** Two items need a decision from you (marked ⚠ below).

|                                        | Start (`8a78885`)       | Now (`bff1b07`)                                 |
| -------------------------------------- | ----------------------- | ----------------------------------------------- |
| Health score (`--score --hotspots`)    | 94.8                    | **92.5** ⚠ (95.0 without the one churn hotspot) |
| Production LOC (src + tools, no tests) | 20,712                  | 21,023 (+311)                                   |
| Unit tests                             | 397                     | **414**                                         |
| E2E, chromium                          | 79, 18 outdated failing | **85/85 green** (fresh server, port 4175)       |
| `fallow security`                      | 10                      | 10 (no new candidate)                           |

### What was done

1. **Combat** — `a79eaba` escape, defeat (and charm) end in the combat window like victory
   (translated title, last log line, auto-continue, Continue only if saving fails); same code
   path. `9ff0ded` an effect that expires or is replaced fades out (600 ms, none under reduced
   motion); effect names now translated (they were raw English "stun (1)").
   **1c** — design note `a03b7a0`, implementation **`41bc1c0` (revert this one commit to drop
   it)**: in instant text, inline/wide/right media start their entrance, cues and `durationMs`
   when they scroll into view (IntersectionObserver). Before: a below-the-fold illustration was
   already 4 s into its animation when first seen; after: it starts on scroll.
2. **E2E** — all 18 approved tests retargeted at Orée by passage ID (`data-passage` /
   `data-segment` added to the page), fixtures by route interception (Nour's examination gets a
   reverse side; the narration endpoint answers with a real MP3 + digest). Found and fixed a real
   bug on the way: at 320px the language chevron made the page scroll sideways (`e7dcf3c`).
   Also found: the French combat e2e was random (lost the duel on ~half the seeds); dice are now
   seeded in that test.
3. **Audio** — root cause of narration stopping (`18a938d`): a fixed 4 s start timer and a
   wall-clock deadline fixed at start (slow start, slowed voice or buffering → "timeout"), plus
   5 s to download clips up to 10 MB. Now one watchdog gives up only when playback makes no
   progress for 15 s; the download allowance grows with the clip. REVIEW #9 (`743031b`): skipping
   a cinematic no longer drops delayed images or their expiry. `0c2cd0d`: sound is on by default
   and audio is unlocked inside the first click/key press (Play, or the editor).
4. **Visual** — `f83591c` branching lightning (jagged channel + forks, accent glow, light
   falloff, multi-strike flicker) for light-flicker and spell effects; `4aa2936` new home and
   My Character icons in `ToolbarGlyph`; `a631fd3` + `bff1b07` portraits (My Character, combat) use the same
   theme blend as illustrations, live with the page colour; their URLs go through the
   presentation session (REVIEW #6).

### ⚠ Needs your decision

- **Health 92.5 < 94.8.** Only the hotspot penalty changed: Fallow counts files whose
  churn × complexity score is ≥ 50, and `scene-playback.ts` crossed it (56) because 1c and #9
  both changed it this pass. Every other penalty is at or below its starting value. Options and
  what I tried are in "Task 3 — Audio" below. I did not add an exclusion or pad the file.
- **Photograph hotspot discovery is no longer covered by e2e** (Orée has no discoverable detail;
  it needs an Ink action). Author one in Orée, or approve a small e2e-only fixture story.

### Design choices to review

- Charm also ends in the combat window ("Charmed" / "Adversaire charmé"). French titles are
  nouns ("Fuite réussie", "Défaite") to avoid gendered participles.
- 1c applies only to instant text, not to fullscreen/background media or restored pages;
  `show.delay` stays ignored in instant mode, `durationMs` counts from entry.
- Sound on by default: changed the app default **and Orée's en/fr reading defaults** (data);
  the editor's "Sound enabled by default" remains the author's switch. The AudioContext unlock
  is real but story audio plays through `HTMLAudioElement`, so **iOS Safari was not verified**.
- Lightning glow uses the page accent so it reads on light paper; on a light page a light bolt
  is naturally subtler than on dark pages.
- Portraits on dark pages are ink-inverted exactly like the story illustrations (sketch art
  reads as light lines); full-colour art would be inverted too.
- Items have no images in this app: their "icons" are text glyphs drawn in the theme's text
  colour, so they already follow the theme (checked on the screenshots; no change).

### Screenshots (untracked, `review-screenshots/`)

`before/` and `after/`, themes light (#faf8f2), paper (#f5ead7) and dark (#222b31), desktop and
mobile, motion on:

- `page-*`, `toolbar-*` (after only, close-up) — icons.
- `character-*`, `combat-*` — portraits and theme (compare the `dark` ones).
- `flicker-500ms-*`, `flicker-1000ms-*` — lightning on page "preuve".
- **`after/combat-hit-{100,250,400}ms-*`** — the claw slash + red flash, frozen at fixed times.
- `1c-above-fold.png`, `1c-scrolled.png`, `1c-scroll.webm` — scroll-driven media, before/after.
- Re-run: `SHOTS=after SCENES=page,character,flicker,combat npx playwright test -c review-screenshots/shots.config.ts shots.spec.ts`
  (needs a dev server on 4175).

### How to try it

`npm run dev`, then:

- **Combat endings:** play to the duel with Ysée (page "duel"); press Flee, or lose: the window
  says "Escaped"/"Defeated" with the last line, then the story continues.
- **Effect fade:** an ability that stuns (Dawnstroke, later in Orée): when the stun ends, its
  indicator fades out.
- **Scroll-driven media:** narrow the window so the first illustration is below the fold, Replay
  page, wait, then scroll: its camera move starts as it appears.
- **Audio:** fresh profile → Play: sound effects and music play without opening the settings.
  Narration: throttle the network (DevTools "Slow 3G") — it now starts late instead of failing.
- **Lightning:** page "A coin suspended in the air" (after accepting the letter), any page colour.
- **Icons / theme:** Reading preferences → page colour dark, then open My Character and a combat.
- E2E: `npx playwright test -c playwright.local.config.ts --project=chromium` (warm the server
  once first; a fresh Vite server needs ~60 s for its first page).

### Skipped / next steps

- Editor Text UX and Media → Image UX (parts 4–5): not started, as agreed.
- Fade-out of combat effects is not e2e-tested (no Orée path reaches an effect on first choices).
- Possible follow-ups: an e2e fixture story with a hotspot and an effect ability; decide the
  `scene-playback.ts` split; dead CSS rule `.reader.text-large .prose { font-size: 22px }`.

## ☀ Summary — Pass 5 (previous session)

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

| Commit    | Item                                                                         | Ponytail step                                             | Prod LOC Δ | Score |
| --------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- | ---------- | ----- |
| `a79eaba` | Escape, defeat and charm end in the combat window like victory               | 2 reuse (victory window)                                  | +15        | 94.8  |
| `9ff0ded` | Ended combat effects fade out; effect names translated                       | 6 minimal new code                                        | +60        | 94.9  |
| `a03b7a0` | 1c design note                                                               | —                                                         | 0          | 94.9  |
| `41bc1c0` | Instant text: in-flow media start on scroll entry (revert this commit alone) | 3 platform (IntersectionObserver) + 2 reuse (queueTarget) | +37        | 94.9  |

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

### 1c — Design note: scroll-driven media entrances (instant text)

**How it works today.** On each page `PresentationSession.start` schedules every media block:
`show.kind` page/delay → `showMedia(id, show.delayMs)` on the presentation clock; segment →
when the typewriter or the narration reaches that segment. In instant text mode (the default),
`revealAll` is true, so `mediaIsVisible` ignores `show` and every image is visible at once.
When a media component mounts, `ScenePlayback.bind` → `queueTarget(id)` (once its images have
loaded) starts everything tied to that block: its `block`-triggered events (entrance effect
such as `cinematic-camera`, sound cues, with their `delayMs`), its video, and its `durationMs`
expiry timer. So in instant mode an illustration below the fold plays its entrance while the
reader is still reading the text above it, and has often finished by the time it is seen.

**Proposed.** Same page layout; the reader scrolls. In instant mode (`revealAll`, not a restored
page), an in-flow media block (`inline`, `wide`, `right`) starts when it scrolls into view: one
`IntersectionObserver` per bound block (root = viewport, threshold 0, disconnected after the
first entry) marks it entered and calls the existing `queueTarget`. Until then `queueTarget`
and `effectReady` treat the block as not ready, so passage/segment events that target it wait
too. Nothing else changes: same effects engine, same clock, same events.

- `show.delay` / `show.segment`: still ignored in instant mode (as today); scroll entry replaces
  them as the trigger. In typewriter mode they keep driving visibility, unchanged.
- `durationMs`: its timer starts on entry instead of on page load, so the reader sees the image
  for its authored duration.
- Event `delayMs` (cue timing) is kept, counted from entry.
- Not affected: `fullscreen` (ordered blocking cinematic dialog) and `background` blocks, restored
  pages (no entrance today either), page/scene effects, typewriter mode.
- Mobile: single column, the page scrolls; the observer uses the viewport, so window and nested
  scrolling both work. A media block already in view on load starts at once, as today.
- Reduced motion: unchanged: media shown immediately without animation (the effects engine
  already resolves effects instantly); its cues still wait for entry.
- No `IntersectionObserver` (old browser, unit tests): treated as entered immediately = today.

**Risks.**

- An entrance effect whose first keyframe differs from the resting image (e.g. a fade-in) shows
  the resting image at the viewport edge for a moment before it starts. Orée only uses
  `cinematic-camera`, which starts near rest. Follow-up if needed: hold awaiting media at their
  first keyframe.
- A block the reader never scrolls to never plays its cues (intended), and a blocking event on an
  in-flow block would wait for it (only fullscreen blocks are blocking in Orée and the editor).
- Re-binding: replay and page changes must re-bind media (they do: `useLayoutEffect` keyed on
  page/block); the existing "plays instant-text illustrations from the beginning" e2e covers it.

No decision needed from you to build it: fullscreen/cinematic media are excluded, so it does not
conflict with them.

**1c result**

- Implemented as designed in `ScenePlayback` (`awaitsEntry` / `observeEntry`, one observer per
  bound in-flow media block, gate in `queueTarget`, `effectReady` and `resume`).
- Measured (1280×340 viewport, first page, layered illustration below the fold, 4 s wait, then
  scroll to it): **before** its animation was already 3,983 ms in when it came into view;
  **after** no animation runs until the scroll, and it is 267 ms in 300 ms after.
- Screenshots and recording (untracked): `review-screenshots/before|after/1c-above-fold.png`,
  `1c-scrolled.png`, `1c-scroll.webm`. Scripts: `review-screenshots/scroll.spec.ts`
  (`SHOTS=after npx playwright test -c review-screenshots/shots.config.ts scroll.spec.ts --project=desktop`).
- New e2e "starts an instant-text illustration below the fold only when it scrolls into view"
  (fails before: 2 animations already running). Existing instant-text and fullscreen-cinematic
  tests still pass (chromium and mobile).
- Found while testing (fail without this change, triaged in task 2): `image-composition`
  :91 and :168, `reader-request` "updates an old active Orée draft".

### Task 2 — the 18 outdated e2e tests: done, chromium suite 82/82 green

| Commit    | Spec                                     | What changed                                                                                                                                                                                                                                                                                                                                  |
| --------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e8ac5fd` | `house` ×5 + `tests/e2e/oree.ts`         | Orée by passage ID (`data-passage`, `data-segment` added to the page); Nour's examination with a route fixture adding a reverse side; per-locale saves and inventory with the letter item; sound cue on page "atelier"; first-page requests checked against the assets that page references (computed from the bundle, not a hard-coded list) |
| `e7dcf3c` | (app fix found by `reader` :124)         | at 320px the language chevron overflowed and the page scrolled sideways; the title now ellipsizes first                                                                                                                                                                                                                                       |
| `89196d5` | `reader` ×9                              | first choice + passage IDs; titles read from the published bundle; layout checks follow `.reader-toolbar` / `.reader-board`; incompatible-save test finds the `save:<checkpoint>:en` key                                                                                                                                                      |
| `56f64f2` | `character`, `magnifier`, `narration` ×2 | encounters unlock on Nour's page; Orée narrates live (`ai-live`), so the test answers `/api/narration` with a real MP3 and its SHA-256 (the app's digest check still runs)                                                                                                                                                                    |
| `c119de9` | `media-workspace`                        | duplicates the forest starter's current character asset                                                                                                                                                                                                                                                                                       |
| `fd4d433` | `reader-polish` ×2                       | progressive text turned on first; reverse side via the fixture (simple, so no separate fixture story)                                                                                                                                                                                                                                         |

Assertions changed because the app changed on purpose (all in `9f1afcd` or this branch), logged:

- "Reset view" no longer exists: turning the image over resets the view, so the tests turn it back
  and check the lens is gone.
- "Replay voice" no longer exists in the reader: "Replay page" restarts the voice.
- Large text is 25px (a later CSS rule overrides the old 22px one, which is now dead CSS).
- The toolbar is 72px tall (was < 70); the reader page uses the story's page color `#f5ead7`.
- Encounters show name + description directly (no focus-to-reveal).
- `.eyebrow`, `.site-header`, `.reader-shell` no longer exist; equivalent layout checks kept.
- The text column check became "> 40% of the board and ≤ 800px" (was "< 55% of the canvas";
  the board is narrower than the old canvas, the column is the same 768px).

**Not covered any more (needs you):** photograph **hotspot discovery** (inspect a detail → a
hidden story action → an inventory clue that survives reload). Orée has no discoverable hotspot
and adding one needs an Ink action, not a simple route fixture. Options: author one in Orée, or a
small fixture story served only to e2e.

**Found: an earlier failing run was the dev server, not the app.** After I swapped source files
with `git stash` during a run, Vite kept serving "Failed to fetch dynamically imported module
EditorRoute.tsx" and 24 editor/typography/image tests failed. A restarted server passes them all.
A fresh server also needs one warm-up page load (~60 s) or the first test times out.

### Task 3 — Audio

| Commit    | Item                                          | Ponytail step                                      | Prod LOC Δ |
| --------- | --------------------------------------------- | -------------------------------------------------- | ---------- |
| `18a938d` | Narration stops/never starts (REVIEW #13)     | 1 delete (fixed timers) + 6 minimal (one watchdog) | +5         |
| `743031b` | Skip cinematic drops image timers (REVIEW #9) | 6 minimal (second clock)                           | +6         |
| `0c2cd0d` | Audio on from the first gesture               | 3 platform (AudioContext) + data default           | +14        |

**Root cause of "narration sometimes starts, sometimes stops":** every `PlayingTrack` had
(1) a fixed 4 s timer racing `play()`: on a slow start the track was settled as `timeout` and
paused just as it began; (2) a wall-clock deadline fixed at start (`clip / rate + 5 s`): slowing
the voice mid-clip, or a buffering pause, cut it off before the end; (3) clips had 5 s in total
to download (up to 10 MB). Fix: one watchdog that gives up only when the media position stops
moving for 15 s (paused time excluded); `maxMs` deleted; the download allowance is
`10 s + clip duration`. Tests that failed before: slow start, a 200 s track still advancing,
stall-but-not-while-paused (`audio-manager.test.ts`), 60 s clip download allowance
(`narration-clips.test.ts`). Updated assertion: the existing "never-starting playback" test
now waits 15 s instead of 4 s (intended change).

**REVIEW #9:** image show/expiry timers moved to their own clock that `skipCinematic` leaves alone;
new test "still shows and expires delayed images after a cinematic is skipped" (failed before).

**Audio initialization — design choices to review:**

- The app had no AudioContext (all story audio is `HTMLAudioElement` + `speechSynthesis`).
  `unlockAudio()` creates/resumes one inside the first click/key press of the page (installed in
  `main.tsx`), which covers "Play an existing story" (mouse or Enter) and the editor (the landing's
  editor link is a full page load, so its click can't carry over; the editor's first click does).
  In Chromium/Firefox the gesture itself already allows `HTMLAudioElement.play()`; **on iOS Safari
  per-element unlocking is not guaranteed by this and was not tested on a device.**
- What actually kept sound off was data: `sound: false` in the app default and in Orée's en/fr
  reading defaults (the editor preview uses the same). Both are now `true`; a reader's saved
  choice still wins. Existing editor drafts in IndexedDB keep their old default.
- New e2e `audio-start.spec`: Play creates and resumes a context during the click, "Story sound
  effects" is on, the page-4 sound effect plays without touching settings; the editor starts audio
  on its first click. Full chromium suite: 84/84 (incl. the blocked-audio tests).

**Health score — needs your decision:** 95.0 → **91.6** after `743031b`. Not code quality:
Fallow's hotspot penalty counts files with a hotspot score ≥ 50 (churn × complexity, 6 months).
`scene-playback.ts` reached 56.3 because three requested changes touched it this pass (1c, #9;
it already had 3 commits). One hotspot = `1 / ceil(273 × 1%) × 10` = 3.3 points; every other
penalty is unchanged. I tried moving its stateless rules to a helper file: 55.2 and coupling
+0.2, so I reverted it. Options: (a) accept until the churn ages out; (b) split `ScenePlayback`
(media timers / scroll gate / effect dispatch) as a planned refactor — note this would stop 1c
from reverting on its own; (c) a Fallow hotspot exclusion for that file (I did not add one).

### Task 4 — Visual

| Commit    | Item                                                     | Ponytail step                                                      | Prod LOC Δ |
| --------- | -------------------------------------------------------- | ------------------------------------------------------------------ | ---------- |
| `f83591c` | Lightning and spell effects                              | 2 reuse (effects overlay, combat/spell feedback) + 6 one generator | +95        |
| `4aa2936` | Home and My Character icons                              | 2 reuse (`ToolbarGlyph`)                                           | +8         |
| `a631fd3` | Portraits follow the reading theme; URLs via the session | 2 reuse (`--illustration-mix`/`--ink-filter`, `useAssetSource`)    | +10        |

- **Lightning:** `lightning.ts` builds one SVG per strike: midpoint-displaced main channel
  (jagged at every scale) with 2–3 forks, each drawn as a wide accent-tinted glow stroke under a
  bright core (no full-screen blur), over a radial light falloff centred where it lands. CSS gives
  a strike and fading return strokes. Used by `light-flicker` (its flicker keyframes now strike
  several times), spell casts in combat and spell checks; the old flat `clip-path` zigzag and its
  `spell-arc` keyframes are deleted. Reduced motion: never created (engine) and hidden (CSS).
  Tests: shape is deterministic per seed, forks start on the channel, stays in the viewport.
- **Icons:** `home` (house with eaves, chimney, arched door) and new `character` (head, cloak,
  clasped collar) in `ToolbarGlyph`; the character tab used a one-off inline SVG before.
- **Theme:** `.themed-art` in `app.css` (portrait in My Character, both combat portraits) applies
  `mix-blend-mode: var(--illustration-mix)` and `filter: var(--ink-filter)`, the variables
  `readerTheme()` already sets for illustrations, so a page-colour change applies at once. The
  reader toolbar resolves the character portrait with `useAssetSource(presentation.resolveAsset)`
  (the character feature may not import presentation, per the architecture rules) and passes the
  URL down; `Combatant` lost its hand-built fallback URL. New e2e `themed-art.spec`.
  `ReaderToolbar` crossed 60 lines, so its home/title/language group became `ToolbarStart`.

## Pass 7 — bugs, rewards, event pages, combat redesign, icons, fixed page

Floor for `fallow health --score --hotspots` is now 92 (decision on Pass 6).

### Fixture story (approved)

`cc26d73` `tests/e2e/fixture-story.ts`: a small Ink story compiled inside the test with the
editor's own `compileProject` and served in place of Orée's `en.json` to that test page only
(nothing is added to `public/`). It covers what Orée doesn't use:

- a photograph hotspot whose hidden `# interaction` choice sets a fact → the "Photograph clue"
  inventory entry, which survives reload (restores the Pass 6 gap);
- an offensive ability "Dawn" with a stun, dice seeded (seed 19) so the stun shows for one turn
  and ends on the next attack → the ended indicator is present, `aria-hidden` and animating.

Found on the way: a run that starts its own Vite server always fails its first test (the first
page of a cold server takes ~60 s). Keep one server running on 4175 and warm it first.

### 1a. Back after a combat — `0cb39c9`

Root cause: the history pushed the save from just before leaving the page. A fight or reward
resolved on the page (the frame is retained) had already changed HP, XP, items, effects and the
dice state, so Back showed the page with the post-combat stats. The director now remembers the
page as it was reached (`reachedPage()` beside `beforeCheck()` in `game-session.ts`); a
checkpoint reloaded mid-fight has no clean start and keeps the old behaviour. Test first:
`game.test.ts` "back after battle|letter restores the page with the stats it had then" failed
(inventory still held the letter; HP/XP after the fight), passes now. Save format unchanged.
Health: the extra branch pushed `director.ts` over the hotspot line (50.2); moving the pure
rule out of the director brought it back to 47 (92.4 overall).

### 1c. Lightning flash covers the whole view — `3bf07d9`

Cause: `.reader-viewport-effect` was `inset: var(--reader-toolbar-height) 0 0`, so the flash
stopped at the menu's lower edge and the menu stayed unlit. Now `inset: 0` above the sticky
menu (still `pointer-events: none`), and the bolt adds an even wash (`strength / 2`) on top of
the falloff where it lands, so page and menu brighten together. Combat feedback uses the same
rule. **Assertion changed on purpose:** `reader-request` "uses the whole viewport below the
menu" → "board effects light the whole viewport, menu included" (top 0, full height; checks the
menu still opens through the overlay).

### 1d. Board shake — `bb393f6`

Orée authors `screen-shake` at intensity 0.12–0.22 over 2 s, which moved the board 1.7–3px as a
slow wobble. Intensity now maps to 0.5–1.5 of the base jolt (≈ 9–10px peak, small roll) and the
motion fits in the first 600 ms whatever the duration. Reduced motion: the engine already skips
every effect. Unit test added.

Screenshots: `review-screenshots/p7-before|p7-after/flash-*`, `shake-*` (frozen frames; the
shake still frames freeze the text reveal too, the recordings show it best) and recordings
`effects-{paper,dark}-{desktop,mobile}.webm` (page "atelier" shake, then page "preuve" flash).
Re-run: `SHOTS=p7-after npx playwright test -c review-screenshots/shots.config.ts effects.spec.ts`.

### 1b. Live narration (ai-live) late or silent — `b1f3b75`

**Measured** with the local Chatterbox server (your process on 8765) and a browser probe
(`review-screenshots/narration-timing.spec.ts`, page shown → `POST /api/narration` → `play()`),
reading each page for 20 s:

| Page        | Page shown | First audio | What happened                                                                                   |
| ----------- | ---------- | ----------- | ----------------------------------------------------------------------------------------------- |
| matin-ville | 2.9 s      | 2.9 s       | cached clips (0.0 s)                                                                            |
| etabli      | 23.0 s     | 23.2 s      | cached; p3 started generating at 35.3 s                                                         |
| livraison   | 43.1 s     | **never**   | p3 of the previous page still generating; p1 got **429 after 2 s**, p2 too → page stayed silent |
| atelier     | 63.1 s     | 63.3 s      | p1 cached; p2 generated in 9.9 s while p1 played                                                |
| messagere   | 83.2 s     | **never**   | same race as livraison                                                                          |

Diagnosis: not generation latency alone. **A dropped request caused by a page-change race.** The
generator does one clip at a time (`LOCK`); a clip abandoned by the browser kept generating, and
the new page's request gave up on the lock after 2 s (`429`), which the client treats as
"narration unavailable". Also, paragraph n+1 was only requested once paragraph n−1 had finished
playing.

Fixed:

- `tools/narration.py`: cached clips answer at once (no lock); new ones wait their turn (up to
  120 s) instead of a 2 s refusal; a request whose browser connection is gone leaves the line
  without generating. Python test (`NarrationQueueTests`) reproduces the race: a request waiting
  2.5 s behind a generation gets 200 (was 429 after 2 s), the abandoned one never generates.
- Prefetch: the reader asks for every paragraph of the page in order, one request at a time,
  from the page start (unit test: the 3rd paragraph is requested while the 1st plays, never two
  in flight — failed before).
- "Preparing narration…" / « Préparation de la narration… » (`role="status"` in the toolbar,
  pulsing dot; words hidden under 760 px, still announced; no pulse under reduced motion) while a
  reached paragraph is still generating and the wait exceeds 400 ms. Unit + e2e tests.

**Needs you:** your narration server still runs the old code. Restart `narration.py serve` to
get the fix, then re-run the probe to see the after numbers:
`npx playwright test -c review-screenshots/probe.config.ts` (normal pace; `FAST=1` for quick
page turns). I did not restart your process or load a second model beside it.

Not done (logged): prefetching the _next_ page (unknown until the reader chooses).

**Earlier audio fixes confirmed in the browser** (all chromium e2e):

- unlock in the first click, reader and editor (`audio-start` ×2, existing);
- sound effects / ambience and **music actually play** (time advances) on page "atelier" (new);
- a clip that takes **7 s to download** (old limit 5 s) still plays (new, `narration.spec`);
- the 15 s no-progress limit is covered by unit tests (`audio-manager.test.ts`); a browser stall
  cannot be produced reliably with route interception, so no e2e.

### 5. Your home and My Character icons — `9266bf8`

`public/home-icon.png` and `public/rpg-icon.png` (the two untracked files, added **unchanged**)
replace the glyphs I redrew last pass, in the reader toolbar's Home and My Character buttons —
the only two places these actions have an icon (the welcome screen uses the text wordmark; the
editor has no Home button). They are **PNG**, so no `currentColor` edit is possible; they have
transparent backgrounds, so `PictureIcon` uses them as a CSS mask filled with the text colour.
They follow light, paper and dark live, at 24 px like the previous home icon; accessible names
unchanged. The old `home`/`character` paths were deleted from `ToolbarGlyph`. E2E: the icons use
those files and the text colour, also on dark.

To know: the files are 237 KB and 497 KB (1300 px) for 24 px icons. I didn't alter them; a
96 px export (or an SVG) would load faster on mobile.

Screenshots: `p7-before|p7-after/toolbar-{light,paper,dark}-{desktop,mobile}.png` (close-up) and
`page-*`.

### 2. Reward notifications — `8407bde` (+ `fff9971`)

**Found:** there was no right-hand stack in the code; a reward (item, learned ability) opened a
centred **modal** that blocked the story until "Continue reading" (`GameResultNotice`). I built
the stack after your reference image and removed that modal (`GameResultNotice`, the
`seenResults` plumbing and the `.spell-learned-modal` / `.reader-event-message` CSS).

- What: `rewardChanges(before, after)` (pure, unit-tested) lists what the reader **gained**:
  item received, ability learned, ability rank, XP (counted across a level-up: Δxp + 5 × Δbase
  max HP), level up, HP restored. Losses (damage, used items) are not notified.
- When: from the last shown state. A fight, a check or a combat ending keeps its window first; what
  it gave appears when the window closes (e.g. "+1 XP" after a check). Load and Back show
  nothing.
- A reward choice no longer stops: the card appears and the story continues (`RewardEvent`
  finishes the pending event; a failed save is retried by the existing "Try again", which
  reloads and finishes it).
- Card: small icon tile, title, one short detail line, shared `CloseButton`, 2 px bar that
  shrinks over 10 s and pauses on hover/focus (its `animationend` dismisses the card).
  `role="status"` region labelled "Rewards"/"Récompenses". Reduced motion: no entrance, no
  moving bar (an invisible 10 s animation still times it).
- Placement (design choice): **wide screens** — fixed, far right, 16 px below the toolbar, 252 px,
  in the margin beside the 768 px column (from 1340 px; from 1684 px on pages with art on the
  right, which make the reading area 1116 px). **Narrower screens and mobile** — there is no
  margin, so one card at a time sits **over the toolbar's title row** (home + title), never
  over the text; the next card waits and its timer starts when it is shown. Checked by e2e at
  1440, 1024 and 390 px (no overlap with the text or the side art, no horizontal scroll).
- **Assertion changed on purpose:** `reader-request` "shows the item before departure" now
  expects the notification and no window ("…as a notification…"). `fff9971`: the combat
  flash's vertical position (whole view since 1c).

Screenshots: `p7-before|p7-after/reward-{wide-desktop,narrow-desktop,mobile}.png` and `.webm`
(before: the modal; after: the card).

`920053e` (follow-up to 2): cards that don't fit were `display: none`, which **stops their CSS
countdown**, so on narrow screens a backlog built up and the card shown could be minutes old
(found on the task 3 screenshot). Hidden cards now stay invisible but keep counting; every card
lasts 10 s from its arrival. E2E checks a waiting card's timer is running.

### 3. Narrative events become story pages — `5144b5c`

**Design note.** Where events come from today:

- Rewards are **game actions** on Ink choices (`+ [Accept the letter # game:take-letter] -> preuve`):
  give-item, learn, heal, xp, train. The director applies the action, keeps the page with a
  `pendingEvent`, and when the event finishes Ink follows the choice's divert.
- Checks and fights are game actions too, with their own windows; their outcome passages are
  already authored pages (`apres`, check results).
- `scenes[passage].events` are presentation cues (sound, effect), not story events.

So an important event can be a page **in the content itself**: point the choice at a new Ink
knot that describes the event, then continue. The reward stays on the existing game action, and
task 2's stack shows the stat change. No generic mechanism was needed.

One blocker: any Ink edit changes the bundle's digest, and `validateCheckpoint` rejected every
existing save as "another story version" (earlier releases worked around it by bumping
`checkpointId`, which starts a fresh slot — old saves did not load either). To keep old saves
loading without changing the save format: a language configuration may list earlier digests of
the same release as compatible (`compatibleInkDigests`, optional, copied into the bundle); such
a save is accepted only if the existing Ink restore check puts it exactly at its saved frame
(choices, interactions, facts), and the next save writes the new digest. Documented in
`DATA_CONTRACTS.md`. Unit test (`story-update.test.ts`, failed before): a v1 save loads in v2 and
its choice reaches the new page; without the declaration it stays incompatible. One-off check
against the real story: Orée saves made with the previous en/fr build on `messagere`, `duel`,
`apres` and `infirmerie` all load in the new build; from `apres` the old save continues to the
new page.

**Orée — becomes a page:**

| Event                                         | Page                                                                                                                                  | Notification |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Ysée heals you after the guardian (`recover`) | new `soins`: "The Care of Ysée" / « Les soins d’Ysée » (your text, in the story's present tense; then "Follow Ysée to the infirmary") | "+N HP"      |

**Already a page (no change):** meeting Nour (`messagere`), Ysée (`portail`…), the duel and the
guardian fight (combat window + `apres`), every check result, each spell lesson (the page after
`learn-*` narrates it).

**Notification only (minor rewards):** the letter, the alder pen, the school seal, the healing
balm (items); Little Light, Thread of Air, Counter-song, Dawnstroke (abilities learned — their
lesson pages already tell the story); XP from checks and fights; level-ups.

**Assertion changed on purpose:** `magic.test.ts` "plays all 41 … pages" → 42 (+ `soins` follows
`apres`). The French chapter e2e now checks the page title and the "PV récupérés" card.
Live narration: `npm run narration:export` was run so the local generator accepts the new text
(local file, untracked).

Screenshots: `p7-after/care-{desktop,mobile}.png` (no "before": the choice used to go straight
to the infirmary page).

### 4. Combat redesign — `a5d0ee2`

- **"i" buttons**: they already were the shared `Info` (a native `<details>`), so they open on
  click and from the keyboard (Tab, Enter/Space); nothing opened on hover. Kept; now e2e-tested.
- **Use an item** (and Use an ability, same code path — one component) opens a popup **inside
  the combat window** (`role="dialog"`, shared `CloseButton`, focus moves in, Escape returns to the
  actions without closing the combat window, focus back on the button).
- **Turn sequence**: dice → your blow (slash + red flash on the enemy, your log line) → **1 s** →
  the enemy's blow (red flash + shake on your portrait, its log line). The rules apply both blows
  at once, so each HP bar moves with its beat; moves wait until the turn has played out. The old
  board shake on damage (`use-combat-feedback`) moved to the portrait.
- **Log**: fixed height (6.6 lines), scrolls, newest line kept in view; focusable for keyboard
  scrolling.
- **Ending, same window** (before: a second window with a broken layout, see `p7-before/duel-ending-*`):
  the window stays mounted from the first turn to the end and keeps the last encounter (the rules
  delete it). Final roll and blows as usual → the defeated side's portrait fades (victory/charm:
  the enemy; defeat/escape: you) → the outcome appears **between the two portraits** (centred at
  their mid-height on a paper pill — a 3-column layout clipped the player on mobile) → 2 s →
  the window fades out (450 ms) → the story continues. A failed save keeps the window with
  Continue, as before.
- **Reduced motion**: no hit, shake, fade, entrance or fade-out; every beat, the log and the
  outcome stay (the defeated portrait is shown dimmed directly).
- i18n: the strings of this window moved to `combat.*` (en + fr), replacing the inline
  `french ? … : …` pairs in `CombatControls`/`CombatActions`/`Combatant` (REVIEW #7).
- Tests: new e2e "combat: info opens from the keyboard, items open in a popup…", "combat: two
  beats per turn, then the outcome between the portraits and a fade-out" (enemy line ≥ 0.7 s after
  yours, hits on the right portraits, log height constant, title between portraits, fade-out seen),
  "reduced motion keeps every combat step…". **Assertions changed on purpose:**
  `combat-ending.test.ts` (static render: the title now appears after the final beats, so it
  checks the single window, the translated title and the final line through `combatLines`);
  `reader-request` "announces Defeated/Escaped" waits for the next turn or the outcome instead
  of clicking a button that the ending hides.
- Health: splitting `CombatControls` (`useCombatTurn`, `CombatStage`) kept unit size in check
  (92.2).

Screenshots + recordings: `p7-before|p7-after/duel-{start,items,turn-*,ending-*,after}-{desktop,mobile}.png`,
`duel-{desktop,mobile}.webm` (seeded training duel, motion on).

### 6. Fixed page, only the text scrolls

**Design note (written before the change).**

- **Fixed:** the top menu, the page background (colour, paper grain, `background` media — already
  `position: fixed`), the side art, the reward notifications (already fixed), viewport effects.
- **Scrolls:** the reading column — title, text, inline and `wide` media, examination buttons,
  choices, progress and the footer. `.reader` becomes a full-height frame (100dvh, no page scroll)
  and `.reader-board` the single scroll container. The board bleeds into the gutters (like the
  toolbar already does), so its scrollbar sits at the window's right edge — one scrollbar, as
  before.
- **`right` media (side art):** sticky at the top of the board while the text scrolls, so it
  stays in view. Below 1240 px the art already sits above the text (no side column); there it
  scrolls with the text like any illustration.
- **`fullscreen` media / cinematics, combat, checks, modals:** native `<dialog>` top layer,
  unaffected.
- **New page / Back:** the board belongs to the keyed page component, so each page (and Back)
  mounts a fresh board scrolled to the top. Focus still moves to the page heading, which sits in
  the board, so Page Up/Down, Space, arrows, Home/End scroll the text straight away; if focus is
  elsewhere outside the board and not in a control (e.g. after a toolbar click), those keys are
  forwarded to the board. The board is a labelled region ("Story text" / « Texte de l'histoire »).
- **1c (scroll-driven media):** the IntersectionObserver uses the viewport as root
  (`root: null`), which already accounts for clipping by a scrolling ancestor; no change
  expected, checked by its e2e.
- **Mobile (≤ 760 px): normal page scroll, kept on purpose.** The menu takes two rows (112 px)
  there; a fixed frame would permanently take that height from a small screen, and an inner
  scroll container stops mobile browsers from hiding their address bar while reading and
  changes the familiar pull-to-scroll behaviour. With page scroll the sticky menu still stays at
  the top and the reward cards sit over it.

**Result — `c19d209`.** As in the note. The side art sticks at its own top margin (46 px), so it
does not move at all. Scroll keys pressed outside the text and outside any control/window (e.g.
after clicking Pause) are forwarded to the board; inputs, selects, sidebars, `<details>` and
dialogs keep their keys, and Space on a button still presses it.
E2E (`page-frame.spec.ts`, 1440×700 on page "messagere"): the wheel scrolls the board while
`scrollY` stays 0, the menu stays at y = 0 and the side art does not move; no page or sideways
scroll; a new page and Back start at the top; Page Down/Home/End work from the heading and after
a toolbar click; no sideways scroll at 1024 and 320 px. 1c's "starts an instant-text illustration
below the fold…" passes unchanged (`root: null` sees the board's clipping).
**Assertion changed on purpose:** `reader.spec` "wide cinematic canvas" measures the board's
content box (the board now spans the window so its scrollbar is at the edge).

Found while checking (`322663d`): adding the care page had silently dropped Orée's published
narration clip from the bundle — the build only attaches published clips when
`stories/house/narration.json` names the current Ink digests. The only published clip still
matches its text, so the digests moved to the new build (what `narration.py prepare` writes). The
two new paragraphs (en/fr) have no published clip: they narrate live in dev until the next
`narration.py prepare` (needs the model; I did not load a second one beside your server).

Screenshots + recordings: `p7-before|p7-after/frame-{top,scrolled,pagedown}-{desktop,mobile}.png`,
`frame-{desktop,mobile}.webm` (desktop 1440×700: before, the side art scrolls away; after, it
stays; mobile is unchanged by design).
