# Typography and refactor verification — 2026-11-08

The later deletion-focused cleanup and its current metrics are recorded in
[code simplification](../code-simplification-2026-11-09.md). The measurements below
describe the typography milestone, not the latest working tree.

The starting workspace already contained extensive uncommitted Orée and reader work.
Those changes and the active story were retained. Legacy editor/presentation browser
tests now explicitly load their house fixture instead of assuming that house is still
the installed default. Their assertions follow the current single-image effects,
paper palette and reader toolbar. No test changes the real user's browser storage.

## Changes reviewed

- One validated typography contract, Ink decoding at the narrative boundary and one
  renderer for preview, reader paragraphs and choices. No HTML insertion. Source
  formatting can split existing spans while retaining surrounding text and styles.
- Narration strips formatting before editor generation/human-recording digests;
  runtime speech and export already receive decoded plain segments. Device speech
  explicitly resumes its native queue after a canceled/paused previous page.
- Native dialogs share focus trapping/restoration and dismissal across editor,
  reader, photography and cinematics. Five editor forms share their action footer.
  Device voice discovery is shared between editor and reader.
- Media catalogue lookups use a map instead of repeatedly searching the complete
  catalogue for every asset/card. Media layout/anchors and magnifier state, keyboard
  controls and lens rendering have focused responsibilities.
- The director shares pending-event/check completion and delegates player detail
  projection to its existing game-session module. Combat effect aging is shared;
  its ordering and RNG behavior are unchanged. The unused preview composing option
  and ambiguous compiled-structure export name were removed.
- Ace property refreshes suppress temporary selection notifications and announce
  only the final restored cursor. This prevents a transient last-scene selection
  from redirecting the next inserted image/video. The video backup/import browser
  regression failed before this correction and passes with it.
- Source libraries, story prose, character rules and audio approval records were
  not changed by this task. Existing unrelated workspace modifications remain.

## Checks

Typecheck, Oxlint, changed-file formatting, production build and 245 unit/integration
tests pass. Focused browser checks cover source selection, hover preview, styles and
Unicode, undo/redo, save/reload, ordered page departure, native narration across
pages, centered landing link, modal focus/Escape, calibrated magnifier controls,
media insertion, uploaded video backup/restore, compilation errors and project history.
The existing 16 Chromium reader flows also pass, including the French chapter,
checks/combat, persistent dice, notifications, page animation and fullscreen interruption.
Chromium, WebKit and Pixel 7 emulation are verified for the new typography flows.
Firefox fails at `browserContext.newPage` with `Target crashed`, before application
execution; it is not claimed as verified. No physical mobile hardware or human
listening review was performed.

Fallow reports are in `.fallow/typography/`, with JSON stdout, separate stderr and
recorded command exit statuses. Dead code, duplicate exports, architecture and
duplication checks exit 0 with no findings/clones. Duplication falls from 53 reported
duplicated lines in two clone groups to zero. Changed-code audit exits 0, verdict
`warn`; inherited/moderate risk findings remain visible. The branch review was also
read alongside the connected source and Ponytail review guidance.

The comparable **complete score remains 81.4/100**, against 81.4 at the start, and the
requested 89 gate exits 1. Run:

```powershell
npx fallow health --score --hotspots --min-score 89 --format json --quiet --explain
```

Do not confuse this with the 88.1 static score from `--score` without `--hotspots`:
that command omits the 6.7 churn/hotspot penalty. The full remaining penalties are
10 for large functions, 6.7 for hotspots and 1.9 for coupling. No threshold, ignored
directory or baseline was relaxed. Further progress requires substantive reduction
of the remaining long components/functions and the director/validation hotspots;
mechanical splits or hiding files would not establish better behavior.

The boundary allowlists only gained shared UI for the editor and presentation. The
type-aware layout impact query reported partial completeness; its two direct callers
were also checked with source search and TypeScript. No autofix, telemetry enabling,
commit, deployment or audio publication was performed.
