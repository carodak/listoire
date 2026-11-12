# Refactor log

## ☀ Summary — Pass 13 (read this first)

Branch **`chore/next`** (from `main`), nothing pushed. Work list (from your message), in order.
If interrupted: resume from the first unchecked item.

- [x] Part 0 — `_to_delete/` deleted (148 MB, untracked); `git status` identical before/after.
- [x] Part 1 — REVIEW #4 (a): one key per history version (write 669 → 73 ms with a full history).
- [x] Part 2 — REVIEW section 3: 14 fixes, 1 left as is (logged), unused media removed.
- [x] Part 3 — `docs/contributions.md` lists the story and library resources only.
- [x] Part 4 — test consolidation (numbers under "Part 4" below).
- [x] Part 5 — firefox/webkit/mobile failures (5 app fixes, the rest test-side; see Part 5).
- [ ] Part 6 — REVIEW sections 4, 5, 8.
- [ ] End — full checks, four browsers, perf, REVIEW table, this summary.

## ☀ Summary — Pass 12 (previous session)

Two branches, nothing pushed, nothing on `main`: **`chore/cleanup`** (8 commits, from `main`) and
**`perf/app`** (25 commits, from `chore/cleanup`; this summary is the last one). Part 1's report is
[docs/cleanup.md](docs/cleanup.md). Details of Part 2 in "Pass 12" at the end of this file.

|                                | Start (`1d88630`) | Now                                                                                                   |
| ------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| Health `--coverage` (floor 92) | 93.3              | **93.3**                                                                                              |
| Unit tests                     | 465 (58 files)    | **484** (65 files)                                                                                    |
| Test files / test LOC (cloc)   | 84 / 11,669       | **91 / 12,075**                                                                                       |
| E2E, chromium (full)           | 145/147           | **147/147**                                                                                           |
| E2E, firefox / webkit / mobile | not run           | **passed / failed / skipped: firefox 135/2/10, webkit 126/11/10, mobile 127/20/0** — none new (below) |
| Tracked files (Part 1)         | 699, 27.1 MB      | 636, 23.7 MB                                                                                          |

### Firefox, WebKit and mobile (first full run this session)

Full suite, all four projects: 535 passed, 33 failed, 20 skipped (by design: chromium-only
specs), 44 min. Chromium had no failures. To tell old failures from new ones, the same specs ran
on firefox/webkit/mobile against the code before Part 2 (`1d88630`, clean worktree, same story
bundles): **37 failed there**. No test fails now that passed before; 33 fail on both; 4 webkit
tests fail only on the old code and pass now (the three combat endings and the French magic
chapter: the combat-ending wait fix helped there too).

The 33 failures that predate this pass, for a later pass:

- **mobile (20):** all 10 `image-references` tests: the spec skips non-Chromium browsers, but
  "mobile" is Chromium and its references exist only under the desktop project name (test setup,
  not the app). Also `media-workspace` (3), `typography` (2), `reader-request` (2), `character`,
  `fixture-story`, `house` (1 each).
- **webkit (11):** `audio-start` (3), `media-workspace` (3), `side-panels` (2), `page-frame`,
  `rewards` at 390 px, `typography` colour picker.
- **firefox (2):** `image-composition` "crops pale borders", `media-workspace` cut/paste of a
  `// @media` line.

### REVIEW (docs/REVIEW.md) — every item

**Numbered issues**

| #   | Item                                           | Status                                                                                                                                           |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Fresh checkout cannot build                    | **Done** `73b2223`. Proven: clean `git worktree add --detach`, `npm ci`, `npm run build` ✓, 466/466 unit tests.                                  |
| 2   | E2E suite tests the old story                  | Done, Pass 6 (`docs/refactor-history.md`, "Task 2").                                                                                             |
| 3   | Cut/paste of a `// @media` line loses settings | Done, Pass 9 `4509e26`.                                                                                                                          |
| 4   | Undo history / autosave / compile cost         | **Partly done**: store writes `575d51e` (2386 → 515 ms per write), one worker `9ed4041`. Left: see "Needs you" (history format) and "Tried".     |
| 5   | French readers see English                     | **Done** `c4e08ad` (last inline pairs, "Story Editor" links, video texts); rules messages were done in Pass 5 `0cce5e7`.                         |
| 6   | Hand-built asset URLs                          | **Done** `4014b96`: `storyFileUrl()` / `appPath()`; parallax and effect layers now resolve uploads.                                              |
| 7   | Rule errors reported as "could not be saved"   | **Done** `f150c01`.                                                                                                                              |
| 8   | Ink line over 50 ms                            | **Done** `f78df23` + `ff5ffb0` (loop the time slices, 1 s cap).                                                                                  |
| 9   | Skip cinematic drops timers                    | Done, Pass 6 `743031b`.                                                                                                                          |
| 10  | Examine has no focus ring                      | **Done** `8d1ff55` (also the page heading, `:focus-visible`). No test: only a CSS outline would show it.                                         |
| 11  | Media re-hashing; library decodes every image  | **Done** `fc8a5a3` (library) + `08c7b8d` (uploads verified once per page).                                                                       |
| 12  | Editor code on the reader path                 | **Partly done** `cd40ef7` (no recompiling a published draft). Left: migrations still run on reader load; measured cost of the rest is ~10 KB.    |
| 13  | Narration timeouts                             | Done, Pass 6 `18a938d` (allowance grows with the clip; watchdog instead of a 4 s start limit).                                                   |
| 14  | Game editor: invalid project, editable IDs     | **Partly done** `5321c31` (character never left without abilities). Left: "Stable ID" fields still free text (needs a rename-references design). |
| 15  | Export holds every upload in memory            | **Done** `1e1b120` (one upload at a time). The base64 JSON format itself is unchanged (a ZIP would change the backup format).                    |

**Section 3 (bugs beyond the top 15)** — done: combat effects ≤ 2 (`0cce5e7`), `CombatControls` stuck
`rolling` (Pass 5), media-store fallback path (`4014b96`), "Loading image?" (`fc8a5a3`). **Still
open** (not reached this pass): editor-store lockout after a schema change; director re-present
after a failed save; `previousPages` memory; `line-${steps}` segment IDs; two slug functions;
hex-colour regex `{3,8}`; `sameOriginFetch` byte limit on chunked responses; `usePreviewPlayer`
reset; top-level `await` in `main.tsx`; settings parsed all-or-nothing; volume slider writes per
`input`; ReactBits safety overrides; full `mediaLibrary` in the published `project.json`;
illustration-pack overwrites caption/alt; no-op wordmark button; README stale.

**Section 4** — done: hidden JSON inputs → typed draft (Pass 9), `node.onpointermove` (Pass 9),
"Auto Compose (future)" removed (Pass 9), BOMs gone. **Still open**: `CharacterSheet` dead `combat`
prop, Ribbon `"unavailable"`, `deferRoll` naming, `tooltips.ts` MutationObserver, `PresentationSession`
prop drilling, `revealRemaining` double publish, mid-file import in `text-reveal.ts`, 13 unused i18n
keys (2 removed: `welcome.create`, `welcome.soon`), FR typo `sauvegardees`, `storyId: "house"`.

