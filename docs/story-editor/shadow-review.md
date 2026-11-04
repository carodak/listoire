# Shadow-art change review

What this change does: Replaces the banner/photo first pass with the requested left-text/right-illustration reading layout and three original shadow-art images. Refreshes known default artwork in old drafts without replacing user text, custom covers, narration or gameplay saves.

Looks good for the requested visual change within the stated limits. Global code health is still B 78.7; this review does not claim the pre-editor A grade was restored. Expected load: one local author and a static reader. See [shadow-art.md](shadow-art.md) for exact measurements, prompts and verification.

## Accepted decision judgments

Fallow 3.38.1 against HEAD; 14 anchored judgments, all fyi. Final post-validation checks emitted anchors and freshness; reasoning stays agent judgment (`deterministic: false`), not a guarantee of correctness.

### `src/contracts/story.ts`

`src/contracts/story.ts` changes exports (BundleSchema, FrameSchema, LocaleSchema, ReaderFailure, SaveSchema, SettingsSchema, StoryManifestSchema) imported by 9 files outside this PR. Does this change break or alter what those callers expect?

9 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 9 outside callers retain their existing bundle/save shape; cover is optional and must resolve to a registered image. The real bilingual Ink path tests keep the same digests, facts and checkpoint boundaries. No new gameplay field or required method argument is introduced.

Outside-diff callers: `src/contracts/editor-project.ts`, `src/features/story-runtime/bundle-loader.ts`, `src/features/story-runtime/director.ts`, `src/features/story-runtime/ink-engine.ts`, `src/persistence/save-manager.ts`, `src/test-fixtures.ts`, `tools/build-editor-project.ts`, `tools/build-story.ts`, `tools/export-narration.ts`.

### `src/contracts/presentation.ts`

`src/contracts/presentation.ts` changes exports (ReadingPreferencesSchema, RuntimeAssetSchema, SceneSchema, defaultReadingPreferences) imported by 6 files outside this PR. Does this change break or alter what those callers expect?

6 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 6 outside callers retain their existing schemas and preferences. The added mediaIsVisible predicate shares delayed/revealed/expired decisions between rendering and playback. Its unit test checks hidden media, explicit visibility, reveal-all and expiration; existing session tests check that hidden/expired videos do not resume.

Outside-diff callers: `src/app/App.tsx`, `src/contracts/editor-project.ts`, `src/contracts/presentation-validation.ts`, `src/contracts/uploaded-media.ts`, `src/features/editor/EditorOverlays.tsx`, `src/features/editor/VideoUpload.tsx`.

### `src/features/presentation/presentation-session.ts`

`src/features/presentation/presentation-session.ts` changes export (PresentationSession) imported by 3 files outside this PR. Does this change break or alter what those callers expect?

3 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 3 outside callers src/app/ReadingSession.tsx, src/app/create-player.ts and src/features/reader/ReadingControls.tsx keep the same session API. The shared predicate now permits reveal-all media while still excluding expired blocks. Video binding still waits for data and removes listeners/object URLs on departure; browser tests exercise pause, skip and cancellation.

Outside-diff callers: `src/app/ReadingSession.tsx`, `src/app/create-player.ts`, `src/features/reader/ReadingControls.tsx`.

### `src/features/editor/compiler.ts`

`src/features/editor/compiler.ts` changes exports (compileLanguage, compileProject) imported by 2 files outside this PR. Does this change break or alter what those callers expect?

2 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 2 outside callers src/features/editor/compiler.worker.ts and tools/build-editor-project.ts keep the same compiler signature. The existing language-specific Cover setting is copied into optional validated bundle metadata. Original EN/FR digests and all original branches remain unchanged; no renderer callback owns Ink progression.

Outside-diff callers: `src/features/editor/compiler.worker.ts`, `tools/build-editor-project.ts`.

### Verification for import-reach gaps

The guide measures 15 changed exports: 6 direct, 2 none and 7 none-file. Browser tests do not import application modules; import reach is not execution coverage.

