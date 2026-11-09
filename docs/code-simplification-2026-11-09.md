# Fallow follow-up — 2026-11-09

The function-complexity category is now empty, including CRAP. Eight file-level
refactoring recommendations remain. The requested 0/0 and health score of 89 are
**not achieved**. No thresholds, ignored paths, suppressions or baselines were changed.

## Changes

- Removed the separate narrative-block, media-layout and stat-breakdown modules.
  Rendering helpers stay with PassageText; derived character values stay with the
  existing character rules. Media anchoring uses indexed block identities, and page
  layout builds one asset map instead of repeatedly searching the asset catalogue.
- The director projects player details when activating a committed checkpoint,
  instead of inspecting every UI notification. Choice lookup and retained-frame
  commits no longer repeat the same work. Save rollback and RNG ownership remain.
- Editor history availability has one implementation. IndexedDB stores use the
  installed library's existing lazy connection, instead of creating a new store
  closure for each operation. Compilation validates media once; the unused worker
  request ID is removed because every job owns its worker.
- Ink insertion templates, media defaults and authored sound/effect cues use data
  where branching repeated the same operation. Unknown dictionary keys cannot
  resolve inherited JavaScript properties. Outline parsing retains source rows,
  comments and knot/stitch distinctions. Text digests have one shared contract.
- Recorded-clip validation/playback is separate from narration scheduling. Effects
  share their visual preparation. Audio controls and their interruption safeguards
  remain together: an attempted split added 49 lines and two single-consumer modules,
  so it was discarded.

Runtime application/tool/style sources are **4 physical lines smaller** than the
start of this follow-up. The new reproducible coverage scripts add 113 tooling lines,
separate from runtime code and tests. This is not claimed as a large deletion pass;
the earlier deletion pass is recorded in [the preceding report](code-simplification-2026-11-08.md).

## Measurement

| Fallow result                                     |    Before |     After |
| ------------------------------------------------- | --------: | --------: |
| Function complexity findings, including CRAP      |       153 |         0 |
| Cyclomatic/cognitive threshold findings           |         0 |         0 |
| Refactoring candidates                            |        28 |         8 |
| Complete health score                             |      81.0 |      80.9 |
| Dead code / architecture / duplicate clone groups | 0 / 0 / 0 | 0 / 0 / 0 |

The initial CRAP report estimated coverage from import paths. The final report uses
measured Vitest and Chromium branch execution. Therefore the 153-to-zero change is
not a claim that 153 function bodies were rewritten. Fallow's remaining score
penalties are unit size 10, hotspots 6.7 and coupling 2.4.

`npm run test:coverage` runs unit tests and 44 Chromium flows, then combines their
Istanbul coverage into `coverage/coverage-final.json`, which Fallow auto-detects.
Capture rejects changed sources and stale browser source maps. Infinity/null source
columns are normalized before merging so executed functions are not duplicated as
uncovered copies. Counts are never fabricated. Rerun capture after source changes.
Only development dependencies were added; no runtime dependency or telemetry was added.

## Remaining recommendations

All eight are `split_high_impact`, based on file complexity density above 0.3 and
at least three importing files, including tests. They are retained recommendations,
not fixed findings and not verified bugs:

| File                                        | LOC | Responsibility/protection retained                                       |
| ------------------------------------------- | --: | ------------------------------------------------------------------------ |
| `features/media/audio-manager.ts`           | 351 | Track mixing, native speech, pause/cancel/deadline and ducking controls  |
| `features/editor/illustration-pack.ts`      |  57 | Shared gallery updates without replacing uploaded artwork or draft text  |
| `features/rules/combat.ts`                  | 151 | Approved retaliation/effect ordering, deterministic RNG and one XP award |
| `features/presentation/use-asset-source.ts` |  39 | Async decode, cancellation and resource disposal                         |
| `features/editor/ink-outline.ts`            |  28 | Source-row-preserving outline parser shared by editor operations         |
| `features/reader/DiceRoll.tsx`              |  76 | Model completion, reduced motion, fallback dice and accessible results   |
| `features/editor/media-script.ts`           | 105 | Ink/media reference synchronization and stable insertion anchors         |
| `features/editor/default-project.ts`        | 134 | Archived upgrades, concurrent-write and offline draft protection         |

These were reviewed individually. Splitting the smallest helpers solely to empty
this category would add indirection. The larger audio, combat and migration modules
remain candidates for a broader design change; this report does not claim that their
recommendations have been eliminated.

## Verification and limits

