# Phase 2 — completion record

Reviewed 2026-11-02. Phase 2 is implemented; Phase 3 is not started.

## Playable story and reader

The complete supplied _The House That Remembered_ has 11 Ink passages and three
binary decisions that reconverge. Both English and French preserve all narrative
paragraphs, choices and shared semantic IDs. The English text is checked against an
immutable extraction of the supplied HTML. Thirty-two path tests cover eight branch
combinations, both languages, and examination performed/not performed, restoring
the Ink/frame boundary at every step.

Ink owns Observation, Knowledge, Courage, caller/girl relationships, the brass key,
hidden letter clue and examination flag. Static reference information (grandmother
relationship and 5/5 health) is presentation metadata, not an RPG implementation.
Photograph discovery dispatches a tagged internal Ink choice, saves its consequence
atomically, and disappears after discovery. No reward is granted by media callbacks.
The original hidden/ineffective hotspot is deliberately made accessible and meaningful:
it records the already-authored open-window clue. This is the requested interaction
extension; it does not add an original passage or official RPG calculation.

The reader retains the 94% white canvas, centered 800px prose, compact enclosed
header, centered Chapter One and approved landing. It adds grapheme-based text
reveal with an immediate accessible reveal button, typography/spacing/reveal/sound
preferences, optional metadata-defined story notes, progress and a native photograph
dialog. Zoom, pan and transitions use the same presentation primitives as scenes.
Dialog focus return is explicit for WebKit; Escape and native modal focus containment
are verified. Changing several preferences quickly is serialized and preserves all
updates. Reload displays the committed frame fully revealed with transient audio
paused; it never re-evaluates a frame to reconstruct text.

The house uses its own `house` EN/FR save slots. Historical `foundation` slots and
fixtures are preserved and never silently migrated into another Ink program. The
foundation is compiled into ignored test output, excluded from production.

## Source libraries and selected resources

At the start, 279 Heritage ZIPs occupied approximately 6.56 GB compressed and
declared 6.67 GB expanded; approximately 607 GB was free. All were extracted with
path validation and member CRC checks. Two nested archives were also extracted,
for **281 completed extractions, zero failures**. Each archive has its own directory;
original filenames and nested folders are retained. The user subsequently confirmed
deleting the 279 top-level ZIPs voluntarily. They were not deleted by these tools
and have not been recreated. The report distinguishes their completion markers
from the two nested source ZIPs still present.

The current technical inventory contains:

| Collection                                  |               Media |           Accompanying documents | Total indexed files |
| ------------------------------------------- | ------------------: | -------------------------------: | ------------------: |
| Five Sonniss GDC 2026 volumes               |     344 audio files |                               15 |                 359 |
| Heritage Library, including nested archives | 2,141 raster images | 1,824 vector/license/other files |               3,965 |

All technical probes succeeded. Nine floating-point WAVs require the FFprobe
fallback rather than Python's PCM-only WAV reader. Source inventories have stable
path-based IDs, technical information and explicit unreviewed rights/classification;
they do not contain thousands of invented descriptive tags. The curated subset
adds inspected evidence, editorial suggestions, palette/composition information,
source/optimized hashes and differentiated project/third-party-resource rights.

Seven optimized resources total **421,698 bytes**: the original portrait, house and
seal, one Heritage key engraving, and three Sonniss excerpts (telephone receiver,
chimney wind and a metal impact accent). The approved 18,393-byte landing recording
remains separate. The reader does not download every selected file initially; it
requests the illustration/cue for the current passage. Some passages are silent and
unillustrated. No clock or unrelated footsteps were added merely to use resources.

The compiler resolves image, examination and sound IDs through the explicit curated
allowlist, validates rights and paths, verifies optimized hashes, copies only used
files, and removes stale files from its fixed generated media directory. The
production checker compares all published resource files with the dependency set
and confirms there are no source ZIP/WAV collections, catalogs or foundation bundle
in `dist`. Large sources remain ignored by Git; catalogs stay development-only.

## Animation and licensing records

The structured animation catalog contains all **25 requested effects**: 11 native
cinematic concepts and 14 verified React Bits components. Every requested official
component exists at pinned revision `4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4`.
Imports, actual optional parameters, rendering requirements, accessibility concerns,
licensing and unmeasured mobile cost are recorded. Only fade-in, zoom and pan are
implemented. There is no full effect sequencer and no installed React Bits package,
downloaded overlay, additional texture or spritesheet.

[contributions.md](../contributions.md) records source/license evidence and use.
The local Heritage license and bundled Sonniss licenses were inspected alongside
the official provider pages. Both provider copies require care about supplying
resources as reusable packs; commercial project use is not treated as platform
redistribution permission. Sonniss AI restrictions are recorded. React Bits is
recorded as MIT plus Commons Clause, not plain MIT. None of its code is shipped.
The original three images are user-attested public-domain resources permitted for
this story; original artist/collection provenance is not independently verified.

## Verification

- `npm run check`: story compilation, strict TypeScript, Oxlint, Oxfmt, **66 unit/integration tests**.
- `python -X utf8 -m unittest discover -s tools -p test_asset_library.py`: **five extraction tests** for unsafe paths/collisions, corrupted archive continuation, disk-space refusal, preserved source bytes, same-run nested ZIP discovery and idempotent folders.
- `npm run build`: production build, with the selected resources only.
- `python -X utf8 tools/verify-assets.py`: inventory IDs/probes, source and output hashes, complete extraction markers, 25 effects, exact production allowlist and no source collection publication.
- `npm run test:e2e`: **72 browser checks passed** across Chromium, Firefox, WebKit and mobile emulation.
- Fallow: zero unused exports/files/dependencies, architecture violations, cycles or duplication. Final audit **warn, exit 0**: 11 visible complexity/coverage heuristics, maximum cyclomatic complexity 14. Health **88.6/A** is advisory; no thresholds or suppressions were changed. Cohesive Ink/save code was retained, while the reader separates text lifecycle, choices, checkpoints and image interaction by responsibility.

Fallow's browser-fetch SSRF heuristic remains a candidate rather than a verified
server request vulnerability. The loader allows only its own HTTP(S) application
origin/base path, enum language and fixed story filenames, and rejects redirects
and credentials. These constraints remain tested. The final security scan has one
such candidate and 457 unresolved callee sites; dynamic dispatch is a limitation
of the analysis, not evidence of 457 security vulnerabilities or a clean bill of health.

## Limits and next authorized step

This is the complete original short story, not a longer invented sequel. The original
portrait is retained as requested; a complete photograph composition, precise visual
clue placement and premium authored illustrations remain artistic review work.
The selected sounds need human listening and level review on actual headphones and
phones; filename/probe-based selection is not claimed to be a listening evaluation.
French has automated parity checks, but should receive an editorial read-through.

Physical iOS/Android devices, native persistence/audio focus, deployment, remote CI
and automatic Codex hook enforcement were not verified. Web browser emulation is
not native-device evidence. There is no official RPG/combat, AI planner, visual
editor, Capacitor app, narration generation or mixer.

Recommended Phase 3 work: review the art/audio together scene by scene, author the
six intended cinematic moments with restraint, introduce bounded sequencing only
where needed, refine the photograph composition, and profile reduced-motion and
mobile GPU/battery behavior before selecting any React Bits integration. Preserve
the premium cinematic-book acceptance gate. Phase 3 requires separate approval.
