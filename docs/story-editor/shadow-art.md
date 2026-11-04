# Shadow-art reader and Fallow findings

Updated 2026-11-03 following the user's three visual references and code-health concern.
This replaces the photographic-banner first pass described in `visual-refresh.md`.

## Result

On a wide reader the narrative sits on the left, with a large charcoal silhouette
on the right that fades into a near-black surface. Ivory typography, quiet brass
rules and restrained pale-aqua controls follow the first reference's composition.
The editor remains light and retains its compact language menu and two preview
window controls. Narrow previews and phones place a subdued illustration behind
the text, without reducing the readable column to half the screen. Books without
a cover keep a full-width reading column. No automatic decorative animation or
new dependency was introduced.

The three images are original generations made with the built-in Imagegen tool,
not the CLI or a one-off API script. References informed style and composition;
their characters, watermarks, logos and text were not reused. Optimized assets:

| Asset      | Local file                                   | Bytes   | Use                                       |
| ---------- | -------------------------------------------- | ------- | ----------------------------------------- |
| Woman      | `stories/house/media/shadow.woman.webp`      | 170,562 | Right-side artwork and character portrait |
| House      | `stories/house/media/shadow.house.webp`      | 184,156 | House/arrival illustrations               |
| Photograph | `stories/house/media/shadow.photograph.webp` | 281,316 | Narrative photograph and magnifier        |

Original PNGs were copied into `assets/images/generated/{woman,house,photograph}-shadow.png`
before use. Source and optimized hashes, generation provenance and project-use
authorization are recorded in `assets/catalog/curated.json`. Generated-image provenance
is not described as a provider-verified stock license. Older downloaded libraries
are preserved; obsolete default photographs are excluded from the active publication.

The photograph depicts two adult women before the house, with a visible open
upstairs window. Its clue hotspot is at X 85%, Y 29%. The action ID, dated description,
reverse message, narrative effects and saved facts remain unchanged.

## Existing drafts

Editor load and import/restore refresh only the known default TCP/Heritage bird and
first-pass Unsplash identities. Text, translated titles, audio clips, voice settings,
custom covers, variables, character mechanics and checkpoint data remain intact.
Refresh is idempotent and requires all replacement assets before changing a language.
If the deployed default project cannot be fetched, an existing local draft still
loads. Publication remains subject to normal compile/media checks and revision-safe
storage. History and gameplay records are not cleared.

## Fallow: score and findings are separate

All measurements below use Fallow 3.38.1, formula version 3, the existing rules and
the same whole-project command: `fallow health --report-only --format json --quiet --explain`.
No thresholds, ignores, baselines, telemetry or Git history were changed.

| Tree                           | Global score | Hotspot penalty | Unit-size penalty | Coupling penalty |
| ------------------------------ | ------------ | --------------- | ----------------- | ---------------- |
| Before the editor, `50423dc`   | A 89.1       | 0               | 10                | 0.9              |
| First editor commit, `6c7809c` | B 78.6       | 10              | 10                | 1.4              |
| Current HEAD, `45997b3`        | B 78.7       | 10              | 10                | 1.3              |
| Working tree before this task  | B 78.7       | 10              | 10                | 1.3              |
| Working tree after this task   | B 78.7       | 10              | 10                | 1.3              |

The ten-point hotspot penalty appeared with the additional commits to frequently
changed complex runtime modules. This is a maintenance-risk signal, not a verified
bug count, and remains unresolved. The 0.4 additional coupling penalty relative to
the pre-editor tree also remains. The global A grade has **not** been restored.

Critical-severity complexity candidates fell from 17 to 11. Total above-threshold
functions changed from 87 to 89; the remaining candidates include smaller separated
functions, so this is not a claim that every warning count decreased. The model is
static estimated test reach, not measured line coverage. The changed-code audit
exits 0 with `warn`: 0 dead-code issues, 0 duplication groups, 43 complexity candidates.
Architecture reports no detected violations. The separate CSS score is A 98.0,
compared with A 98.1 before; it is not substituted for the global score.

Changes separate fullscreen lifecycle, video decoding, depth/effect layers, recording
fields and media form parsing by responsibility. One visibility predicate now keeps
rendering, reveal-all and playback consistent. The bilingual migration test now names
all 32 paths individually instead of embedding four nested loops inside one test.
New tests cover artwork refresh, missing replacement assets, custom-cover preservation,
media visibility and rejecting missing/oversized generated audio before caching.

## Verification

- `npm run check`: passed, including 150 tests, TypeScript, lint and formatting.
- `npm run build`: passed. Original EN/FR Ink digests remain `a71cf399f8d1` /
  `d468f79cc9e2`.
