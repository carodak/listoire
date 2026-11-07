# Illustrated media workspace review

What this change does: Keeps authoring in the normal `/editor` Media interface.
The existing 3D composer supports places and optional subjects. Image authoring adds
26 supplied paper illustrations, searchable depth-layer selection, three starting
compositions, six reading presets, per-layer crop/scale and the existing five layouts.
The reader supports warm/custom paper, irregular feathering, compositing and text
wrapping. Example directions use still images and inline/right/fullscreen multiplane
illustrations while preserving Ink, audio, the approved photograph and cover.

Reviewed for one local author and a static reader: validation, persistence, archive
integrity, cancellation, narration independence, reduced motion and reading comfort.
The entire uncommitted workspace includes the preceding 3D/editor milestone and is
classified high risk by Fallow. This is a review of the changed code, not a claim of
production runtime coverage or a full browser-suite run.

## Structural decisions

The final guide and post-validation are `.fallow/parallax-guide.json` and
`.fallow/parallax-validated.json`. Fallow validates graph anchors and freshness;
reasoning and test conclusions below are agent judgment, `deterministic: false`.

### src/contracts/story.ts

`src/contracts/story.ts` changes exports (BundleSchema, FrameSchema, LocaleSchema, ReaderFailure, SaveSchema, SettingsSchema, StoryManifestSchema) imported by 6 files outside this PR. Does this change break or alter what those callers expect?

6 modules outside the diff consume this contract; changing its shape requires coordinating them.

The six outside consumers retain the story/save version and Ink contracts. Optional illustration composition is image-only, finite and reference-checked. Reader paper preferences remain separate from checkpoints; bilingual progression and restoration still pass.

### src/contracts/editor-project.ts

`src/contracts/editor-project.ts` changes exports (PublishedProjectSchema, StoryProjectSchema) imported by 5 files outside this PR. Does this change break or alter what those callers expect?

5 modules outside the diff consume this contract; changing its shape requires coordinating them.

The five outside consumers retain the same archive version and upload identity. Composition data and its image dependencies round-trip through the existing project schema and complete-backup workflow. Offline failure preserves the saved draft; source-pack application uses the loaded seed synchronously.

### src/features/editor/EditorDialog.tsx

`src/features/editor/EditorDialog.tsx` changes export (EditorDialog) imported by 3 files outside this PR. Does this change break or alter what those callers expect?

3 modules outside the diff consume this contract; changing its shape requires coordinating them.

The three outside consumers keep the native modal default. 3D authoring alone uses the docked variant; image composition uses the normal Media dialog and existing searchable gallery. Browser flows exercise nested selection, crop controls, import and focus recovery.

### package.json

`package.json` adds 2 third-party dependencies (`@types/three` (dev), `three`), imported by 13 in-repo modules. What does each replace, and who owns the new surface?

Takes on 2 new maintenance and supply-chain surfaces; 0 in-repo modules outside this diff already import the added packages.

The 13 importers use the installed Three renderer for authoring and the isolated Synty experiment. This image-layer increment adds no dependency. Ordinary reading uses optimized image/video assets and the existing EffectsEngine; multiplane projection does not load a Three scene.

## Changed-code review

- The strict illustration contract checks finite bounded placement, six-image limits,
  unique references including the base, image types, Inline-only wrapping, and mutually
  exclusive legacy/composed layers. Shared-language edits copy every dependency.
- Camera movement stays in the existing EffectsEngine. Per-plane perspective sampling
  gives foreground/middleground/background distances 800/1600/5333.33 and tracking
  ratios 1/.5/.15. Explicit projection fixes flattened CSS 3D in Windows WebKit.
  Dolly changes apparent scale by distance; Character Focus stabilizes the mid plane.
  This is authored 2.5D art, with no inferred geometry or unseen pixels.
- None holds fullscreen pictures still for a bounded event. Pause, replay, departure,
  reduced motion and cinematic completion retain ownership of cancellation. Native
  video controls and cached silent 3D-video behavior remain distinct.
- Draft initialization appends missing gallery entries. Updating example directions
  is explicit and undoable. Its source is cached during loading; the command has no
  pending fetch that could overwrite later edits. Text, audio and uploaded pictures
  are retained. A test applies the cached pack while its endpoint is unavailable.
- Paper compositing uses the selected page luminance; reader color overrides the
  story default and persists across reload. The irregular SVG stretches to portrait
  frames, preserving heads/feet. Paper-wide spacing avoids overlap with preceding text.
- A static, unscaled isolated cutout can use its actual alpha contour for wrapping.
  Cropped/composed illustrations use a conservative polygon and become full-width on
  narrow screens. Soft atmospheric overlays are shared with the composition preview.
- The source pack is unchanged and totals 26 optimized WebPs (4,292,290 bytes).
  Catalog hashes verify source and runtime files. User authorization is recorded
  separately from provider verification; original PNGs/source catalogs stay local.
- Fallow's React `none-file`/transitive test-reach labels are static graph evidence,
  not executed coverage. Verification for React surfaces is the focused browser
  flows below; no production telemetry or runtime coverage was enabled.

## Trade-offs, not graph-validated

Observed: image planes are projected analytically at authored distances, then drawn
through the existing DOM effect pipeline. Inference: this preserves depth on software
Safari and keeps reading light, while limiting the result to the pixels supplied by
the layered artwork. Under what art-direction requirements would a mesh-based,
rotatable illustration become necessary? This is a captured agent judgment, not a
Fallow finding. The six named presets are application tunings based on Adobe's
multiplane/camera techniques, not an imported commercial preset library.

## Verification

- Typecheck, Oxlint, Oxfmt, production build and 182 unit/integration tests pass.
  Contract/archive tests cover validation, shared assets, explicit pack updates,
  legacy layer conversion, fixed fullscreen images and camera projection.
- 44 browser cases pass across Chromium, Firefox, WebKit and Pixel emulation:
  composition/crop/backup, native image/video authoring, imported legacy drafts,
  story settings, bilingual branches, reader preferences, wide layout, right-page
  back/replay, bounded cinematics and per-plane differential movement.
- The final three composition flows are rerun on all four projects (12 passes),
  including cached pack application during an endpoint failure. Four additional
  geometry checks verify the paper-wide image clears its preceding text. The
  existing scenery-only 3D/editorial-blend flow passes in Chromium and mobile (2).
- Source and optimized hashes are verified for all 26 new pictures. Publication
  verification finds 107 selected media files / 7,505,335 bytes, with no raw catalog,
  archives or source PNGs exposed. Original Ink and translated branch fixtures pass.
- Fallow audit and architecture exit 0. Audit verdict is warn: 0 dead-code issues,
  0 duplicate groups, 103 complexity findings, maximum cyclomatic complexity 20.
  No threshold, ignore or telemetry setting was relaxed. Whole-project health is
  B / 77.9 (hotspot and unit-size penalties 10 each, coupling 2.1).
- The guide deprioritizes 21 files; `--show-deprioritized` exposes them. Final review
  judgments are post-validated against the current graph; their reasoning stays
  non-deterministic. The existing lazy Three/material chunk still exceeds 500 kB.

Verdict: Ship within the local illustrated-media scope. Physical GPU/mobile-device
performance is not measured. General 3D authoring in Firefox/WebKit and the full
browser suite were not rerun. Previously baked 3D renders retain their source data;
updating their model/material requires an explicit author Apply. Source cutouts and
backgrounds are authored layers; the renderer does not synthesize missing content.