**Section 5 (18 patterns)**: done #1 `4014b96`, #2 `625803b`, #3 #4 `1e1b120`, #5 `625803b`,
#6 `46cbe2b`, #7 `c4e08ad`, #11 `625803b`, #13 Pass 9. **Still open**: #8 regex primitives, #9 enum
lists, #10 `actionTargets`, #12 speech utterance setup, #14 form dialog, #15 definition editor,
#16 tabs (a shared `tab-keys.ts` exists; not all bars use it), #17 effect playback, #18 migrations
module.

**Section 8**: done: one compiler worker `9ed4041`; root clutter (Part 1). Tried, no gain: reveal
clock sleeping while waiting for narration (below). **Still open**: CSP, JSON.stringify equality,
`dissolveWords` per grapheme, `scene3d` behind a flag.

### Performance (`node tools/measure-performance.ts`, Chromium, median of 5)

Each change was measured against the code without it, on the same server, back to back (the
machine's speed drifted during the day, so start/end columns alone mislead):

| Change                        | Metric                                         | Before → after           |
| ----------------------------- | ---------------------------------------------- | ------------------------ |
| `3c68dca` narration progress  | main-thread time while text reveals / narrates | 211 → 69 / 177 → 50 ms/s |
|                               | React commits per second                       | 29 → 15                  |
| `fc8a5a3` lazy library        | open Media › Image › Library                   | 459 → 56 ms              |
|                               | image requests / React commits                 | 176 → 75 / 26 → 4        |
| `575d51e` store writes        | one editor write, Orée 2.1 MB, 30 versions     | 2386 → 515 ms            |
| `cd40ef7` published bundles   | reader first page with an editor draft         | 582 → 296 ms, no worker  |
| `9ed4041` one compiler worker | live preview after the last key (600 ms pause) | 844 → 668 ms             |
|                               | autosave ("Saving" → "Saved")                  | 501 → 298 ms             |
| `08c7b8d` verified uploads    | 3 components showing a 10 MB upload, per page  | 25 → 0 ms                |

End state (final run): reader first page 159 ms, page turn 45 ms (51 with motion), combat turn
68 ms, heap after 20 pages 17 MB (+1.9 MB), editor load 1.03 s, keystroke 18 ms painted / 8 ms
handler, tab switch 32 ms, scene switch 31 ms, Image dialog 52 ms. Bundle: reader initial JS
574 KB (180 KB gzip, React DOM + zod + i18next), editor route 242 KB and compiler worker 366 KB
load only on `/editor`; no editor chunk in the reader's initial load.

**Tried, didn't help (reverted or skipped, measured):** Ace loaded in parallel with the project
(1030 → 1025 ms editor load: noise); reveal clock sleeping while it waits for the voice (42.5 →
42.5 ms/s); compiling the default language's structure once instead of twice (whole compile is
126 ms, in a worker); lazy undo-history strings (3 ms per key, typing already paints within two
frames); moving the ~10 KB of editor code off the reader's start path (needs an extra round trip).

### ⚠ Needs you