- Asset publication check: 81 files, 3,494,119 bytes; originals/catalogs are not shipped.
- Desktop reader, editor preview and 390-pixel reader inspected visually. The new
  illustration composition and window hotspot were inspected before integration.
- Full browser suite: 144 passed in 6.8 minutes across Chromium, Firefox, WebKit
  and mobile Chromium. After the final archival-ink contrast fix, 12 affected
  image/video/cinematic/branch flows passed again, including a computed-style check
  that the key is rendered as light ink on a transparent background.
- [Final Fallow/Ponytail review](shadow-review.md): 14 anchored judgments accepted,
  none rejected, snapshot current. These are review judgments, not an A-grade claim.

Physical-device frame-rate, human listening approval and subjective artistic approval
were not measured. No deployment or destructive save migration was performed.

## Final generation prompts

The first two prompts used the user's three images as style/composition references;
the third was generated from text. All were new-image requests with opaque backgrounds.

### House

Use case: illustration-story. Create one original production illustration for an adult literary supernatural mystery, 'The House That Remembered'. The three supplied images are REFERENCES ONLY: image 1 is the application composition/mood reference, images 2 and 3 are references for hand-drawn black ink shadow art and expressive charcoal silhouette. Do not reproduce their subjects, characters, text, logos, watermarks or exact compositions. Create a wide landscape 3:2 black-and-white shadow-art illustration: an old two-storey European family house amid bare trees, viewed from the garden at night, a single pale upstairs window, a small lone adult woman's dark silhouette standing with her back to us in the foreground. Mature, unsettling, quiet, premium graphic-novel artwork. Dense ink-black silhouettes, spare chalk-white edge light, dry brush and charcoal textures, controlled scratched linework, subtle gray atmospheric fog. Restrained adult art, no cartoon features, no anime, no photographs, no glossy 3D, no bright color, no samurai/swords, no typography. Composition for a right-side illustration beside reading text: the house and figure are in the RIGHT TWO THIRDS, the LEFT THIRD is near-black negative space fading naturally into deep black. Background near #071012 with no visible frame, no decorative border. Art should feel painted directly into a dark screen, not a white paper card. High contrast focal window and crisp silhouette details that remain clear at smaller sizes.

### Woman

Use case: illustration-story. Generate an ORIGINAL single portrait-format 2:3 illustration for an adult supernatural mystery. The supplied references are for STYLE ONLY: use the bold black silhouette, white negative-space rim light and energetic charcoal / dry-brush ink texture from reference images 2 and 3. Do not copy their subjects, poses, text, any watermark or logos. Subject: a contemporary adult woman in her late twenties, long windblown dark hair, wearing a simple long coat, standing three-quarter view and looking over her shoulder toward the viewer. Quietly haunted, composed and watchful, no weapons, no armor, no hat. Her face is mostly a shadow, with just a narrow chalk-white light on the cheek, eye and hand holding an old rectangular photograph. Minimal mature shadow art, strong graceful silhouette, sparse expressive scratch marks, premium literary graphic novel quality, BLACK AND WHITE ONLY with very few gray tones. No photorealism, no cute/cartoon/anime features, no glossy rendering. Main figure fills the central/right side of the image with naturally vanishing brush edges. Deep near-black #071012 background with subtle charcoal mist, seamless and borderless, NOT a white paper sheet. No typography. The illustration must read beautifully as a large right-side companion to narrative text on a near-black app screen.

### Photograph

Use case: illustration-story. Create a third original production illustration for the same adult literary mystery, rendered in BLACK AND WHITE shadow art, dense black ink silhouettes, sparse chalk-white rim light, expressive dry-brush and charcoal scratchwork, mature premium graphic novel, no cartoon/anime or photorealism. Landscape 3:2. This is the content of an old mysterious photograph the reader can magnify: two ADULT women around age 26 standing beside each other in the lower-left foreground of an old two-storey family house garden. One has hair pinned back, one long loose hair; they uncannily resemble each other. Both are fully clothed in simple modest dark everyday dresses, faces subtly lit enough to see the resemblance, quiet and serious. Bare trees and the house occupy the background. IMPORTANT visible story clue: a clearly OPEN upstairs window at the right of the house, located near 80 percent across and 30 percent down the composition; its dark shutters are open, with a pale curtain or rectangle of light inside. It must be easy to discern when magnified. Restrained grays, analog charcoal texture, adult eerie mood rather than horror gore, clean readable composition, deep gray-black backdrop fading at edges. Flat illustration without a frame, mockup, white page border, handwriting, captions, date, typography, logos or watermarks. Original characters, not any existing copyrighted characters.
