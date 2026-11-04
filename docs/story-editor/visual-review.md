# Visual refresh review

What this change does: Makes the story display a restrained cinematic reading surface with locally served licensed photographs. Compacts the editor language selector and keeps fullscreen/close in the preview header, with Back available only in the normal reader.

Looks good. Ship. Checked for one local author and a static reader: old bundles and saves, caller compatibility, bilingual Ink parity, preview lifecycle, image validation and publication, resource loading, keyboard controls and narrow layouts. Detailed results and image sources are in [visual-refresh.md](visual-refresh.md).

## Accepted decision judgments

Fallow 3.38.1 against HEAD. Five judgments are anchored and checked against the final graph; reasoning remains agent judgment (`deterministic: false`). Fallow validates anchors and freshness, not the correctness of a visual or architectural opinion.

### `src/contracts/story.ts`

`src/contracts/story.ts` changes exports (BundleSchema, FrameSchema, LocaleSchema, ReaderFailure, SaveSchema, SettingsSchema, StoryManifestSchema) imported by 9 files outside this PR. Does this change break or alter what those callers expect?

9 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 9 outside consumers still accept old bundles because cover is optional. Its value must resolve to a registered image; new unit tests reject a missing or audio cover. SaveSchema and narrative snapshots retain their original shape. The builder publishes only existing vetted asset identities, paths and hashes, including the 2 new locally optimized photographs.

Outside-diff callers: `src/contracts/editor-project.ts`, `src/features/story-runtime/bundle-loader.ts`, `src/features/story-runtime/director.ts`, `src/features/story-runtime/ink-engine.ts`, `src/persistence/save-manager.ts`, `src/test-fixtures.ts`, `tools/build-editor-project.ts`, `tools/build-story.ts`, `tools/export-narration.ts`.

### `src/features/editor/compiler.ts`

`src/features/editor/compiler.ts` changes exports (compileLanguage, compileProject) imported by 2 files outside this PR. Does this change break or alter what those callers expect?

2 modules outside the diff consume this contract; changing its shape requires coordinating them.

The 2 outside callers src/features/editor/compiler.worker.ts and tools/build-editor-project.ts keep the same function signatures. Compilation copies the already-existing language Cover selection into the optional bundle field. Real Ink tests retain every original bilingual branch; unchanged EN/FR digests demonstrate that this visual field does not alter compiled story logic.

Outside-diff callers: `src/features/editor/compiler.worker.ts`, `tools/build-editor-project.ts`.

### `src/app/EditorRoute.tsx`

`src/app/EditorRoute.tsx` changes export (default) imported by 1 file outside this PR. Does this change break or alter what those callers expect?

1 module outside the diff consumes this contract; changing its shape requires coordinating them.

The 1 outside caller src/main.tsx retains the same lazy route and component API. Two obsolete window actions are removed; fullscreen enters/exits the native API or falls back to the existing workspace expansion when unavailable or rejected. The browser editor flow clicks fullscreen, verifies the actual fullscreen element or fallback state, then returns and closes the preview. Isolated saves and disposal are unchanged.

Outside-diff callers: `src/main.tsx`.

### `src/features/editor/EditorHeader.tsx`

`src/features/editor/EditorHeader.tsx` changes export (EditorHeader) imported by 1 file outside this PR. Does this change break or alter what those callers expect?

1 module outside the diff consumes this contract; changing its shape requires coordinating them.

The 1 outside caller src/features/editor/StoryEditor.tsx retains all existing callbacks. Locale values are unchanged; only the visible labels and width change. Fallow reports EditorHeader=none-file for import reach, not execution coverage. The browser flow verifies EN, width below 75 pixels and the Add Language option; bilingual editing still verifies switching and saved titles. The full language name remains available as a tooltip.

Outside-diff callers: `src/features/editor/StoryEditor.tsx`.

### Reader integration

src/features/reader/StoryPlayer.tsx has scoring_budget 11 and 1 outside caller, src/app/ReadingSession.tsx. That caller omits preview, preserving heading focus and Back. EditorRoute supplies preview to retain editor focus and omit Back only in preview. Cover markup is separated from progression, uses canonical registered paths and text-only credits, and keeps the h1 focus target and reading preferences. Real browser flows verify narrow layout, first-entry resource requests, typography, choice navigation, language save restoration and photograph examination; graph reach alone is not evidence of execution.

## Additional trade-offs

Abstained: no further unresolved architectural choice is needed for this request. The user authorized a cinematic style change; original drafts are preserved rather than replaced with a default asset selection.

## Deterministic remainder

Handled deterministically: 0 dead-code, 0 duplication, 6 complexity, 40 styling; not in the discussion. Audit exits 0 with warn, not a claim of zero warnings. No thresholds or policy rules were weakened.

Deprioritized: 5 units; use `fallow review --base HEAD --show-deprioritized` to expand them. CSS and photographs were inspected directly even though graph attention deprioritizes CSS.

Not checked: physical-device frame-rate, human listening approval or an independent clearance of third-party rights beyond the provider license record. The selected photographs and default project do not overwrite an existing saved browser draft. Verdict: Ship within those stated limits.
