# Phase 1 follow-up: changes and critical review

Scope: finish Phase 1 only. The full story, cinematic/audio engines, editor, RPG and AI remain deferred.

## Feature organization

Eight existing files moved into cohesive reader and story-runtime features. Before
functional changes, all 21 original tests passed and the generated production
asset hashes matched the pre-move build exactly. Shared contracts, persistence,
localization and app composition stayed outside features. No barrels, proxies,
empty feature directories or new architecture layers were added.

The landing feature owns its welcome, animation hook and small optional typing
sound. Runtime/Ink/content still have separate Fallow import zones despite sharing
the story-runtime directory. React imports are forbidden throughout that feature.
Existing user Git staging and installed skill/hook configuration were preserved.

## Requested behavior

- Original EN welcome wording and localized FR equivalent; creation is disabled
  with an explicit Coming soon label.
- A 2.2-second subtitle reveal, 180ms button fade, immediate keyboard-accessible
  Skip, and immediate reduced-motion display. A separate completion deadline
  prevents a throttled animation-frame loop from holding access hostage.
- Low-volume, varied procedural key taps spaced roughly 90–140ms apart, not one
  sound per character. No audio context until a permitted gesture; mute persists.
  Failed/blocked audio never controls visual progress. Skip, completion, hiding
  the tab or leaving the welcome cancels its frame/timer/listener/audio resources.
- White page and neutral gray surrounding surface; shared CSS tokens replace warm
  colors while preserving the existing typography and layout.
- A single flagged Language selector. Available translations load their own save;
  an unavailable translation keeps the declared default and shows a localized note.
  Schema-1 settings migrate from the old interface preference; Ink/save formats
  and compiled story digests remain unchanged.

The language control uses native `details` disclosure and ordinary option buttons,
with Escape/focus handling and inline SVG flags. This small app-specific component
avoids Windows' regional-letter rendering of flag emoji without a dependency or
general UI framework. Keyboard selection and actual flag rendering are tested.
WebKit can blur the summary with no related focus target when pointer-selecting
an option; that blur is not treated as leaving the control. Browser checks cover
this path as well as keyboard selection. Local tests run sequentially to avoid a
Firefox Windows context-cleanup protocol error observed under parallel execution.

## Fallow findings: assessment and action

| Signal                      | Evidence and decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| StoryPlayer complexity      | Cyclomatic 8/cognitive 12; the CRAP finding estimates no test coverage because browser flows are not measured coverage input. Keep the cohesive reader component and its visible finding. No artificial split, suppression or claim of measured coverage.                                                                                                                                                                                                                                                          |
| SaveManager split candidate | The original 74-LOC module coherently validates/persists checkpoints and preferences through one storage adapter. Dependents alone do not justify splitting it. Keep it, adding only the required settings migration.                                                                                                                                                                                                                                                                                              |
| Ink adapter split candidate | The original 93-LOC adapter has one responsibility: tagged Ink evaluation and compatible restoration. Move it intact; keep validation, error handling and tests.                                                                                                                                                                                                                                                                                                                                                   |
| SSRF candidate on fetch     | This is a static browser application: no server-side fetch/proxy exists, and no URL comes from a query, manuscript or remote proposal. The original HTML base URI could nevertheless affect resolution. Use the application location instead, validate the locale before interpolation, restrict protocol/origin/path, reject credentials and redirects, and test these cases. Fallow's generic nonliteral-fetch candidate remains visible; its module-level taint label is not proof of attacker control or SSRF. |
| Unresolved callees          | The initial report counted 199 unresolved call sites, primarily dynamic dispatch and unsupported object assignments. Samples include React setters, Zod chains, IndexedDB/domain ports and Playwright calls. These are analysis blind spots, not 199 exploitable sinks. Inspect concrete security candidates and their inputs; no blanket suppression or unsupported security-clean claim.                                                                                                                         |

There is no vulnerability-driven need to split the save manager or adapter. The
meaningful boundary improvement is the tested content URL policy. The current
policy is for HTTP(S) Web deployment; a future native resource adapter must explicitly
allow its trusted Capacitor scheme rather than relaxing this allowlist globally.

## Verification

TypeScript, lint, formatting, the production build and **31 unit/integration tests**
pass. The complete final suite passes **52 browser checks** in Chromium, Firefox,
WebKit and Pixel mobile emulation. It covers welcome deadlines/skip/reduced motion,
audio failure and cleanup, pointer/keyboard language control, translation fallback,
save migration/preservation, storage recovery and neutral reader colors. Final
desktop/mobile welcome and reader screenshots were inspected.

Fallow's final dead-code, dependency, architecture/cycle/boundary and duplication
checks have **zero findings**. Health is **87.9**, with the same single visible
estimated-coverage finding on StoryPlayer; added UI is not treated as a reason to
game the score or split cohesive modules. Security still reports the one reviewed
browser-fetch candidate and **284 unresolved callee sites** after the added UI/tests.
The changed-code audit is advisory (`warn`, exit 0); security results are candidates,
not a comprehensive security certification. No suppression was added.

The original [baseline](phase1-health.json) remains historical and is not rewritten
to hide findings. Raw follow-up tool reports live in ignored `.fallow/` files.

Remaining limits: physical devices, native Capacitor and automatic Codex hook
interception are unverified. Typing sounds are synthesized, not licensed keyboard
recordings; perceived timbre/volume still warrants listening on target devices.
