# Story media and 3D scene review

This records the initial media/3D slice. The subsequent interactive workspace and
its current verification are reviewed in [workspace-review.md](workspace-review.md).

What this change does: Extends the existing Media dialog with reusable 3D illustrations,
using the existing placements, timing and cinematic presets. It also completes the
pending reset, examination, per-page artwork, background-color and media-catalog fixes.

Reviewed for one local author and a static book reader: input validation, caller
compatibility, cancellation/disposal, backup integrity, Ink/save isolation and lazy
rendering. Three.js is confined to authoring/experiments; the reader uses cached media.
The physical GPU/mobile performance limit is explicit in the experiment README.

## Accepted Fallow judgments

Fallow 3.38.1, base HEAD `2300719`. The pinned snapshot is retained in `.fallow/scene3d-guide.json`.
Seven judgments were accepted; none were rejected or stale. Fallow validates anchors
and graph freshness, not the correctness of the agent's reasoning. All framing below
is agent judgment (`deterministic: false`).

The graph ranks this as a high-risk change with three independent slices: the main
application/contracts/experiments/tools, localization, and browser tests.

### src/contracts/story.ts

`src/contracts/story.ts` changes exports (BundleSchema, FrameSchema, LocaleSchema, ReaderFailure, SaveSchema, SettingsSchema, StoryManifestSchema) imported by 6 files outside this PR. Does this change break or alter what those callers expect?

6 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 6 outside consumers still use the same save/Ink contract. New optional composition metadata is checked against registered model roles and actual clip names. Cached output remains an existing image/video type; model3d is excluded from narrative display targets. scene3d.test.ts rejects missing subjects, excess elements, external resources, unsupported compression, excessive geometry, invalid hierarchies, incompatible roles and invented clips. Legacy bilingual story fixtures and checkpoint integration tests pass.

### src/contracts/editor-project.ts

`src/contracts/editor-project.ts` changes exports (PublishedProjectSchema, StoryProjectSchema) imported by 6 files outside this PR. Does this change break or alter what those callers expect?

6 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 6 outside consumers keep their existing signatures. layerRoles is optional catalog metadata; old drafts remain accepted. The existing archive and IndexedDB paths preserve GLBs and cached output with their hash, MIME, size and rights. The new browser flow imports character/background models, composes all three styles, inserts a still and restores its editable scene from a complete backup. prepare-scene-media also bounds total uploaded bytes to retain room inside the existing 200 MB archive limit.

### src/features/editor/media-references.ts

`src/features/editor/media-references.ts` changes exports (editMediaScript, mediaReferenceLine, sceneMediaEntries, withMediaReferences) imported by 3 files outside this PR. Does this change break or alter what those callers expect?

3 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 3 outside callers are StoryEditor.tsx, StoryOutline.tsx and use-editor-project.ts. sceneMediaEntries now identifies cached 3D composition assets before testing their underlying image/video type, retaining existing media IDs and references. Fallow reports this export as test_reach=none, which is not execution evidence. tests/e2e/scene3d.spec.ts exercises creation, source-position insertion, library reuse and archive restoration in Chromium/mobile emulation; the normal editor navigation and reference workflows are exercised across all four browser projects.

### package.json

`package.json` adds 2 third-party dependencies (`@types/three` (dev), `three`), imported by 10 in-repo modules. What does each replace, and who owns the new surface?

Takes on 2 new maintenance and supply-chain surfaces; 0 in-repo modules outside this diff already import the added packages.

The 10 importers belong to the isolated Three.js experiments and geometry tests; no unchanged module imports these new dependencies. three supplies the renderer, GLB loader and material/shadow support; @types/three supplies development types. The same renderer and material helper serve the courtyard and media composer. The reader consumes cached image/video through existing presentation components. The lazy renderer chunk remains about 635 kB minified (159 kB gzip), with no claim of measured physical GPU performance.

### Lifecycle, export and test evidence

render.ts is a new isolated renderer. It rejects architecture overlap and unavailable animation clips, catches shader compilation failure and releases model geometry, materials, textures, mixers and WebGL state on failure/disposal. Per-generation canvases avoid losing a newer context during an older asynchronous cleanup. The real WebGL browser test now checks console errors when switching Toon/Painterly/Sketch; this caught and fixed the missing fragment varying. Physical GPU and Firefox/WebKit authoring remain unmeasured.

