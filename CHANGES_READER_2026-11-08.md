# Reader refinement — 8 November 2026

This revision builds on `site_updated.zip` provided in the preceding exchange.

## Visual reader and toolbar

- One integrated toolbar on the reading page; the global home/language header is hidden while reading.
- Home, novel title, compact flag/FR–EN selector on the left. Right-side group includes master volume, previous page, replay page, pause/resume, voice toggle, voice replay, preferences, and character.
- Reading column raised to 1000px when unillustrated, and a wide editorial two-column arrangement for right illustrations. Paper color applies to toolbar and page.
- Corrected text size precedence (`small < medium < large`); works in responsive breakpoint as well.
- Warm paper colors, custom color input, and platform EyeDropper for sampling screen pixels where supported (e.g. Chromium; Firefox lacks it). Browser color input is available regardless.

## Character / combat

- Character sheet: My Character heading, optional story-defined name (Orion in example story), small `0 / 5 XP` progress bar, large portrait, compact single-line HP, STR, DEX, WIL.
- Hover / keyboard focus attributes to show base attribute, equipment contribution and applicable cap. Effective values are the same game-rule computations used in actual checks.
- Inventory, Abilities, Encounters, Notes open centered native modal popups rather than expanding the sidebar; no arrows or counts.
- During combat a live character sheet appears next to the non-dismissable combat window. Incoming HP damage shakes the sheet and displays a transient red `-N` hit indicator (reduced-motion honored).
- The original character panel state is untouched by the temporary combat view, so it returns to its previous state when combat ends.

## Notes and audio

- Notes load from per-story saved notes and are written only on explicit Save click; warn when dismissing with unsaved edits. Corrected a reading-session type that previously dropped the notes port.
- The same narrator settings, master audio levels and narration toggle are available in the regular reader. Regular on-the-fly narration uses `/api/narration` in local development with an available narration service; editor preview still uses `/api/narration/editor-preview`.
- Pre-generated, approved recorded voices still work without the local service; otherwise device TTS fallback remains available depending on story narration mode and reader settings.
- Live AI narration remains restricted to local development and requires the external narration service to be running. No public synthesis backend is bundled with this project; for production it would need a secured service.

## Files and tests

- Added `src/features/character/stat-breakdown.ts` and `.test.ts` to verify equipment bonuses and the 18-point cap.
- Parsed all TypeScript/TSX sources and edited CSS successfully for syntax. JSON content parsed successfully.
- Full `npm run check` / `npm run build` / Playwright unavailable here: Node v22.16.0 is present, but project requires >=24.11.1, and offline npm cannot retrieve pinned zod@4.6.7.

## Suggested manual tests

1. Load the French/English reader, change the page color, then verify toolbar color and 1000px reader width at desktop/tablet/mobile.
2. Select small, medium and large text; each step should visibly increase the text size.
3. Collect an item, open inventory popup, close it; change equipment and hover STR/DEX/WIL to inspect the real calculation.
4. Start combat with the character window closed; verify the modal includes the sheet, damage shake/red text, and original closed state afterwards. Repeat with the window initially open.
5. Open Notes, type, discard, reopen; then save explicitly and reopen after reload.
6. Click narration toggle in regular reading mode, select an AI voice and test local narrator endpoint; also verify fallback if local service is not running.