- **Editor history format (REVIEW #4, rest).** A write still takes ~515 ms with 30 versions because
  IndexedDB clones the record with all 30 full projects. Options: (a) one key per history version
  with a byte budget (biggest win, changes the stored editor format, old records need a one-time
  move); (b) keep 10 versions instead of 30 (3× less, loses history); (c) leave it. Not done:
  AGENTS.md says stop before a stored-format change.
- **Load-dependent e2e failures are now explained twice** (image references, combat endings): both
  were test waits, not the app. Both fixed and proven with `--repeat-each=5 --workers=4`.
- `docs/contributions.md` still lists the old house story's resources (from Part 1).
- `_to_delete/` (147 MB, untracked) waits for you (from Part 1).
- **33 e2e failures on firefox/webkit/mobile predate this pass** (list above); none is new.

### What to test by hand

- Read Orée with **Read aloud on** and motion allowed: text follows the voice as before.
- In the editor, type, then open the reader: it opens without delay and shows your change; break
  the Ink on purpose: the reader shows the error, not an older story.
- Media › Image › + Add layer › **Library**: scroll; pictures appear as they come into view.
- A project with an **uploaded** image or video: shows in the reader, parallax layers included.
- **French**: a check (dice), combat details (ⓘ), inventory Equip/Remove, the welcome "Éditeur
  d'histoires" link.
- A combat you lose, and the Game editor: remove both starting abilities, autosave still works.

## ☀ Summary — Pass 11 (previous session)

Branch `features/editor-ux`, 17 commits on top of your WIP commit `43dfdd3`, the last one being this summary (nothing pushed,
nothing on `main`). **All nine Media → Image items are done, each in its own commit with an e2e
test; your four follow-ups too; and your "sync story.json after deleting Ink scenes" e2e passes**
(one small fix, its assertions untouched). Details in "Pass 11" at the end of this file.

|                                       | Pass 10 end | Now                                                  |
| ------------------------------------- | ----------- | ---------------------------------------------------- |
| Health `--coverage` (floor 92)        | 93.5        | **93.3** (unit-size penalty 4.1 → 4.3; nothing else) |
| Unit tests                            | 464         | **465** (+ `movePicture`)                            |
| E2E, chromium (full)                  | 136/137     | **147/147** (your sync test passes)                  |
| `fallow security` / dupes / dead code | 0 / 0 / 0   | 0 / 0 / 0 (one Pass 10 dead export removed)          |

### What was done

- **11-1** `a128c6b`: **"Choose an image"** is in the "Start with an image" area, only while
  there is no image; then more images come from **"+ Add layer"**. The selected image has
  **"Replace image"** (keeps its place and size).
- **11-2** `f68f9e1`: **"Ready-made scenes"** is a toggle in the start area, closed by default;
  the copy at the bottom is gone.
- **11-3** `cfce2dc`: the picker has two tabs, **In this story / Library**, visible at once,
  each with **All / Foreground / Middleground / Background**.
- **11-4** `52e8e10`: a **layers panel** like an image editor's: one row per layer, front to
  back, with an **eye** (this preview only), thumbnail, name, depth and ×; click to select, drag
  (or Alt+↑/↓) to reorder or change depth, Delete to remove.
- **11-5…11-8** `c642195` `c7ba7bb` `0c87f9a` `d657f2a`: no "More options": every category is
  its own folded section; **"Description & caption"** with plain labels; **"Interactivity"**
  for image examination; **Camera settings** folded under the camera.
- **11-9** `013e0ff`: camera and entrance presets are **cards with a thumbnail of the image**
  that plays the movement on hover / focus (still under reduced motion).
- **Your follow-ups** `0cb899c` `894293d` `4899581`: "On the page" inside **Look on the page**;
  **Camera** folded with its settings inside; order **Look on the page → Camera → When to
  display the media → Interactivity → Description & caption**.
- **Your story.json sync** `c4c01b5`: the sync worked; the test couldn't find the "Properties
  JSON" field because a textarea's initial text became part of its label. Text areas are now
  named by their label.
- Also: `e3726d9` picker cards no longer squash in a long list; `a4d6ec5` a Pass 10 export
  nobody used.

### ⚠ Needs you

- **Check plan changed mid-pass (yours):** fast checks per commit, coverage once at the end.
  Logged under "Pass 11 → How checks run".
- **Start the dev server from PowerShell** (as you said): from Git Bash the drive letter is
  lowercase and both Vitest (every suite fails) and Vite (dynamic imports fail) break.
- `site_changes.patch` shows as **deleted** in the working tree; not me, left as is.
- One full e2e run (of three) had 2 reference-image failures (`image-references.spec.ts`,
  cours-air and bibliotheque); that spec then passed 10/10 twice alone and the next full run was
  147/147 on the same commit, so I treat it as a flake under load. Worth watching.

### Decisions I made myself (Pass 11)

- Changing a picture after the first: **"Replace image"** on the selected image (the per-layer
  "Choose" buttons went, per item 1).
- Depths read **Foreground / Middleground / Background** everywhere (French: Premier plan / Plan
  intermédiaire / Arrière-plan), like the picker's filters.
- A search with no match in the open tab but matches in the other **switches tab**.
- The **main picture stays at the back of its depth** (it is drawn first and owns the
  description); dragging it only changes its depth.
- Hidden layers (eye) are **not stored** and are forgotten when the dialog closes.
- The Entrance cards stay in "When to display the media"; **Interactivity** goes before
  Description & caption (your last message); "Quand afficher le **média**" with the accent.
- Section summaries show the current choice ("Look on the page · Wide", "Camera · Gentle
  depth") and what is set inside.

### Screenshots and recordings (untracked, `review-screenshots/`)

- **Before** (Pass 10): `pass10-after/image-new.png`, `image-choose.png`, `image-single.png`,
  `image-three-layers-handles.png`, `image-flow.webm`.
- **After** (Pass 11): `pass11-after/image-new.png` (start area), `image-new-scenes.png`
  (scenes open), `image-picker-in-story.png`, `image-picker-library-background.png` (tabs and
  filters), `image-single.png`, `image-layers-eye.png` (layers panel, fern hidden),
  `image-sections-closed.png`, `image-look-on-the-page.png`, `image-camera.png` (camera and its
  settings), `image-interactivity-description.png`, `image-preset-hover-a.png` / `-b.png` (a
  card mid-movement), `image-sections-fr.png` (French), and the recording `video/*.webm` (drag a
  layer, Alt+↓, eye, hover three camera cards). Spec: `review-screenshots/pass11-image.spec.ts`.

### How to try it

`npm run dev` (from PowerShell), open `/editor`, Media → Image:

- **Start:** "Choose an image" in the middle; "Ready-made scenes ▸" opens the five scenes.
- **Picker:** "In this story" / "Library" tabs, then All / Foreground / Middleground / Background.
- **Layers:** apply "Character in forest"; click an eye; drag the woman's row onto the fern's
  top half; focus a row and press Alt+↓; Delete on a row, then Undo.
- **Settings:** each section opens on its own; Camera → hover a card (it moves; with reduced
  motion on, it doesn't); Camera settings inside it.
- **French:** choose Français on the home page, then open the editor.

## Pass 11 — Media → Image: start area, picker tabs, layers panel, sections, preset previews (branch `features/editor-ux`)

Your nine Image-dialog items, one commit each with an e2e test (added to the existing image
spec files), then your "sync story.json after deleting Ink scenes" work (committed by you as
`43dfdd3` at the start of this pass).

### How checks run this pass (your change of plan, mid-pass)

- **Per commit** (fast but complete): typecheck + lint, all unit tests (`npx vitest --run`), the
  e2e spec(s) the item touches (chromium), `npx fallow health --score` (no `--coverage`),
  `npx fallow security --gate new --changed-since main`, `npx fallow dupes`. Anything failing is
  fixed before the next item.
- **Once, at the end:** full e2e on chromium, then `npm run test:coverage` and
  `fallow health --coverage` (score ≥ 92), then the before/after screenshots. A failure there is
  bisected over this pass's commits and fixed in a new commit.
- **Dev server:** started once from **PowerShell** on 4175 and kept running, warmed before e2e.
  Why: from Git Bash the drive letter is lowercase (`c:/Users/…`). Vitest then loads two copies
  of itself (every suite fails with "Cannot read properties of undefined (reading 'config')"),
  and the Vite dev server served modules under both casings: dynamic imports (`DiceModel.tsx`,
  `RippleDistortion.jsx`) failed and 14 reader/react-bits e2e failed. From PowerShell: 464/464
  unit tests, and those e2e pass.
- Commits 1–2 also got the earlier full block (coverage + health `--coverage` 93.5, security 0,
  dupes 0). The coverage runner stops before its merge when any e2e fails (your WIP test does),
  so the merge was run by hand; the second time it hit a captured entry without source code,
  left for the final run.

### 11-1. "Choose an image" lives in the start area — `a128c6b`

- While the composition has no image, the preview's "Start with an image" area holds **"Choose
  an image"** (the only "Choose" button). The left panel then just says "No image yet", with
  "+ Add layer" disabled. Once there is an image, the start area is gone and more images come
  from **"+ Add layer"** ("+ Ajouter un calque").
- **Decision:** the per-layer "Choose image" buttons are gone (item 1: "Choose" only while
  empty). To change a layer's picture without losing its place and size, the selected image has
  **"Replace image"** next to Duplicate / Reset (same `changePicture` as before).
- Picker titles: "Choose an image" (first), "Add a layer", "Replace image".
- **Changed assertions** (`media-workspace.spec.ts`): an empty composition has 0 layer rows
  (was 1, the empty row with its button); the start area's hint check now clicks its "Choose an
  image" button; "no Choose/Change once there is an image" is 0 (was 1 / 3: one per layer) and
  "Replace" is 1; "Choose image for Fern fronds / Curly-haired…" became select the row, then
  "Replace image". Selector only: "Choose image" → "Choose an image" (`editor.spec.ts` ×2,
  `image-composition.spec.ts`).
- Test: "the start area holds Choose an image while there is none; then + Add layer adds more".

### 11-2. Ready-made scenes: a toggle in the start area — `f68f9e1`

"Ready-made scenes ▸" (closed by default, `aria-expanded`) under the start button shows the five
scenes; the second copy at the bottom of More options is removed. The arrow is an `aria-hidden`
span (a CSS `::after` arrow became part of the button's name). Selector change: tests that apply
"Character in forest" open the toggle first (`readyMade()` helper). Test: "ready-made scenes are
a closed toggle in the start area, and only there".

### 11-3. Picker: two tabs, four depth filters — `cfce2dc`

- **"In this story" / "Library"** are tabs (`tablist`, arrow keys via the shared
  `arrowKeyTabs`), under the search field and above the pictures, so the library no longer needs
  scrolling. It opens on "In this story" when the story uses pictures, else on "Library".
- Each tab has **All / Foreground / Middleground / Background** ("Filter by depth"), using the
  library's existing depth match (`matchesLibraryAsset`): a picture without depth information
  shows under every depth, as in the Library panel.
- **Decision:** a search that matches nothing in the open tab but something in the other opens
  that tab (otherwise a search could look empty while the library has the picture).
- **Decision:** the depths are named **Foreground / Middleground / Background** everywhere (were
  Front / Middle / Back), in French **Premier plan / Plan intermédiaire / Arrière-plan**, so the
  filters and the layers read the same. Selector change: group names in `media-workspace.spec.ts`.
- Test: "the picker shows In this story and Library as tabs, each filtered by depth".

### 11-4. A layers panel like an image editor's — `52e8e10`

- One row per layer, **front to back**, under Foreground / Middleground / Background: an **eye**,
  the **thumbnail**, the **name** and its **depth**, and the **×**. Click selects; **Delete** on
  a row removes it (Delete in the preview still works; Undo as before).
- **Eye:** hides the layer in the dialog's preview only, through a small style rule on its
  plane: nothing is stored, the reader never sees it. Hidden layers follow their layer when
  rows move or one is removed, and come back with Undo.
- **Drag** a row onto another row's upper / lower half to put it in front of / behind it (a line
  shows where); onto a depth's free space: the front of that depth. **Alt+↑ / Alt+↓** do the
  same from the keyboard (focus stays on the row).
- **Decision (data):** the main picture (the one the description belongs to) is drawn first, so
  it stays at the back of its depth; dragging it only changes its depth, and nothing goes behind
  it. Making another picture the main one would rewrite the description.
- Model: `movePicture` (unit test). Test: "the layers panel: one row per layer, front to back,
  with an eye, depth, drag and keys".

### 11-5 to 11-8. Settings as folded sections — `c642195`, `c7ba7bb`, `0c87f9a`, `d657f2a`

- **11-5:** no "More options": each category is its own closed `<details>`, whose summary says
  what is set inside ("· set: caption"). Changed assertion: `.image-more` not open → no
  `.image-section` open. Selector change: tests open the section they need.
- **11-6:** **"Description & caption"** ("Description et légende"): "Description (not shown,
  read aloud by screen readers)" (the alt text, moved in from the top of the dialog) and "Caption
  (shown under the image)". Selector change: "Caption", "Alt text" → the new labels.
- **11-7:** **"Interactivity"** ("Interactivité") holds image examination (gameplay on an
  image). Like before, a cinematic image has none, so no section.
- **11-8:** **"Camera settings"** folds right under the camera choice.
- Tests: "no More options…", "Description & caption: each label says where its text goes"
  (description = the picture's alt in the reader, caption shown), "Interactivity: …", "the
  camera is a folded section…".

### 11-9. Camera and entrance presets preview their movement — `013e0ff`

The camera presets and a single image's entrances (None / Fade in / Fade out) are **cards** with
a thumbnail of the current image. **Hover or focus** plays the preset's movement (the reader's
own `cinematicFrames`, at the chosen speed and intensity; the fades for entrances); leaving
stops it; under **reduced motion** it stays still. Cards are compact (two rows of eight) so the
preview stays in view. Selector change: "Camera" / "Entrance" selects → their groups' buttons.
Test: "camera and entrance presets preview their movement on hover or focus, still under reduced
motion".

### Your follow-ups during the pass — `0cb899c`, `894293d`, `4899581`

- **"On the page"** is inside **"Look on the page"** ("Aspect sur la page"); the **Camera** is a
  folded section with **Camera settings** folded inside. Order: Look on the page → Camera → **When
  to display the media** ("Quand afficher le média") → **Interactivity** → Description & caption.
  The layout and the camera preset show next to their section's title ("Camera · Gentle depth").
- Inside the Camera section, the presets' own "Camera" heading is kept for screen readers only
  (it repeated the title).
- **Decision:** "Quand afficher le média" with the accent (your message had "media").
- Changed assertion (mine, this pass): the section count in "no More options…" is 6 (Camera and
  its nested settings are both sections). Selector changes: camera checks look for the Camera
  section's summary (the presets sit inside a closed section, so "no camera" is asserted on the
  section, not on hidden buttons). Test: "settings order: …".

### Also fixed

- `e3726d9`: in a long picker list (the Library), every row shrank to fit the grid's height and
  the names disappeared; rows keep their size and the grid scrolls (the new assertion fails
  without the fix).
- `a4d6ec5`: `drawnBox` (Pass 10) was exported with no consumer (`fallow dead-code`: 1).

### Your "sync story.json after deleting Ink scenes" — `c4c01b5`

Your sync (`43dfdd3`) already worked: the test stalled on its first step because
`getByLabel("Properties JSON")` found nothing. React writes a textarea's initial value as its
text, so the wrapping label's text was "Properties JSON" + the whole JSON. Fix: `TextareaField`
names its textarea with `aria-label={label}` (screen readers already got the right name; now
every tool does). The test's assertions are untouched and it passes, with undo / redo, save,
reload and export. Checked: `update()` never short-circuited on `next === latest` before your
change either (`withMediaReferences` always returned a new object), so nothing regressed there.

### Not done / limits

- The examination fields and the camera's fine settings (duration, speed…) keep their old
  English-only labels (not new text, so left as they were).
- A layer hidden with the eye is forgotten when the dialog closes (by design: preview only).
- `site_changes.patch` shows as deleted in the working tree; not by me, left untouched.

### Pass 11 checks

| Commit                | Item                                     | Health (no coverage) |
| --------------------- | ---------------------------------------- | -------------------- |
| `a128c6b`             | 11-1 start area                          | 93.5                 |
| `f68f9e1`             | 11-2 ready-made toggle                   | 93.5                 |
| `cfce2dc`             | 11-3 picker tabs                         | 93.5                 |
| `52e8e10`             | 11-4 layers panel                        | 93.4                 |
| `c642195`             | 11-5 folded sections                     | 93.4                 |
| `c7ba7bb`             | 11-6 Description & caption               | 93.4                 |
| `0c87f9a`             | 11-7 Interactivity                       | 93.4                 |
| `d657f2a`             | 11-8 camera settings                     | 93.4                 |
| `013e0ff`             | 11-9 preset previews                     | 93.3                 |
| `c4c01b5`             | story.json sync test                     | 93.3                 |
| `0cb899c`             | order, Look on the page, Camera folded   | 93.3                 |
| `894293d`             | When to display the media; Interactivity | 93.3                 |
| `a4d6ec5` … `e3726d9` | dead export, camera heading, picker rows | 93.3                 |

After every commit: typecheck, lint, unit tests, the touched e2e specs, `fallow security` (0
items) and `fallow dupes` (none) passed (the only e2e failure until `c4c01b5` was your WIP
test). At the end: full chromium e2e, the coverage run and `fallow health --coverage` (summary
at the top); `fallow architecture` 0 issues, `fallow dead-code` 0 after `a4d6ec5`.

## Pass 12 — cleanup, REVIEW, performance (branches `chore/cleanup`, `perf/app`)

### How it was measured

`tools/measure-performance.ts` (committed) drives Chromium against the dev server on 4175:
fresh context per run, median of 5, timings stamped inside the page at the click and taken
on the frame after the expected state. React commits come from a devtools-hook stub; main-thread
time from Chromium's own counters (one protocol session per page). Sections: `reader` (reduced
motion), `readerMotion`, `readerWithDraft`, `combat` (fixture story), `editor` (real Orée project),
`bundle` (`dist/`). `--only` runs some sections.

