# Story Editor change review

What this change does: Adds source-position media, bounded cinematic presets, video backups and reference-conditioned voices to the existing editor. Reuses the actual reader for the docked preview and keeps narrative progression and saved state outside React.

Looks good. Ship. No unresolved must-fix findings remain after the fixes and checks in [verification.md](verification.md). Assumed load: one local author and a static reader.

## Accepted decision judgments

Fallow 3.38.1, base `HEAD` (`6c7809c`). 23 anchored judgments accepted, none rejected, no stale snapshot. Fallow validates anchors and freshness; the judgments below remain agent reasoning (`deterministic: false`), not graph-proven correctness.

This change splits into 4 independent slices along graph-proven seams: vendor search UI; application/contracts/editor/reader/runtime/persistence/build integration; localization; browser tests. This is orientation, not a requirement to split the change.

### `src/contracts/story.ts`

`src/contracts/story.ts` changes exports (BundleSchema, ReaderFailure, SaveSchema, SettingsSchema, StoryManifestSchema) imported by 5 files outside this PR. Does this change break or alter what those callers expect?

5 modules outside the diff consume this contract; changing its shape requires coordinating them.

**Judgment (fyi):** The 5 outside consumers retain the existing schema fields and defaults. mediaAnchors is optional and participates in coherent saved frames. Real Ink migration tests compare all original paragraphs and choices in both languages; save/reload tests retain the working checkpoint. No caller receives a new required argument.

Outside-diff callers: `src/contracts/editor-project.ts`, `src/persistence/save-manager.ts`, `src/test-fixtures.ts`, `tools/build-story.ts`, `tools/export-narration.ts`.

### `src/contracts/presentation.ts`

`src/contracts/presentation.ts` changes exports (ReadingPreferencesSchema, defaultReadingPreferences) imported by 2 files outside this PR. Does this change break or alter what those callers expect?

2 modules outside the diff consume this contract; changing its shape requires coordinating them.

**Judgment (fyi):** The 2 outside consumers src/app/App.tsx and src/contracts/editor-project.ts retain their existing preference shape. pageTurn is optional and defaults to the existing fast transition. Existing assets still parse; uploaded video identities require a matching hash/path/MIME/size and author rights attestation.

Outside-diff callers: `src/app/App.tsx`, `src/contracts/editor-project.ts`.

### `src/features/story-runtime/director.ts`

`src/features/story-runtime/director.ts` changes export (StoryDirector) imported by 2 files outside this PR. Does this change break or alter what those callers expect?

2 modules outside the diff consume this contract; changing its shape requires coordinating them.

**Judgment (fyi):** The 2 outside consumers src/app/ReadingSession.tsx and src/features/reader/CheckpointControls.tsx keep the same public methods. Only the optional presentation departure hook receives a direction. A regression test closes the director during departure and proves no pending choice advances or writes a checkpoint; Back restores the prior coherent save.

Outside-diff callers: `src/app/ReadingSession.tsx`, `src/features/reader/CheckpointControls.tsx`.

### `src/features/presentation/effects.ts`

`src/features/presentation/effects.ts` changes export (runEffect) imported by 2 files outside this PR. Does this change break or alter what those callers expect?

2 modules outside the diff consume this contract; changing its shape requires coordinating them.

**Judgment (fyi):** The 2 outside consumers src/features/presentation/HandwrittenText.tsx and src/features/presentation/MagnifiedImage.tsx keep the existing runEffect signature and cancellation behavior. Added camera/layer transforms restore saved styles on stop; timeline tests exercise completion, pause/resume, abort and reduced motion.

Outside-diff callers: `src/features/presentation/HandwrittenText.tsx`, `src/features/presentation/MagnifiedImage.tsx`.

### Verification for graph reach gaps

The guide reports 51 changed exports: 20 direct, 8 transitive, 3 none and 20 none-file; 6 export rows are omitted. These are import relationships, not execution coverage. The following review-here rows need the browser/build verification story because browser tests do not import application modules.

src/features/editor/media-references.ts: Fallow reports sceneMediaEntries=none; import reach is not execution coverage. Verification story: Authoring unit tests cover source reference insertion/removal and CRLF preservation; the editor browser flow hovers Scene Media and checks the Ace source highlight.

src/app/create-player.ts: Fallow reports createPlayer=none-file; import reach is not execution coverage. Verification story: The editor and normal reader browser flows instantiate the actual player, use isolated preview saves and resolve the restored video. No runtime save is replaced by preview.

tools/build-editor-project.ts: Fallow reports buildEditorProject=none-file; import reach is not execution coverage. Verification story: npm run build executes this real builder, preserves both original Ink digests and publishes only the licensed/digest-verified files. verify-assets independently checks all 80 published files.

src/contracts/cinematic.ts: Fallow reports atmospheres=none; import reach is not execution coverage. Verification story: Camera preset unit tests exercise bounded frames; the editor browser flow selects an atmosphere and applies a preset. The exported atmosphere labels are also inspected in the actual dialog.