export.ts bakes static WebP or browser-encoded video; the book continues to use existing media playback, visibility and bounded cinematic events. Model mixers and camera sampling are separate. Cancellation aborts the recording before the editor applies a project change; browser encoding failures leave the open composition editable. readUploadedMedia verifies the file hash before reuse. The animation browser flow verifies the actual Idle clip, real camera preset, portrait video dimensions, decoding and manual playback under reduced motion.

presentation-session.ts has 9 importers in the focus map. Reset cancels presentation/background scopes, stops audio and clears paused clocks; persistence starts only when the corresponding media is reached/visible. director and session tests plus the four-browser paused-reset and cinematic completion flows verify this behavior. NarrationManager now receives explicit editorPreview context so ordinary reading uses the normal local narration endpoint.

## Additional trade-off (not graph-validated)

Observed: `src/experiments/book-scene3d/export.ts` records animated output in the browser.
The composition, imported files and cached output remain in the existing project archive.
Inference: this keeps the experiment local and normal reading lightweight, at the cost
of real-time export and browser-dependent codecs. Under what authoring/device conditions
would a separate offline export step become necessary? This is a future product choice,
not an approval blocker for the requested local feasibility slice (`captured: true`,
`deterministic: false`).

## Deterministic results and remaining health debt

Handled deterministically in the brief: 0 dead-code issues, 0 duplication groups, 65 complexity findings, 40 styling findings. These are outside the judgment discussion.

Deprioritized by Fallow: 18 files; available in the local JSON guide.

The changed-code audit gate passes (exit 0). Architecture reports no boundary/cycle
violations (exit 0). No thresholds or ignore lists were weakened. The build-script
JSON/log duplication was replaced by `tools/write-bundle.ts` after tracing its consumers.
The whole-project health score remains **B / 78.3**, not A: penalties are hotspots 10,
large functions 10 and coupling 1.7. Large existing editor/runtime functions and change
history remain work; this experiment does not claim to have removed that debt.

Fallow's test reach has 21 direct, 5 transitive, 2 none and 33 none-file export rows.
Browser flows execute the UI without importing those files, so none-file is not proof
that UI behavior ran or did not run. Two newly added authoring tests explicitly skip
Firefox/WebKit; Fallow flags those additions as test-weakening candidates. Existing
browser scenarios were retained in all four projects. Physical device authoring and
Firefox/WebKit 3D authoring are not claimed as verified.

## Verification

- Typecheck, Oxlint, Oxfmt and 166 unit/integration tests pass.
- Production build passes; the lazy Three.js/material chunk is approximately 635 kB
  minified / 159 kB gzip, and still emits Vite's 500 kB warning. It is not requested
  by normal reading. No bundle-size threshold was relaxed.
- Published media validation passes: 81 files, 3,213,045 bytes.
- The broad browser run executed 160 cases: 145 passed, 4 new 3D authoring cases were
  skipped and 11 failed. Follow-up runs repaired the failures: current-page image
  selectors, bounded cinematic timing, engraving contrast and mobile toolbar overlap.
  A 24-case follow-up had 14 passes, 6 failures and 4 skips; those six failures were
  then fixed. The latest run of the 12 affected story/cinematic/navigation cases
  passes in Chromium, Firefox, WebKit and mobile emulation. The 3D import/style/cache/
  archive and animated-video flows pass in Chromium and mobile emulation, with
  Firefox/WebKit authoring explicitly skipped. These are results across runs, not
  a claim that the first broad run was entirely green.
- The standalone Synty check passes Toon, Painterly, a six-second camera move and
  Replay, with no JavaScript or WebGL console errors. Real WebGL style switching is
  also checked by the new composer browser test; a fragment-varying bug was found
  and fixed during this review.

Verdict: Ship as the requested isolated local experiment. No unresolved correctness
finding remains in the reviewed flows. This is not production art or a measured
physical-GPU/mobile authoring guarantee.