- `npm run check`: typecheck, lint, formatting and 268 tests across 39 files pass.
- Production build passes. Chromium: 44 flows pass. Focused WebKit: 6 flows pass;
  Pixel 7 emulation: 6 flows pass. These cover selected-media editing, native voice
  preview, calibrated photograph focus, paper sampling, typography/history and
  narration on subsequent pages. The longer Chromium suite also covers full French
  story play, saved checks/combat, publication and uploaded media backups.
- Fallow dead-code, architecture and duplication checks pass with zero findings;
  changed-code audit passes. Full health with minimum 89 exits 1: the score gate fails.
- Reports and separate stderr are under `.fallow/resolve-health/`. An exact class
  method-impact query was unavailable in Fallow (exit 2); its sole caller was checked
  in source and exercised through the editor browser flow.

Firefox, physical-device performance and human listening review were not repeated.
No story assets, prose or narration approval were changed by this cleanup. Existing
unrelated workspace changes remain. No commit or deployment was made.

## Follow-up: smaller functions and fewer wrappers

Compared with the byte snapshot in `.fallow/unit-hotspots/before`, application and
tool TypeScript/JavaScript is 132 physical lines smaller. Browser tests add 25 lines;
the complete source/test change is **107 lines smaller**, with 11 fewer functions.
No Fallow thresholds, exclusions, history or coverage counts were changed.

- Removed editor history callbacks and the mirrored availability state. Undo/redo
  returns the saved snapshot; normal edits and undo share one state update.
- Native FormData replaces four controlled command-form states. Repeated input
  markup reuses the editor fields; SHA-256 and toolbar icons have one implementation.
- Replaced nested crop callbacks with native image decoding and one canvas operation.
  Crop calculations and their hook now live together in the existing smart-crop
  module. Cancellation, original-image fallback, predecode and URL disposal remain.
- Reader components use the shared controller/snapshot contract. The director no
  longer resolves the same action twice or conditionally constructs optional player
  fields. The sole narrative-engine implementation already supports game facts;
  its interface now requires that operation instead of silently skipping it.
- Repaired a reversible UTF-8 encoding error in the magic-story generator. The
  generator was not run; current story text and narration approvals were retained.

| Measurement                            | Before | After |
| -------------------------------------- | -----: | ----: |
| Functions longer than 60 LOC           |     64 |    51 |
| Functions longer than 60 LOC per 1,000 |   24.7 |  19.8 |
| Unit-size penalty                      |     10 |   9.9 |
| High-coupling file share               |   4.8% |  4.4% |
| Coupling penalty                       |    2.4 |   2.2 |
| Complete Fallow health                 |   80.9 |  81.2 |
| Hotspots scoring at least 50           |      2 |     2 |
| Ranked hotspot files                   |     56 |    56 |
| File refactoring recommendations       |      8 |     8 |

The director's cyclomatic total fell from 103 to 99; presentation validation fell
from 37 to 26. Their hotspot scores remain 54.3 and 50.3. The
[official hotspot formula](https://www.fallow.tools/docs/explanations/health/#hotspot-metrics)
multiplies relative churn by relative complexity density. A shorter file can have
a higher density even when its total complexity falls. The 56 entries are the full
ranking, not 56 findings above the hotspot threshold. The two remaining hotspots
and eight refactoring recommendations have **not** been cleared.

Verification includes native command forms, undo/redo, bilingual editing, failed
saves, project/media backups, narration interruption and page transitions. The crop
regression checks pale-border removal, unchanged full frames and the 2048-pixel cap
in Chromium, WebKit and mobile Chromium. Firefox and physical hardware were not
rechecked.

One coverage run hit the existing 50 ms Ink continuation limit while the build
ran concurrently. The retry runs without the competing build; the guard remains
unchanged. Browser checks use an isolated Vite cache because an older development
server's optimizer cache produced HTTP 504 responses before application startup.

Final checks: 269 unit tests and 45 Chromium flows passed, followed by 10 focused
WebKit/mobile checks (plus the repeated Chromium crop check). The fresh coverage
capture includes 208 source files and has no source-hash mismatch. Full Fallow
health exits 0 with **zero complexity findings**, and the changed-code audit exits
0 with verdict `pass`. Dead-code, architecture and duplication checks report zero.
Typecheck, lint, formatting and production build pass. The minimum-score-89 check
still exits 1; 81.2 is the measured score. JSON reports and separate stderr are in
`.fallow/unit-hotspots/`. No commit or deployment was made.
