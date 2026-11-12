# Refactor log

## ☀ Summary — Pass 12 (read this first)

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

## ☀ Summary — Pass 10 (previous session)

Branch `features/editor-ux`, 7 commits on top of Pass 9 (`b3484bb`), the last one being this
summary (nothing pushed, nothing on `main`). **Your five Image-dialog fixes are done, each in its
own commit with an e2e test, and the camera e2e failure is found and fixed.** Text toolbar 1c/1d,
Back after reloading and the other tabs' polish were already done in Pass 9 (summary below).

|                                         | Pass 9 end (`b3484bb`) | Now                                                                                             |
| --------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| Health (`--score --hotspots`), floor 92 | 93.5                   | **93.5** after every commit                                                                     |
| Unit tests                              | 459                    | **464** (+ the other writer's new ones, below)                                                  |
| E2E, chromium (full run)                | 132/133                | **136/137**: the camera test passes again; the 1 failure is the other writer's uncommitted test |
| `fallow security` / dupes / dead code   | pass / 0 / 0           | pass / 0 / 0                                                                                    |

### What was done

- **10-1** `84360d7`: an image starts as **one image** (one row, its own "Choose image"); **"+ Add
  layer"** (2 clicks) makes a layered scene, and only then do depths and the camera appear. A
  single image is stored as before (main image, no layers).
- **10-2** `699ce5b`: one way to choose an image: the layer's own **"Choose image"** (the
  preview's button and "Change…" are gone).
- **10-3** `41e75d8`: added or changed images show **whole** (additive `fit: "contain"`); a single
  image's **frame follows its shape** (portrait / landscape / square) until you pick a Frame;
  while editing, whatever goes **outside the frame shows faded** around it (the reader still
  crops there). Stored compositions draw as before (references 10/10).
- **10-4** `1cc913a`: **corner handles** on the selected image resize it from its centre, in
  the Size slider's steps; moving it by dragging is unchanged.
- **10-5** `c13952a`: a visible **×** on each layer ("Remove this image"), **Delete** in the
  preview, and **Undo** (or Ctrl+Z) after a removal.
- **10-6** `6cc1049`: the camera e2e. No code commit broke it: the test's image stopped being
  published when the media folder was rebuilt (Nov 9, 23:48). It revealed a reader bug, now
  fixed: **one image that fails to load kept the whole page's camera still**.

### ⚠ Needs you

- **Someone else is editing this checkout.** Uncommitted changes appeared during this pass that
  aren't mine: `src/features/editor/scene-script.ts` (+ test, new), `compiler.ts`,
  `use-editor-project.ts`, `tests/e2e/editor.spec.ts` (a new test, "synchronizes story.json after
  deleting Ink scenes…", which **fails**), `docs/story-editor/implementation.md`. The other
  Claude session on this machine (`listoire-4a`) says they aren't its own either. I didn't stage
  or commit any of it (in `editor.spec.ts` I staged only my own two lines). They are still
  uncommitted in your working tree. One slip: early in this pass I ran the formatter
  over all of `src` once, which may have reformatted those files (formatting only).
- From Pass 9, still true: a save written by this build is refused by an _older_ build (the
  optional `history`); old saves load fine.
- Some catalogue images aren't published locally (only 18 in `public/stories/house/media/`), so
  they appear broken in the editor's picker (e.g. "Misty conifer plain").

### Decisions I made myself (Pass 10)

- A new layer goes to the depth its catalogue entry suggests (scenery back, characters middle,
  framing plants front), in front when the catalogue says nothing; the first image goes to the
  back by default, as before.
- "Frame chosen by the author" = changed in this dialog session; a single image's frame then
  stays when its picture changes. Starter scenes keep their stored look (no `fit`).
- The faded outside lives in a ring that takes the column gaps, so the frame keeps its size
  (otherwise the 3D projection moved Orée's references by one rounding step). While something
  is outside the frame, the dialog lifts the paper-edge mask (it would hide the outside).
- Corner handles snap to 0.05 like the slider; the undo of a removal is forgotten as soon as
  anything else changes (it can never wipe a later edit).
- Camera: a failed image counts as settled; an image whose source is still resolving is still
  waited for. The test is unchanged.

### Screenshots and recordings (untracked, `review-screenshots/`)

- **Image dialog, before** (Pass 9): `pass9-after/image-new-empty.png`, `image-chemin*.png`,
  `image-built.png`, `image-two-clicks.webm`. **After** (Pass 10): `pass10-after/image-new.png`
  (one image), `image-choose.png` (its picker), `image-single.png`, `image-single-oversized.png`
  (faded outside), `image-three-layers-handles.png`, `image-removed-undo.png`, recording
  `image-flow.webm` (choose, + Add layer, resize by a corner, drag, Delete, Undo). Spec:
  `review-screenshots/pass10-image.spec.ts`.
- Other tabs, text toolbar: unchanged since Pass 9 (see its list below).

### How to try it

`npm run dev`, open `/editor`, Media → Image:

- **One image:** the left column shows "Image — No image yet — Choose image": choose one;
  "+ Add layer" adds another (then Front / Middle / Back appear, and the Camera list).
- **Choose:** every layer has its own "Choose image" (the only way).
- **Size:** a portrait character gets a portrait frame; raise Size: the parts outside the frame
  show faded around it; open More options → Frame to pick one yourself.
- **Handles:** drag a corner of the selected image; drag inside it to move it.
- **Remove:** the × on a layer row, or click the preview and press Delete; then Undo (or
  Ctrl+Z).
- **Camera fix:** a layered image whose file is missing still moves (the e2e "uses real
  perspective depth…" checks it).

## Pass 10 — Media → Image feedback, then what was left (branch `features/editor-ux`)

Your feedback on the new dialog (keep moving images in the preview), in five commits, each with
an e2e test; then the camera e2e failure (bisect and fix). Parts 1c, 1d, 3 and 4 were already
done in Pass 9 (see above), so nothing else was left from the original prompt.

**Another writer in the checkout.** While I worked, uncommitted changes appeared that are not
mine: `src/features/editor/scene-script.ts` and its test (new), `compiler.ts`,
`use-editor-project.ts`, `tests/e2e/editor.spec.ts` (a new test, "synchronizes story.json after
deleting Ink scenes…", which fails here), `docs/story-editor/implementation.md`. The other
Claude session on this machine (`listoire-4a`) says they aren't its own either. I didn't touch,
stage or commit them: every Pass 10 commit stages only my own paths. They do affect this pass's
checks (the health score and the coverage run include them, and that test fails).

### 10-1. A single image first; "+ Add layer" makes a layered scene

- The left column starts with **one row, "Image"**: an empty thumbnail, "No image yet" and the
  image's own **"Choose image"** button. That's a single image: no depth, no camera, no depth
  groups. Stored as today: the main image, `layers: []` (e2e checks the exported backup).
- **"+ Add layer"** (enabled once there is an image) opens the picker; one click on an image adds
  it as a layer: 2 clicks. From then on the panel is **"Layers, front to back"**, grouped Front /
  Middle / Back, each row with its own "Choose image"; the Camera list and the Depth select
  appear.
- **Decision:** a new layer goes to the depth its catalogue entry suggests (scenery at the back,
  characters in the middle, framing plants in front), in front when the catalogue says nothing;
  the Depth select or dragging its row changes it. The first image too (back by default, as
  before).
- Removed: the three per-depth "+ Add" buttons and "Start here" (and their strings).
- Tests: e2e "a new image is one image: choose it, and it is stored as a single image" and
  "+ Add layer makes a layered scene in two clicks, at the depth each image suits" replace "a
  new image starts with one clear step…" and "adds a picture at each depth in two clicks"
  (Pass 9): the flows they tested are gone by your request; the new ones check the same things
  (empty start, 2 clicks per image, depths, camera) plus the stored single image. Changed
  selectors only in "keeps the illustration visible…" and "…layered…" ("Add a picture in
  front" → "+ Add layer", picker "Add a picture: Front" → "Add a layer"). The new-image tests now
  start from the "chemin" page (they used the editor's default scene "intro", which Orée doesn't
  have and which the other writer's scene sync removes).

### 10-2. One way to choose an image: the layer's own "Choose image"

Removed: the preview's "Choose a picture" button (empty state) and the selected image's
"Change…" button. Each image row's "Choose image" is the only way to choose or change an image,
for the first image as for every other layer. The empty preview now says "Choose it on the left
with “Choose image”, or start from a ready-made scene:" and keeps the five starters (decision 2).
Strings removed: `empty.choose`, `empty.starters`, `change`.

Tests: e2e checks that a single image has exactly one "Choose…" button, a three-layer scene
three, and that a layer's own button changes that layer's image. Changed selectors only:
`editor.spec.ts` (two tests) and `image-composition.spec.ts` ("Choose a picture" → "Choose
image"). In `editor.spec.ts` I staged only those two lines (the file also holds the other
writer's uncommitted test).

### 10-3. Added images show whole; a single image's frame follows its shape; overflow shows

- **Why sizes looked wrong:** an image at the back filled the frame (`object-fit: cover`), so a
  picture whose shape differs from the 3:2 frame was cut; and a single untouched image was drawn
  at full width and natural height in the dialog (no cap), so it looked enormous and cut.
- **Format (additive):** optional `fit` on a picture (`contain` | `cover`), which overrides the
  depth's default. The dialog sets `fit: "contain"` on every image it adds or changes (first
  image, + Add layer, Choose image); Duplicate copies it. Stored compositions have no `fit` and
  draw exactly as before (the references hold). `DATA_CONTRACTS.md` updated.
- **Frame:** when a single image gets its picture, its frame becomes the picture's own shape
  (portrait / landscape / square, from the asset's stored dimensions: ratio > 1.15, < 0.87,
  else square), unless the author picked a Frame in this dialog (then it stays). Decision:
  "picked" means changed during this dialog session; an existing image's stored frame is kept
  until its picture changes.
- **Never silently cropped:** around the frame, a ring (in the column gaps, so the frame keeps
  its size) shows whatever goes outside the frame, faded; the reader still crops at the frame.
  While something is outside, the dialog lifts the paper-edge mask (it would hide the outside);
  the soft edge is back as soon as everything fits, and the reader preview beside the dialog
  always has it. A single untouched image is capped at 56 % of the screen height in the dialog.
- Starter scenes are kept as they are (no `fit`): they are ready-made compositions.

**Changed assertions** (both mine, Pass 9, `image-pictures.test.ts`): the promoted main picture
and the duplicate now include `fit: "contain"`, the behaviour this item asks for.

Tests: unit (new and changed images carry `contain`; `shapeOf`); e2e "an added image shows
whole, a single image's frame follows its shape, and overflow shows faded" (portrait frame for a
portrait image; at 2× the image goes 1.5× past the frame, the frame doesn't clip in the dialog
and has its veil, the reader preview still clips; a back layer added later is `contain`; a frame
the author picked stays when the image changes). References: 10/10.

Found: some catalogue images aren't published locally (only 18 `.webp` in
`public/stories/house/media/`; e.g. `sketch.misty-conifer-plain-001` returns the app's HTML),
so they show as broken in the editor. Not changed (local asset library).

### 10-4. Corner handles on the selected image

The selected image gets an outline and four corner handles in the preview, around the part
where its picture is drawn (not its letterboxed box). Dragging a corner scales the image from
its centre (away from the centre: bigger; towards it: smaller), in the Size slider's steps
(0.05) so both always show the same value; it never moves the image. Dragging inside the image
still moves it, the arrow keys too; the Size slider stays for precision. A single untouched
image has handles too (the first drag gives it a frame).

The preview measures, once per animation frame, where the selected image is drawn (the same
loop decides whether to show the faded outside, 10-3). It finds the image through a new neutral
attribute on the reader's planes, `data-layer` (0 = the main image), which changes nothing
drawn. Tooltip "Drag a corner to resize (the Size slider is more precise)" in en + fr.

Test: e2e "corner handles resize the selected image in the preview; the slider stays in step"
(four handles; bottom-right outward → bigger, slider equal; top-left inward → smaller; x
unchanged). References: 10/10.

### 10-5. Removing an image: a × on each layer, Delete in the preview, and Undo

- Each layer row has a visible × (the shared `CloseButton`), tooltip "Remove this image", named
  "Remove <image>" for screen readers. With the preview focused, **Delete** (or Backspace)
  removes the selected image. The selected image's "Remove" button is gone (one way to do it,
  as for choosing).
- **Undo:** after a removal, "Image removed: <name>. [Undo]" appears under the layers; Undo (or
  Ctrl+Z in the dialog, outside text fields) puts the image back where it was, selected.
  Decision: the undo is forgotten as soon as anything else changes, so it can never wipe a later
  edit; Cancel still discards everything, as before. Removing the main image makes the next
  layer the main one (Pass 9); removing the last one returns to the empty image.
- Strings: `removeHint`, `removed`, `undo` (en + fr); `remove` removed.

**Changed selector:** `image-composition.spec.ts` "upgrades legacy image layers…" removed the
selected fern with `/^Remove /`; with a × on every layer that matches two buttons, so it names
"Remove Fern fronds".

Test: e2e "removes an image with its × or Delete in the preview, and Undo brings it back" (×
with its tooltip, the status line and Undo; Delete then Ctrl+Z; Undo gone after another change).

### 10-6. The camera e2e failure: found and fixed

`image-composition.spec.ts` "uses real perspective depth, pauses camera motion…" failed every
time since Pass 9 began (0 camera animations instead of 3).

**Bisect:** reverting my code didn't change it (Pass 9 log), so I looked at what the test reads
instead of commits. Its main image, `sketch.misty-conifer-plain-001`, is not published locally:
`public/stories/house/media/` holds only the images the story uses (18), and was last rebuilt on
Nov 9 at 23:48, during Pass 8, by `tools/build-editor-project.ts`, which removes images the story
doesn't use. The story never used that image (`git log -S` finds it only in the commit that added
the catalogue), so it disappeared at that rebuild, and the request returns the app's HTML. The
test passed in Pass 8's earlier runs because the stale file was still there. No code commit is
"the bad one".

**The defect it reveals (reader):** before starting a camera movement, the reader waits until
every image of the illustration has loaded with a non-zero width. An image that fails to load is
"complete" with zero width forever, so **one missing file kept the whole page's camera still**,
silently. Fix (`scene-playback.ts`): an image that failed (it has a source but no pixels) counts
as settled, and the reader re-checks on `error` as well as `load`; an image whose source isn't
set yet (still resolving) is still waited for. The test itself is unchanged and passes again
(3/3).

Tests: unit "starts an illustration's camera when one of its images fails to load, not before
sources are set" (fails on the old code); e2e the camera test 3/3; reader suites 57/57.

### Pass 10 checks

| Commit    | Item                                                    | Score |
| --------- | ------------------------------------------------------- | ----- |
| `84360d7` | 10-1. one image first, + Add layer                      | 93.5  |
| `699ce5b` | 10-2. one way to choose an image                        | 93.5  |
| `41e75d8` | 10-3. whole images, frame follows shape, faded overflow | 93.5  |
| `1cc913a` | 10-4. corner handles                                    | 93.5  |
| `c13952a` | 10-5. × / Delete / Undo                                 | 93.5  |
| `6cc1049` | 10-6. camera: a failed image no longer stops it         | 93.5  |

`fallow security --gate new`: pass after every commit; `fallow dupes`: 0. The coverage runs
include the other writer's uncommitted files (their new test fails each time). Two coverage runs
were repeated: the REVIEW #8 Ink timing flake (`house.test.ts`) once, and the lazy `Noise.jsx`
capture race (handled by dropping source-less browser entries before merging). Full Chromium
e2e at the end: 136/137 (the failure is the other writer's test).

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
