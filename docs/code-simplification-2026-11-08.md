# Code simplification — 2026-11-08

The follow-up measurements are in [the 2026-11-09 report](code-simplification-2026-11-09.md).
The figures below describe the preceding deletion pass.

This cleanup starts from the existing uncommitted typography/Orée workspace.
It reduces application code; the requested zero Fallow categories remain unmet.
No Fallow thresholds, suppressions, baselines or ignored paths were changed.

## Removed mechanisms

- Effects use native animation fill/cancellation instead of copying final CSS and
  maintaining a parallel style-restoration map. Effects and audio expose completion
  promises; their managers own playback controls. The unused audio seek API is gone.
- Project undo/redo stores a bounded list of complete versions instead of adapting
  project JSON into Ace text deltas. It preserves 750 ms typing groups, thirty undo
  steps, redo truncation and isolated restored snapshots. The editor still waits
  for Ace before displaying its workspace so early search actions are available.
- Worker compilation verifies referenced media once. Its callers no longer repeat
  the same verification. Media references reuse the existing Ink outline parser.
- Editor forms reuse Field/SelectField, including native form names/default values.
  A missing dismissal callback also expresses a locked modal; the redundant locked
  prop is removed. Explicit focus restoration and focusing the photo opener remain
  necessary for WebKit.
- Text reveal uses its existing monotonic clock rather than a second visible-count
  state. Save validation uses its verified item/ability maps consistently.

Deleted modules: editor/asset-validation.ts, editor/media-references.ts and
reader/check-context.ts. Their required behavior remains in compile-client.ts,
media-script.ts and ChoiceList.tsx. A single-use pending-check lookup wrapper is gone.
Reader rendering and narration scheduling remain separate cohesive modules: trial
merges raised hotspot risk and were discarded.

## Measurements

Physical source lines are compared against the snapshot at the start of this
cleanup, after formatting, excluding tests, docs, generated output and assets.
Application/tool/style source: **220 fewer lines**. Tests add targeted history
checks and repair stale illustration fixtures; those additions are counted separately.

| Fallow measure                                             | Before | After |
| ---------------------------------------------------------- | -----: | ----: |
| Cyclomatic/cognitive threshold findings                    |      6 |     0 |
| All complexity findings, including estimated coverage risk |    162 |   153 |
| Refactoring candidates                                     |     30 |    28 |
| Complete health score, including hotspots                  |   81.4 |  81.0 |

All 153 remaining complexity findings exceed CRAP, a complexity/coverage risk metric;
coverage is **static_estimated**, not measured branch execution. This is not proof
that those branches are uncovered. Refactoring candidates include dense shared
modules and suggested test improvements. Neither category is claimed as zero.
The health penalties remain unit size 10, hotspots 6.7 and coupling 2.3.

Reports, traces and starting source snapshots are under `.fallow/simplify/`.
`statuses.json` preserves command exit status and gates with separate stderr:
dead code 0, architecture 0, duplication 0, changed-code audit 0 (`warn`), full
health with minimum 89 exits 1 (score gate fails). No policy packs are configured;
zero architecture violations do not imply that policy packs ran.

## Verification

`npm run check`: typecheck, lint, formatting and all 247 unit tests pass.
Production build passes. Browser verification covers editor import/export/history,
media forms, typography, native effects, narration across pages, saved checks/combat,
and illustration depth/pause/cancellation. Earlier failures in the illustration
suite depended on the previous default story/assets; the tests now use a fixed
legacy story with the current licensed gallery and retain their behavioral checks.

No physical-device performance or human listening review was performed. Firefox's
previous environment crash was not re-investigated during this cleanup. No commit,
deployment, narration publication or telemetry enabling was performed.
