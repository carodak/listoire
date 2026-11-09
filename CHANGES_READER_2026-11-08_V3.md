# Reader refinement — 8 November 2026 (third pass)

Implemented against the previous `site_reader_refined.zip` source tree.

## Header / navigation

- Home and language selection use borderless controls; the language selector now uses the same `LanguageSetting` presentation as the landing page.
- The story title uses `clamp(16px, 1.6vw, 21px)/1.25 Georgia, serif`.
- The rest of the top menu uses `Roboto, Arial, sans-serif`, with larger 14px controls on desktop.
- The menu stays fixed in layout when Character / Reading preferences open: both now appear as right-edge overlay panels. Character is a diamond-only button with an accessible text label.
- The right-hand character panel is full-height below the toolbar with a larger portrait.
- The central book has `max-width: var(--container-3xl)` and `--container-3xl: 48rem`.

## Preferences, notes and dialogs

- Reading preferences list selectable narrator voices even when voice playback is initially off, including language-matched system voices when the narration mode supports them. Unavailable voices are not claimed to exist.
- Removed the separate read-aloud toggle from the quick toolbar; narration remains in Reading preferences.
- The paper color picker supports an explicit **click on the page** mode, including in browsers without EyeDropper. On locally accessible `<img>` elements it samples an image pixel; otherwise it samples the CSS background color. For complex artwork with CSS filters/blending this may be approximate.
- The native note dialog has **Enregistrer** beside **Fermer**, no explanatory copy, explicit/manual saves, confirmation before discarding changes, and correctly aligned borderless close `×`.
- Item / event result modal pauses playback and resumes only if the reader was playing before the notification opened. The combat modal stays locked until combat resolves.

## Page transitions

- User-enabled page flipping takes 1,500ms, with a bottom-corner fold toward the left; back navigation reverses direction. The animation affects the departing `.reader-scene`, not the toolbar or the entire page canvas, which prevents contrasting application background from appearing during the transition.
- Reduced-motion systems continue to bypass cinematic motion via the existing playback engine.
- This is a lightweight CSS/Web Animations fold, **not** a physically simulated 3D paper curl.

## Verification limitations

- TypeScript/TSX/JS source parser completed successfully for all 228 source/test/tool files.
- CSS parser reported no parse errors.
- Full TypeScript type-check, build, unit tests and browser visual checks were not possible in this environment: installed Node is v22.16.0, while the project requires Node >=24.11.1, and npm dependencies are not installed. `tsc --noEmit` failed immediately on missing `@types/node` and `vite/client`.

### Manual smoke tests (Node 24+ and `npm ci`)

1. On `/` open a story, check header and language button, and toggle Character / Preferences without header movement.
2. Open Notes, edit, close with unsaved text, cancel the warning, then save and reopen.
3. In Preferences, enable narration and select a published or device voice. Listen through normal reading.
4. Activate paper sampling, click an illustration pixel (or plain paper); check page and toolbar recolor together.
5. Enable page-turn and navigate forward/back. Confirm duration ~1.5s, stable header, matching background, and reduced-motion behavior.
6. Trigger an item/letter notification while narration is playing; verify the audio and text pause until dismissed.
7. Try character sheet at desktop and mobile widths; check portrait, scrolling and stats.
