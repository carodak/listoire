# Reader refinement — 7 November 2026

## Reader and navigation

- Modernized the EPUB-like reader appearance, text column, chapter heading, choices, responsive toolbar and reading settings.
- Kept the existing serif/sans, typography, sound and reading-preference controls intact.
- The character sidebar now overlays the book without abruptly changing the reading column width.
- Softened the left edge of right-hand illustrations into the page background; responsive rendering retains the existing separate image-examination controls.

## Character and game

- Character sheet displays **XP earned toward the next level, out of 5**, consistent with `awardXp` (XP resets modulo 5 at level-up).
- Inventory, Abilities, Encounters and Notes remain present and keyboard accessible.
- Combat now takes place in a compact centered **non-dismissable** native modal. Pressing Escape, clicking the backdrop or clicking outside cannot leave an unresolved encounter. The native dialog traps focus and blurs/dims the underlying page.
- Noncombat game events, including received-item alerts, use a small centered **dismissable** dialog; an item pickup is labeled with the corresponding item name, rather than inferred by parsing text.
- Existing older saved game results are not re-announced upon restoration; dismissal is maintained across ordinary page changes within the reading session.

## Illustration authoring

- An image without additional layers exposes only **None / Fade in / Fade out**, not cinematic camera/parallax controls.
- Multi-layer compositions retain their camera preset controls.
- Saving a single image removes incompatible old camera events and persists simple effect choices; reopening the editor restores the previously selected simple effect.
- Legacy single-image cinematic-camera events are ignored at runtime; multi-layer and 3D camera scenes remain supported.

## Code hygiene

- Shared repeated catalogue update code via `replaceAt`.
- Marked `tools/create-magic-story.ts` as a genuine CLI entry in Fallow instead of deleting a standalone generator.
- Added a `tsconfig.json` so `npm run typecheck` has a real project configuration.
- Added tests for the single-image/layered camera split and for identifying newly received items.
- The two `structure` functions in `compiler.ts` and `ink-structure.ts` have different input contracts; they are not duplicate implementations and were left alone.

## Validation and remaining work

- Static TypeScript/TSX source parsing: **191 files, zero syntax diagnostics**.
- PostCSS parsing: modified CSS files have no parser errors.
- **NOT run:** `npm run check`, `npm test`, Playwright, Vite build, or Fallow security audit. The environment has Node 22.16.0, but the project requires Node >=24.11.1; `npm ci --offline` cannot fetch the pinned `zod@4.6.7` dependency. Verify on a machine with Node 24+ and network dependency access.
- Fallow's reported CWE items are **security candidates, not proven exploits**. They still require an independent review; this patch does not claim to have resolved them. Refactoring candidates elsewhere in the repository remain for future targeted work with test coverage.

## Suggested manual QA

1. Open the story in French and English; inspect the header and both light and dark page colors on desktop and mobile.
2. Earn XP, verify XP `0…4 / 5` and level-up reset; open each character tab and save Notes.
3. Receive an item/letter, dismiss the alert, advance and replay a page, and reload from the saved checkpoint.
4. Start combat and verify Escape/backdrop cannot dismiss; attack, use an ability or flee, resolve combat and continue reading.
5. Create a single right-hand image and test blend with paragraphs; edit it using None/Fade In/Fade Out, then add a second depth layer and verify cinematic presets appear.
6. Run `npm ci && npm run check && npm run build && npm run test:e2e && npm run quality && npm run quality:audit` with Node >=24.11.1.