src/persistence/media-store.ts: Fallow reports resolveMediaAsset=none; import reach is not execution coverage. Verification story: Binary storage unit tests verify hash/container rejection and ArrayBuffer round trips. The browser upload/export/delete-binary-store/import flow exercises object URL resolution through the reader; codec-limited WebKit checks preservation, with the codec error inspected separately instead of claiming playback.

src/features/editor/narration-authoring.ts: Fallow reports audioDuration=none-file; import reach is not execution coverage. Verification story: The browser human-recording and video flows exercise metadata extraction. Optional duration handles codec-limited browsers; the local Python service independently decodes and measures voice references.

src/features/editor/project-archive.ts: Fallow reports exportProjectArchive=none-file, importProjectArchive=none-file; import reach is not execution coverage. Verification story: The browser backup test removes the stored video bytes before importing the archive and verifies restored playback/preservation. Import validates every file before replacing the project; failed partial binary writes only leave immutable unreferenced bytes.

src/features/editor/StoryEditor.tsx: Fallow reports StoryEditor=none-file; import reach is not execution coverage. Verification story: The editor browser suite exercises autosave errors, language changes, history, source media, query transfer, resizing and preview controls. Automatic preview disables reader focus takeover so typing retains focus.

src/features/editor/EditorOverlays.tsx: Fallow reports EditorOverlays=none-file; import reach is not execution coverage. Verification story: Editor browser flows open settings, media, narration and history dialogs and close them with the exposed controls.

src/features/editor/NarrationDialog.tsx: Fallow reports NarrationDialog=none-file; import reach is not execution coverage. Verification story: Browser flows exercise human recording backup and custom AI voice settings; transport speed/volume are applied to preview audio. Real Python synthesis smoke checks are recorded separately and do not constitute human listening approval.

src/features/editor/MediaDialog.tsx: Fallow reports MediaDialog=none-file; import reach is not execution coverage. Verification story: The source-position browser flow inserts an image, changes its type/position, applies camera/atmosphere settings and inserts an uploaded video.

src/features/presentation/SceneIllustration.tsx: Fallow reports SceneIllustration=none-file; import reach is not execution coverage. Verification story: Reader/editor browser flows exercise source-ordered illustrations and real video playback in compatible engines. A session regression test waits for loadeddata before issuing a fullscreen cue; bind cleanup and scope abort remove pending listeners.

src/features/editor/MediaLibrary.tsx: Fallow reports MediaPicker=none-file; import reach is not execution coverage. Verification story: Editor browser flows browse the real vetted library, search catalog fields and choose an image; source catalogs remain private and unchanged.

src/features/editor/VideoUpload.tsx: Fallow reports VideoUpload=none-file; import reach is not execution coverage. Verification story: The browser flow uploads an owned MP4 fixture, publishes it, deletes its binary store and restores it from a complete backup. Max-size/MIME/container/hash checks are enforced separately; playback depends on browser codecs.

src/features/editor/CinematicFields.tsx: Fallow reports CinematicFields=none-file; import reach is not execution coverage. Verification story: The editor browser flow chooses an actual animated image preset, atmosphere and bounded parameters. Transform timeline tests verify the shared preset math; appearance was also inspected at desktop and mobile sizes.

src/features/editor/StorySettings.tsx: Fallow reports StorySettings=none-file; import reach is not execution coverage. Verification story: The editor browser flow opens settings and verifies story scope, language creation and the absence of the obsolete Chapter field.

src/features/editor/VoiceDesigner.tsx: Fallow reports VoiceDesigner=none-file; import reach is not execution coverage. Verification story: The custom-voice browser flow persists the selected model/profile and verifies exact synthesis parameters. Functional async updates preserve other settings while a reference file loads.

src/features/reader/ReadingControls.tsx: Fallow reports ReadingControls=none-file; import reach is not execution coverage. Verification story: Reader browser flows exercise replay, pause, preferences, Back and reduced motion without altering the committed narrative outcome.

src/features/editor/InkEditor.tsx: Fallow reports InkEditor=none-file; import reach is not execution coverage. Verification story: Editor browser flows type real Ink, undo/redo it and open a prefilled Find. SearchBox is created before the first header search, avoiding the asynchronous command race.

## Additional trade-offs

Abstained: no further unresolved taste questions were found. The requested 2D parallax fallback, native animation reuse, local storage and complete backups are documented choices; no additional architecture or dependencies were introduced.

## Deterministic remainder

Handled deterministically: 0 dead-code, 2 duplication, 56 complexity, 29 styling; not in the discussion. These are reported findings, not a claim all warnings were removed. The brief verdict is `warn`; no weakening signals were emitted.

Deprioritized: 8 units; use `fallow review --base HEAD --show-deprioritized` to expand them. Fifteen additional structural decisions were collapsed below the displayed cap of four.

## Limits

No production runtime coverage or policy rule packs are configured. Human listening approval, physical-device performance and Windows WebKit MP4 decoding were not established. Real Nano CUDA and Multilingual V3 CPU synthesis were checked; the earlier French GPU attempt failed in the native stack. Existing narration processes need restarting to load changed Python code. All generated clips remain previews.

Verdict: Ship within the documented editor and existing-runtime scope. The missing RPG combat/check executor remains an explicit limitation of the original specification, not a completed feature.