Lessons: the machine's speed drifted by up to 2× during the day, so every change was measured
**back to back with the code stashed** on the same server. The browser "autosave long task" can
start after the save began; the store write was measured directly in Node with the real project
instead. Dev-server load times are dominated by unbundled modules.

### Decisions I made myself

- **Reader with an editor draft** (`cd40ef7`): uses the editor's published bundles only when they
  have the draft's own revision, so the deliberate "an invalid draft shows its errors" behaviour
  (e2e "retains invalid drafts…") is kept.
- **Game editor** (`5321c31`): with no starting ability left, the first two defined become the
  starting ones.
- **i18n** (`c4e08ad`): check/dice/equipment/combat-help texts now follow the interface language
  (like the rest of the combat window) instead of the story's locale.
- **Ink time slices** (`f78df23`, `ff5ffb0`): up to 20 × 50 ms; my first cap (100 slices) froze the
  editor preview 5 s on an endless loop, caught by `authoring.test.ts`.
- **Upload cache** (`08c7b8d`): kept until the page closes (`shortcut:` comment says when to evict).

### Changed test code (assertions kept)

- `presentation-session.test.ts`: reads narration progress with `getProgress()` instead of
  `getSnapshot().progress` (the value moved to its own store); same expectations.
- `inventory.test.ts`: renders through `I18nextProvider` and sets the language; it relied on the
  story locale; same expectations.