src/features/editor/media-authoring.ts: guide reports mediaContext=none, not measured execution coverage. mediaContext still supplies the selected media, scene segments and trigger to the same dialog, and now resolves the preview URL once. The browser image/video and animation flows exercise the real dialog and preserve source placement.

src/features/editor/artwork-refresh.ts: guide reports hasLegacyArtwork=none, not measured execution coverage. hasLegacyArtwork is reported as none by import reach. Verification executes it through the refresh tests with original project fixtures: preserve text/title/narration/custom cover, map the photograph/hotspot, reject partial replacement sources, retain null-source drafts and ensure idempotence. The browser imports an old project and verifies both new images and retained author content. Only known default identities are replaced.

src/features/editor/EditorHeader.tsx: guide reports EditorHeader=none-file, not measured execution coverage. The browser flow verifies EN in less than 75 pixels, Add Language at the bottom and language switching with retained titles. Display labels change; locale values and editor callbacks remain unchanged.

src/features/editor/MediaDialog.tsx: guide reports MediaDialog=none-file, not measured execution coverage. The editor browser flow browses the real library, inserts a source-position image and video, changes type/position/camera options and restores a complete video backup. Form parsing and source selection have separate responsibilities; they retain schema validation before application.

src/features/editor/MediaLibrary.tsx: guide reports MediaPicker=none-file, not measured execution coverage. The real library browser flows search by asset identity, choose the shadow photograph and retain video preview/restore. Type lookup replaces nested type selection; selected-item text retains the alt/id fallback.

src/features/editor/NarrationDialog.tsx: guide reports NarrationDialog=none-file, not measured execution coverage. The browser flows persist selected synthesis settings and upload/back up a human recording. Generated audio keeps bounded fetches, abort signals, text/audio digest checks and preview status; the new cache helper has explicit missing/oversized-response tests. No new synthesis or human listening approval is claimed.

src/features/editor/StoryEditor.tsx: guide reports StoryEditor=none-file, not measured execution coverage. The editor browser suite exercises source edits, search, history, failed drafts, old-project import and preview. Selected-media dispatch is separated from command opening without changing cursor capture, shared IDs, undo or publication validation.

src/features/editor/use-editor-project.ts: guide reports useEditorProject=none-file, not measured execution coverage. Load uses a validated default project only when default artwork needs refreshing; fetch failure keeps an existing draft. Import/restore can use the current project art without replacing authored text. Unit checks verify missing-source atomicity and idempotence; the browser import flow preserves the edited title and source note, then previews and exports the refreshed project. Serialized revision-safe saves and history remain in the existing store.

src/features/presentation/SceneIllustration.tsx: guide reports SceneIllustration=none-file, not measured execution coverage. Fullscreen dialog lifecycle, video surface state and depth/effect layers are separated. Browser flows exercise real photograph magnification, layer presets, video restore/playback, cinematic skip and normal reading. DOM refs are attached before the parent binds effects; modal focus returns after completion. Codec limitations remain explicitly reported.

src/features/reader/StoryPlayer.tsx has scoring_budget 11 and outside caller src/app/ReadingSession.tsx. Reader toolbar owns disclosure state; narrative state remains in StoryDirector. The artwork is decorative and pointer-transparent; books without a cover retain a full reading column. Browser geometry checks verify text left/art right, actual decoded artwork and responsive layout. Preview omits Back and focus takeover while the normal reader preserves them.

## Additional trade-offs

Abstained: no unresolved additional architectural question is needed for the requested theme. The user explicitly requested replacement illustrations; only known default art is refreshed and custom assets remain unchanged. The remaining historical hotspot penalty is reported as unresolved maintenance risk, not hidden by a baseline or threshold change.

## Deterministic remainder

Handled deterministically: 0 dead-code, 0 duplication, 43 complexity, 38 styling; not in the discussion. Audit verdict: warn; zero blockers does not mean zero warnings.

Deprioritized: 7 units; use `fallow review --base HEAD --show-deprioritized` to expand them. CSS, image content and metadata were also inspected directly.

Not checked: physical-device frame-rate, subjective art approval or renewed human listening of unchanged audio. No production runtime coverage or policy rule packs are configured. Verdict: Ship the visual change; global code-health debt remains explicitly open.
