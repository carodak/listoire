# Cinematic reader and compact editor controls

Historical first pass, superseded by the requested [shadow-art theme](shadow-art.md).
The Unsplash choices below are no longer the default published illustrations.

Updated 2026-11-03 for the requested visual refresh.

The editor language selector displays EN/FR in 64 pixels beside the title, with the
full name in its tooltip. Other locale codes and translation warnings remain
available; Add Language stays at the bottom of the menu.

The preview header has two actions: fullscreen and close. Fullscreen can be exited
with Escape or the same control; browsers that cannot enter native fullscreen use
the existing workspace expansion. Preview omits Previous page and retains replay,
pause, reading preferences and character access. The normal reader still has Back.
The separate header Preview button recompiles and restarts the story.

The reader uses a dark ink surface, warm ivory text, restrained brass accents,
photographic heading, soft tonal gradient and quiet choice/navigation buttons.
Existing typography, narration, reduced-motion and save settings remain functional.
No font, animation library or other dependency was added. No new decorative motion
runs by default. The layout retains its wide canvas and 800-pixel reading column,
with container-relative headings in the docked preview and a narrow mobile layout.

## Images and provenance

Two photographs were selected from their provider pages and visually inspected.
Only optimized WebP files are published; original JPEGs are stored separately in
the local downloaded library. Runtime never contacts Unsplash for an image.

| Photo                  | Author / provider page                                                                                              | Optimized size | Use                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| Woodland house         | [Alex Moliski / Unsplash](https://unsplash.com/photos/an-old-house-in-the-woods-with-a-metal-roof-rTzxt4RIfh8)      | 327,722 bytes  | Bilingual book cover and reader heading        |
| House beyond the trees | [Intricate Explorer / Unsplash](https://unsplash.com/photos/abandoned-house-in-a-dark-overgrown-forest-im7g_xQ-XhA) | 447,486 bytes  | Existing wide illustration position in Arrival |

Both provider pages identify the images as free under the
[Unsplash License](https://unsplash.com/license), checked on 2026-11-03. Attribution
is retained in asset metadata, with the cover credit visible in the reader.
The curated catalog records source URLs, original/runtime SHA-256 and provider
license evidence. These are provider-verified records, not invented author consent
or an assertion that unrelated third-party rights were independently cleared.

The photograph examination, clues, portrait and existing source libraries remain
intact. The checked-in bilingual project selects the new photographs. Existing
browser drafts and published edits take precedence and are never overwritten to
force the new images into a user's work. To adopt these images in an existing
custom project, keep its backup and import/merge the desired asset metadata and
Cover selection; the updated default project is at `/stories/house/project.json`.

## Contract and checks

The existing editor Cover image selection now compiles to an optional bundle
`cover` image ID. The schema rejects missing or non-image assets. Rendering remains
in the reader; the field does not enter Ink progression or gameplay saves.
The original EN/FR Ink digests remain `a71cf399f8d1` / `d468f79cc9e2`.

- `npm run check`: passed, including 116 unit tests, TypeScript, lint and formatting.
- `npm run build`: passed.
- `python tools/verify-assets.py --published-only`: passed, 82 published files,
  3,777,913 bytes. Only the cover and current scene image load on first entry.
- Desktop editor/reader and 390-pixel reader screenshots inspected; no horizontal
  overflow in the narrow reader. Native fullscreen/fallback is exercised in the
  editor browser flow.
- Full browser suite: 136 passed; 4 cases had loaded the previous white-background
  assertion before that test was updated. All 4 passed on a focused rerun with the
  new dark-background assertion. The 140 cases are verified across Chromium,
  Firefox, WebKit and mobile Chromium; this is not a claim of one all-green run.
- Fallow audit against HEAD: exit 0, `warn`; 0 dead-code issues, 0 duplication
  groups, 6 complexity findings. Architecture: exit 0, no detected violations.
- [Fallow/Ponytail review](visual-review.md): 5 final anchored judgments accepted,
  none rejected; no stale snapshot. No unresolved must-fix finding remains.

The earlier completed editor checks remain historical in [verification.md](verification.md).
This refresh changes presentation and licensed asset choices, with no deployment or
destructive storage migration. Physical-device performance and subjective cinematic
quality remain subject to human review.