- `image-references.spec.ts` (`af66be4`, your request): the "loaded" wait required every layer to
  have a source, real pixels, three still frames and no running finite animation. References and
  threshold unchanged. `--repeat-each=5 --workers=4`: 44/50 before, 50/50 twice after.
- `reader-request.spec.ts` (`9c97462`, your request): the combat-ending wait is one retrying
  `expect(outcome.or(enabledButton)).toBeVisible()`. Cause (trace): `isEnabled()` waited for the
  button the last blow had removed, so the 2 s ending closed unseen. With/without `3c68dca`:
  2/120 vs 1/120 failures (same test, same line); after: 120/120, endings ×15: 60/60. Timeout
  unchanged (15 s).

### New tests

`app-path.test.ts`, `reduced-motion.test.ts`, `i18n.test.ts` (both languages have the same keys;
every failure has a text), `editor-store.test.ts` (none existed: revisions, conflict, 30 s
checkpoint rule, 30-version cap, invalid input refused), `compile-client.test.ts` (one worker,
answers by id, restart after 15 s), `game-authoring.test.ts`, `project-archive.test.ts`
(round trip with two uploads, one read at a time), and cases in `publication`, `ink-engine`,
`game`, `media-store`, `story` tests.

### Not done / limits

Listed in the summary's REVIEW table ("still open"). I prioritised the numbered issues and the
measured bottlenecks; the remaining section 3–5 items are smaller and untouched.

## Pass 13 — next steps (branch `chore/next`)

### Part 1 — editor history, one key per version (REVIEW #4 option a, approved)

- **Format** (`docs/DATA_CONTRACTS.md`): `house/record` = draft + publication + history index
  (`id`, `at`, `label`, `size`); each checkpoint's project under `house/version/<id>`. A write
  clones the draft (and one version when it adds a checkpoint), no longer 30 projects.
- **Budget (my choice):** 30 checkpoints and 64 M JSON characters, oldest dropped first, the
  newest always kept. The real Orée project is 2.3 MB, so it keeps ~27 checkpoints instead of 30;
  the 8 MB project limit means at most 8 checkpoints of the largest allowed project.
- **Migration:** on read, while the old `house` key exists it is the authority. The new keys are
  written in one transaction, read back and compared with the old record (JSON equality of every
  version), then `house` is deleted in a transaction that checks no other tab wrote to it. If any
  step fails: `console.warn`, and reads and writes keep using `house` (old format) until a later
  load succeeds; leftover new keys are overwritten by the next attempt (ids are 1…n).
- **Restoring a version** now reads it on demand (`readEditorVersion`) and validates it then;
  loading the editor no longer parses 30 projects.
- **Fixture:** `tests/fixtures/oree-editor-record.json.br`, a real record exported from Chromium
  by the old code (Orée 1.3.0, revision 5, two checkpoints, published en/fr bundles): 9.1 MB of
  JSON, 644 KB with Brotli (large window, the copies deduplicate). Read with `node:zlib`.
- **Perf tool:** the store-write section fills the history with 30 named saves (it waited for 30
  versions, which the budget now never reaches).
- **Measured** (`npm run perf`, Chromium, median of 5, same server, ~15 min apart):

  | Metric                                                    | Before | After  |
  | --------------------------------------------------------- | ------ | ------ |
  | one store write, full history, named save (`editorWrite`) | 669 ms | 73 ms  |
  | one store write, full history, autosave                   | 660 ms | 62 ms  |
  | editor autosave, "Saving" → "Saved" (2 writes + compile)  | 333 ms | 177 ms |
  | editor load                                               | 1075   | 1002   |

Changed test code (assertions kept): `editor-store.test.ts`, `default-project.test.ts` read a
checkpoint's project with `readEditorVersion(id)` instead of `history[i].project`;
`reader-request.spec.ts` "updates an old active Orée draft…" reads `house/record` and the
version key instead of `house` (it still seeds an old-format record, so it now also covers the
migration in a real browser).

### Part 2 — REVIEW section 3

Each fix has a test that fails without it (checked by stashing the fix and running the test).

- **Editor lockout after a schema change.** A stored publication that no longer reads is dropped
  (it is derived from the draft; the editor publishes again). A draft that no longer reads raises
  `UnreadableEditorRecord` with the stored revision; the editor's loading screen then explains it
  and offers **Download the saved project** (the raw record as JSON) and **Start from the
  original story** (replaces the draft at that revision; history checkpoints stay, each one is
  validated when restored). Nothing is deleted without the author's click. Tests:
  `editor-store.test.ts` (2), `editor.spec.ts` "after an editor update that no longer reads…".
  Limit: an *old-format* record whose history versions no longer read stays unreadable as a whole
  (the move needs every version); start again replaces only its draft.
