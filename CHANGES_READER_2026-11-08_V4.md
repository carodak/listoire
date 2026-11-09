# Reader V4 — modifications

- Fixed the close X to the mathematical center of its 40×40 px hit target, with no visible border.
- Toolbar now has straight corners. Back/replay/pause/reading preferences are accessible icon-only buttons with native hover titles; My Character now shows both its diamond and label.
- Replaced reading preferences icon with a gear. Removed the replay-voice shortcut from the quick toolbar (voice selection remains under preferences).
- Replaced the paper sampling icon with a coloured palette/eyedropper SVG; click-on-page sampling is unchanged.
- Inventory popup has three tabs: Equipment, Consumables and Items. Equipped items remain actionable, and fact-based story objects are visible under Items. The inventory data contract currently exposes only weapon/accessory/none slots and a consumable flag, so further subcategories would need schema support.
- Page transition: timed at 1,500ms, now clips the page front and separately moves a colour-matched shaded paper back from the lower-right toward the left, with reverse direction for navigating backwards. It approximates a 2D/2.5D paper curl without requiring a heavy 3D dependency. Reduced-motion preferences are still respected.
- AI voice diagnosis and fix: the archive had no `vite.config.ts`, so local `/api/narration` requests had no configured proxy to the Chatterbox server on port 8765. Added a loopback-only Vite development proxy and optional local asset library hook. The reader now loads a local actively edited draft with the editor-preview narration authorization, so fresh text need not first be exported. Published bundles still use strict exported segment authorization and require narration export and a local running Chatterbox server. An explicitly selected AI narrator no longer silently falls back to an OS voice when generation fails; the reader indicates unavailability.

## Verification required

Run `npm ci && npm run typecheck && npm test && npm run build` under Node 24+; also inspect modal focus, category tabs, 1.5s fold and AI voice on a draft in the browser. This environment cannot guarantee GPU/voice runtime quality or finished 3D paper physics.