- **Director re-present after a failed save.** After a failed page change (a transition: the
  presentation was cancelled, which drops the page's media bindings), the page is presented
  again under a new occurrence (`<old>:retry:<uuid>`, like `replay()`), so the keyed page view
  remounts and binds its videos and effect targets again; `restored: true` (no entrance). A
  failure without a transition (combat turn, check roll) keeps its occurrence, as before.
  Test: `director.test.ts` "presents the page again under a new occurrence…".
  Changed assertion: `game.test.ts` "retains the exact combat checkpoint…" expected the snapshot
  after a failed `restart()` to keep its `occurrenceId`; it now checks the same checkpoint
  (every other field), an occurrence `^<old>:retry:`, `restored: true`, and continues the fight
  with that occurrence. The checkpoint, save and RNG assertions are unchanged.
- **Settings parsed all-or-nothing.** `SaveManager.settings()` reads each field on its own:
  language and welcome sound fall back alone; each reading preference that no longer reads takes
  its default (required ones) or is dropped (optional ones); unknown keys are dropped. Before,
  one bad preference reset all of them (and the next save overwrote them). Test:
  `director.test.ts` "keeps every stored preference that still reads…".
- **`previousPages` memory.** The cap was already 20 pages (not 100 as REVIEW said), but each can
  hold a 500 KB Ink state, kept in memory and written with every save (10 MB per page turn at
  worst). Back pages are now also capped at 2 M Ink-state characters in total (oldest dropped,
  the last page always kept). Orée's state is ~1.3 KB a page, so it keeps all 20. Test:
  `director.test.ts` "keeps fewer previous pages when their Ink states are heavy…".
- **No-op wordmark button.** The header (with the wordmark) only shows on the welcome screen,
  where "go home" did nothing: it is now plain text, no longer a focusable button. Its
  `.reader-shell .site-header` / `.reader-shell .wordmark` rules could never match and are
  deleted. Test: `welcome.spec.ts` "the wordmark is the site's name…".
- **Hex colour regex `{3,8}`.** One `HexColorSchema` (`contracts/primitives.ts`): `#rgb` or
  `#rrggbb`, used by both effect schemas. Every colour in the shipped and test stories is 6-digit.
  Test: `primitives.test.ts` (fails with the old pattern, checked by swapping it in).
- **`usePreviewPlayer` reset — not changed.** Keeping the previous preview until the next one is
  ready is deliberate (`1932886`: live refresh without a flash). The old director is disposed
  only during the synchronous part of `createPlayer` (one cached module import), and the start
  knot always comes from the script's own outline, so a new player practically never fails. No
  test could observe the gap reliably; I left it.
- **"Preview from intro".** The editor opened on a hard-coded `intro` passage that the shipped
  story doesn't have. It now opens on the script's first passage (Orée: `matin-ville`). Test:
  `editor-tabs.spec.ts` "the editor opens on the story's first passage".
- **Two slug functions.** One `passageSlug()` in `contracts/story.ts` (the reader's rule: lower
  case, other characters → `-`, leading non-letters dropped, `start` if empty) is used by the
  reader (`ink-frame.ts`) and the editor (`ink-outline.ts`, `scene-script.ts`). A knot such as
  `2nd_floor` was `2nd-floor` in the editor (not even a valid ID) and `nd-floor` in the reader.
  Test: `scene-script.test.ts` "names a knot's passage as the reader does…".
- **`sameOriginFetch` byte limit on chunked responses.** With `maxBytes`, a body without a
  declared length is now counted while it is read and errors as soon as it passes the limit (a
  declared length over the limit is still refused at once). Test: `same-origin-fetch.test.ts`
  "stops reading a body without a declared length…". Changed test code (assertion kept): "answers
  an oversized declared body…" gave the same `Response` object to two fetches; it now gets a new
  one per call (a body can only be read once, and the first call now pipes it).
- **Illustration pack overwrote caption/examination.** "Apply new illustration pack" still takes
  the sample's picture and direction (image, layout, motion, illustration…) but keeps the author's
  `caption`, `photograph` and `examination` (including their absence). Alt text is on the asset,
  which the pack never replaced. Test: `illustration-pack.test.ts` "replaces a sample's picture…".
- **Volume slider wrote per `input`.** Every step still applies at once (sound follows the
  slider), but settings writes are coalesced: a write still waiting when newer settings arrive is
  skipped (each settings object is complete, so the last one carries everything). A fast drag of
  20 steps stored 20 times, now at most 2. Test: `side-panels.spec.ts` "dragging a volume slider…"
  (counts `reader-settings` writes after the last value is stored; checks it after reload).
- **Top-level `await` in `main.tsx`.** The settings read is still awaited before the first render
  (so the page appears in the reader's language, without a flash of English), but no longer than
  3 s: a database that never answers (blocked upgrade) opens the welcome with default settings
  instead of a blank page. The editor does use these settings (its i18n texts follow the reader's
  language), so it keeps waiting too. Test: `welcome.spec.ts` "the welcome opens even when the
  browser's storage never answers".
- **`line-${steps}` segment IDs.** An untagged line of an authored story was named after the
  number of Ink steps before it (blank lines included), so any edit above it renamed it. It is now
  named from its own text (`<passage>.line-<FNV-1a of the text, base 36>`, `-2`, `-3`… for repeats
  on the same page). Nothing stored refers to the old IDs: every line of Orée has a
  `# segment:` tag. Test: `ink-engine.test.ts` "names untagged authored lines from their text…".
  Docs: `DATA_CONTRACTS.md` (also the Back history size cap from the previous item),
  `story-editor/implementation.md`.
- **ReactBits safety overrides.** The `safety` table replaced authored values, so it also *raised*
  cheaper ones (30 particles → 60, 6 fps → 12, DPR 0.5 → 1, 10 threads → 30). It is now
  `react-bits/safety.ts` (`safeProps`): cost settings are ceilings (lower authored values kept);
  `flicker: 0` (photosensitivity) and `quality: "low"` stay fixed, as before. The schema still
  accepts higher values (narrowing it would reject stored projects). The editor now says, under
  Animation when a ReactBits effect is chosen, when readers see it (≥ 700 px wide, 4+ cores,
  WebGL, no data saver, motion allowed: not on most phones) and that it runs reduced and never
  flickers (en + fr). Test: `safety.test.ts` (the cost case fails with the old override, checked
  by running it against a copy of the old table).
- **README stale.** Rewritten against the current state: the Orée story, the editor, combat and
  rules, the four e2e browsers, `npm run perf`, the structure, assets and licences; dead links
  (`docs/phases2-3-report.md`) and "Coming soon" / "deferred" claims removed. No test (a doc).
- **Full `mediaLibrary` in the published `project.json` — no longer relevant:** library images are
  freely licensed and may be published with their catalogue (your instruction; AGENTS.md updated).
- **Unused library copies in `stories/house/media/`.** Checked: the build removed an unused
  library file from `public/stories/house/media/` but never from `stories/house/media/` (the
  copies kept so a fresh checkout builds). It now removes a library entry's kept copy once no
  page uses it, except when that copy is the entry's own source; other files there (narration
  sources) are left alone. Test: `publication.test.ts` "removes the copy kept beside the story…".
  The real build changes nothing today: every library copy there is used.
- **Old-story media deleted.** `stories/house/media/` held 114 files no page uses and that are not
  in the current catalogue, so no build rule could reach them: the earlier stories' images
  (`paper.*`, `heritage.*`, `tcp.*`, `shadow.*`, `unsplash.*`, `house.*`), their `sonniss.*` sounds
  and 77 narration clips no longer listed in `narration.json`. Nothing reads them (only their IDs
  appear in historical docs and test data). 11.6 MB; the folder goes from 143 files / 18 MB to
  29 / 6.1 MB. The story build and all unit tests pass; they remain in git history.
  **My miss, fixed in `test(editor)` below:** one e2e test uploaded
  `stories/house/media/sonniss.telephone.mp3` as "any MP3"; my reference check cut its output at
  three matches per file and hid it. The full chromium run caught it; the test now uploads the
  tracked `public/audio/keyboard-typing.mp3` (same assertions). A full untruncated search finds
  no other use of the deleted files.

### Part 3 — `docs/contributions.md`

Rewritten from the bundles and the catalogue: the story uses 18 sketch-pack images, 8 Sonniss
sounds (344 Audio ×5, CB Sounddesign, Epic Stock Media, Jake Fielding), the 2 original score
pieces and 1 generated English narration clip; the published library is 181 sketch-pack images,
344 Sonniss sounds (17 suppliers) and the 2 score pieces. Each with its licence and required
attribution (none required except the Chatterbox MIT notice); the app's own resources (keyboard
sound, Caveat, React Bits, OGL, Inky Web, Ace, dice, icons) in a second table. Removed: the old
story's entries (TCP, Heritage, the four house sounds, 72 clips), the unused
`public/licenses/tcp-CC-BY-3.0.txt`, the TCP-only check in `tools/verify-assets.py`, and the
TCP/Heritage paragraph of `ARCHITECTURE.md`. `verify-assets.py --published-only` passes.

Wording I chose for the sketch pack: "supplied by the project's author, who authorises their
publication" (the catalogue's `userAuthorization`; the generation manifest shows they were
generated for this project). I did not invent a licence name: **tell me if you want one stated.**

### Part 4 — test consolidation

- **Rules tests, one file per module.** `rules.test.ts`, `combat-log.test.ts` and
  `stat-breakdown.test.ts` became `actions`, `character`, `combat`, `enemy` and `random`
  `.test.ts` (`check-options`/`combat-options` already matched their modules); the hero, game,
  definitions and the "already fighting the guard" set-up, written out four times, are in
  `src/test-fixtures.ts` (the tests zone; a fixture beside the rules would cross the rules →
  character boundary). Every test and assertion is kept; "checkpoints deterministic unbiased dice
  and applies rank thresholds" tested two modules and is now two tests (`random`: same dice from
  the same checkpoint; `actions`: thresholds 5,4,3,2 and 1 XP). 501 → 502 tests.
- **`reader-request.spec.ts` split by feature** (956 lines, 24 tests) into
  `reader-pages.spec.ts` (pages, choices, checks, page presentation; 13), `reader-combat.spec.ts`
  (8) and `reader-saves.spec.ts` (old editor draft, check and encounter restored after reload; 3).
  Its private helpers are now shared in `oree.ts` (`enterReader`, `fixDice`, `settlePage`,
  `next`, `readUntil`, `reachCombat`, `fightToEnd`, `animationsOn`); new `speech.ts` (fake device
  voice) and `editor-db.ts` (read/write the editor's IndexedDB keys, also used by the editor
  lockout test). Every test ≤ 40 lines (the French chapter's per-duel checks are helpers). Same 24
  tests, all passing.
  Removed as duplicates: in "shows the item as a notification, fades the illustration…" (now
  "after an item, fades the illustration…"), the reward card text and "no window" checks, covered
  by `rewards.spec.ts` "an item shows a compact notification…" (card text) and its `acceptLetter`
  (the story goes on to `preuve` with no window). Nothing in `reader-data.spec.ts` overlapped.
  One check is unchanged but written differently: "plays instant-text illustrations…" still tags
  the running animations and checks the same ones keep running.
  `tools/run-test-coverage.ts` lists the three new specs instead of `reader-request.spec.ts`.
- **Typography: 17 e2e tests → 3 journeys (+ 1, see below)** (each of the old tests opened the editor and
  imported the story again). (1) "an author formats words with the toolbar and the keyboard…"
  runs the old toolbar/keyboard tests as steps on one editor (colours on a dark page, point sizes,
  one setting keeps the others / presets / Undo, formatting from inside a tag after Undo,
  shortcuts, shortcut messages, preset → preview → Undo/Redo → save → reload); (2) "in French, on
  a light page…" (French messages, paragraph alignment, light-page contrast warnings); (3) "the
  reader renders every style, alignment and size, on a computer and on a phone" renders a bundle
  compiled in the test, without the editor (styles, letters, handwriting, alignment and drop cap,
  weights and decorations, 24 pt following the reader's text size, 48 pt fitting a phone). All
  assertions kept; the logic itself is already unit-tested in `typography.test.ts` (parsing,
  formatting, patching, caret in markup, colours, point sizes, alignment). Changed: the rendering
  checks run in the reader instead of the editor's preview (same `StoryPlayer`); the 24 pt ratio
  is checked with the reader's own Text size control instead of the preview's; the
  `.fallow/typography-styles.png` screenshot (no assertion) is gone.
  Moved, unchanged: "the preview follows typing…", "a compile error while typing…" and "starts
  narration on every following page…" to `editor.spec.ts` (editor preview), "centers the Story
  Editor label…" to `welcome.spec.ts`. Shared: `typography-story.ts` (test story, opener, script),
  `speech.ts` (one fake voice instead of two).
- **Image specs merged into `image-editor.spec.ts`**: `media-workspace` (18 tests),
  `image-composition` (7) and `image-references` (10) became three `describe` blocks of one file
  (the Image dialog on Orée; composition on the house fixture, with its routes in its own
  `beforeEach`; Orée's references, Chromium-only as before), with one shared `caretTo` (the
  dialog tests had their own copy) and the snapshot folder renamed with the file. Moved to unit
  tests: "crops pale borders, preserves full frames and limits the output size" ran pure
  arithmetic in the browser; that arithmetic is now `cropOutput()` in `smart-crop.ts`, tested in
  `smart-crop.test.ts` (cap at 2048 px, whole picture kept), next to the existing `inkBounds`
  test; the browser cropping itself stays covered by `reader-pages.spec.ts` "shows a cropped
  illustration…". 36 → 35 e2e tests. Coverage list updated.
- **`src/contracts/scene3d.ts` kept:** `fallow dead-code --trace` shows `presentation.ts`,
  `story.ts` and `uploaded-media.ts` import it (not only tests).
- **Flaky `game-authoring.spec.ts` "inserts upstream Ink snippets…" (chromium, 1 in 10 under
  load):** "Declare Variable" inserts `VAR` at the top of the script (a global declaration) while
  the caret stays at the end; the test looked for "VAR" in Ace's rendered lines, which only hold
  what is in view, so it passed only when the view had not yet scrolled to the end. The app is
  right. The test now reads the script itself and expects it to start with `VAR ` (the same
  behaviour, more precisely). Diagnosed with a temporary spec (deleted): `VAR` at offset 0 in
  10/10 runs. Now 30/30 with `--repeat-each=10 --workers=4`.
- **Coverage check caught a measurement trap:** after the first consolidation, `TextToolbar.tsx`
  lost 14 covered statements although the journey uses every handler. Cause (probed with a
  coverage capture of that test alone): Chromium's JS coverage keeps only the scripts of the
  page loaded last, and the journey ended with a reload. The save-and-reload step is its own test
  again ("a preset previews on hover and survives … save and reload"), as it was before;
  typography is 4 e2e tests.
- **Coverage, before → after Part 4** (`npm run test:coverage`, unit + the listed chromium
  specs): statements 58.55 → 59.31 %, branches 65.25 → 66.05 %, functions 73.72 → 75.18 %
  (229 files; health 93 both times). Per file, three statements were hit before and not after,
  all early-return guards reached only by timing: `Noise.jsx` (component gone before its blob),
  `use-device-voices.ts` (hook disabled) and `audio-manager.ts` "unavailable" (no voice / aborted
  signal). The last is real behaviour, so it now has a deterministic unit test
  (`audio-manager.test.ts` "reports device speech unavailable…"). The coverage run also showed my
  Part 1 byte-budget test passing 5 s under instrumentation: it now has a 30 s limit (70 MB of
  real data).

### Part 5 — firefox, webkit, mobile

- **`image-editor` "cutting a // @media line…" (firefox, webkit) — test.** Firefox: the test asked
  for the `clipboard-read` permission, which only Chromium knows; Ace's keyboard cut and paste
  need none, so the grant is now Chromium-only. WebKit: the keyboard paste reaches Ace's textarea
  (probed: `paste` event, not prevented, focus kept) but Ace 1.2.6 inserts nothing, while a plain
  textarea pastes fine in the same browser: a WebKit-for-Windows/Ace clipboard gap, not our code.
  On WebKit only, the test pastes through Ace's own entry point (`editor.onPaste`); what it tests
  (the image and its settings come back with the line) is unchanged. **Test by hand: cut and paste
  a `// @media` line in real Safari.**
- **`side-panels` focus return (webkit ×2) — app.** Safari and WebKit do not focus a button on
  click, so the side panel remembered `body` as its opener and Escape left focus nowhere. A real
  Safari user (mouse, then keyboard) would lose their place. `ReaderSidebar` now falls back to the
  toggle that controls it (`aria-controls`). Passes on chromium, firefox, webkit.
- **`typography` colour picker (webkit ×2) — test.** Playwright's `fill()` on
  `<input type="color">` fires no `change` in WebKit; the toolbar applies a colour on `change`,
  which every browser fires when its native picker closes (a Safari user is fine). The test now
  sets the value and fires `input` + `change` itself, the same in every browser. 12/12 on
  chromium, firefox, webkit.
- **`reader-pages` "after an item, fades the illustration…" (webkit, 4/10 under load) — test.**
  You asked whether my (now reverted) scroll-key change caused it: no; with the change reverted
  it still failed 4/10 on webkit with 4 workers. It checked the old heading after a fixed 500 ms
  wait, by which time a loaded WebKit had finished the whole departure. It now holds the
  departure (pauses its animations, as "dissolves words upward…" already does), checks the old
  heading and the 920 ms illustration fade, then lets it play. 15/15 on chromium, firefox,
  webkit with `--repeat-each=5 --workers=4`.
- **`page-frame` "keys scroll the text without a click" (webkit) — app.** My first attempt
  (also scroll for keys pressed inside the text) was reverted on your instruction: it did not make
  the test pass. Found the second cause: after a toolbar click Safari/WebKit leaves the focus on
  `<body>`, outside the `<main>` that held the key handler, so End/PageDown never reached it. Two
  gaps a real Safari keyboard reader has: (1) a focused heading does not scroll its overflow
  container natively; (2) keys after a toolbar click go to `<body>`. The reader's scroll keys are
  now handled on the document, for keys from inside the reader or from `<body>` (not in the
  editor's preview, where `<body>` is the editor's), still leaving controls, windows, space on
  buttons and already-handled keys alone. `page-frame`, `side-panels`, `magnifier`, `reader`
  pass on chromium, firefox, webkit and mobile; editor and typography specs pass on chromium.
- **Process:** the fallow commit hook did not block a failing audit earlier (Part 1, Part 4); I
  run `fallow audit --base main` myself before every commit.
- **`audio-start` (webkit ×3) — test.** Probed: Playwright's WebKit for Windows has no
  `AudioContext` at all (`ReferenceError`; Safari has one), while `<audio>` plays MP3s fine. The
  test's recorder did `class extends window.AudioContext`, which threw and aborted the whole init
  script, so it never hooked `play()` either: hence "no music" too. The app already copes without
  Web Audio (`unlockAudio` catches). The recorder now wraps `AudioContext` only where it exists;
  the two "context started in the gesture" checks expect one context resumed in the gesture where
  the browser has Web Audio, none otherwise; every other check (sound effects on by default, the
  first sound plays, music and ambience time advances) is unchanged and now runs on WebKit too.
  12/12 on chromium, firefox, webkit, mobile except one firefox editor-load wait under the
  four-browser load (12/12 alone; watched in the final run).
- **`rewards` "at 390px the notification…" (webkit) — app.** Probed the boxes: on WebKit at phone
  width the new page's text started at y = −304 (Chromium: 112): after choosing at the bottom of
  a page, the next page did not return to the top. The reader relied on focusing the new heading,
  which scrolls it into view in Chromium but not in WebKit/Safari; a Safari phone reader would
  land mid-page. A new page now scrolls the window to the top, then focuses its heading without
  scrolling. `rewards`, `page-frame`, `reader`, `side-panels` pass on all four browsers; the other
  reader specs on chromium.
- **`image-editor` drag and drop, layers panel (webkit ×2) — app.** Probed with a minimal page:
  WebKit delivers HTML5 drag and drop (`dragstart`, `dragover`, `drop`) from a button or a div,
  but drops custom data types: `getData("text/x-picture")` is empty in `drop`, `text/plain`
  survives. Safari restricts custom drag types the same way, so a Safari author could not reorder
  layers by dragging. The layer row now travels as `text/plain` `listoire-picture:<index>`
  (anything else dropped there is ignored). 6/6 on chromium, firefox, webkit.
- **Mobile, test-side (typography, house, character, fixture-story):**
  - `typography` "a preset previews…": at phone width Ace soft-wraps inside `diagonal-up`, and
    the test read Ace's rendered lines; it now reads the stored script (as the other steps do).
  - `house` "…preferences persist" expected `font-size: 25px` for Large; phones use 22 px by
    design (a phone media query). It now checks that Large makes the text bigger than Medium.
  - `character` and `fixture-story`: on a phone the character panel is a full-width overlay, so
    the next tap on the story hit the panel (Playwright: "aside … intercepts pointer events") and
    the tests timed out. They now close the panel first, as a phone reader does; "the panel stays
    open from page to page" (it sits beside the text on wider screens) is checked off-phone only.
  All four pass on chromium, firefox, webkit, mobile.
- **`reader-combat` "two beats per turn, then the outcome between the portraits…" (mobile) —
  test.** Screenshot of the phone's combat ending: "Victory!" is centred on the 36 px gap between
  the portraits, wider than the gap, so its pill overlaps both, still legible (desktop: a 337 px
  gap, title inside it). The test required the whole title inside the gap. It now requires the
  title centred on the gap (±2 px) on every layout, and inside it whenever the gap is at least the
  title's width (so exactly as before on every desktop). 4/4 browsers.
  **Look by hand:** whether you want the phone's "Victory!" smaller, to fit between the portraits.
- **`image-editor` Image dialog on mobile (×3) — test, after an app attempt I reverted.** On a
  phone the dialog is one column and the preview scrolls with it. I tried keeping the preview in
  view (sticky stage, then sticky column): it fixed some tests and broke others (a grid item can
  only stick within its own grid area), so I reverted it rather than ship CSS I could not reason
  about. The tests now do what a phone author does: scroll up to the preview before dragging on
  it; "the preview stays visible beside its settings" is checked on two-column layouts only; and
  after enlarging to 1.45×, the phone's small preview clips the picture's top-left corner (as a
  desktop does for larger pictures), so the phone shrinks with the bottom-right corner. 76/76 on
  four browsers. **Your call:** whether the phone Image dialog should keep its preview in view.
- **Silent test runs (your request mid-session: you heard every voice).** Chromium and mobile
  start with `--mute-audio`, Firefox with `media.volume_scale = 0` (`playwright.config.ts`, so the
  local config inherits it); the perf tool's Chromium too. Device voices go to the OS speech
  engine, which those switches do not reach: an automatic fixture in `tests/e2e/test.ts` sets
  every utterance's volume to 0 in all browsers, and on WebKit (no mute switch) mutes each media
  element as it starts. Media still plays, so "music and ambience really play" and the volume
  checks still pass: audio-start, narration, house, welcome 80/80 on four browsers, the editor's
  narration tests on chromium.
- **`image-editor` references on mobile (×10) — references added, reviewed.** "mobile" is
  Chromium (Pixel 7), so the Chromium-only references ran there but existed only under the desktop
  project's name. I generated mobile references (your preferred option: real coverage of the
  phone layout) and reviewed them against Chromium's: the 11 "stored" references are identical
  byte for byte in value; the 5 "layers" references have the same layers (role, image, order,
  position, scale, rotation), boxes within 1 % of the frame (rounding on the smaller frame);
  the 5 reader pictures show the same composition (checked `chemin`, `bibliotheque` side by side).
  Stable: 40/40 with `--repeat-each=2` on mobile and chromium.

### Part 6 — REVIEW sections 4, 5, 8

- **§4 FR typo** "sauvegardees sont conservees" → "sauvegardées sont conservées" (`notesLoadError`).
