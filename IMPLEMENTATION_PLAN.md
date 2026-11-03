# Combined Phases 2 and 3 completion

The subsequent Story Editor specification authorizes an Ink authoring surface at
`/editor`. Its delivered work, checks and explicit limits are recorded in
[the Story Editor report](docs/story-editor/implementation.md). Earlier authoring
deferrals in this historical plan no longer describe the current editor scope.
The application still has no inventory/check/XP/combat executor to expose.

Authorized together, including the latest character and photograph requirements.
See [the combined implementation report](docs/phases2-3-report.md) for final checks
and limits. The earlier Phase 2 report is a historical checkpoint, superseded here.

The delivery sequence was incremental: (1) complete bilingual Ink and asset inventories;
(2) source-library illustration selection and saved initial character profile;
(3) shared camera geometry and accessible magnifier; (4) AudioManager and narration
transport; (5) eleven native effects and cancellation clock; (6) fourteen official
React Bits lazy integrations; (7) declarative director/reader integration; (8) complete
browser, publication and Fallow checks. Each subsystem received targeted checks before
the next integration milestone. No combat, visual editor or AI planner was started.

## Phase 3 acceptance and remaining production review

- Actual reusable AudioManager, NarrationManager, EffectsEngine and PresentationSession
  run the reader; no story-specific replacement animation layer is needed.
- Eleven native primitives and fourteen locally vendored lazy React Bits components
  are supported by bounded declarative schemas, cancellation and cleanup. Only suitable
  effects are authored into this book; the complete catalog stays available offline.
- Native effects pause/resume, cancel on navigation and offer cinematic skip. Heavy
  effects use static fallbacks for constrained devices, reduced motion and hidden views.
- Narration matches exact text/language/audio hashes and drives progressive reveal.
  The demo includes 36 English Nano and 36 French V3 clips with exact text/audio hashes.
  A local service generates cache misses during reading; production uses selected MP3s.
  Device speech is secondary. Human listening remains the production quality gate.
- The visual target remains a premium cinematic digital book: coherent engraving
  palette, restrained shot direction, polished transitions and synchronized sound/text.
  Technical acceptance is covered by the report; physical-device profiling and human
  artistic/listening review remain necessary before public production sign-off.

## Historical staged plan

The original staged plan and Phase 1 record remain in Git history. Current source
ownership and executable contracts are documented in ARCHITECTURE.md, MODULES.md
and DATA_CONTRACTS.md. New phases require separate authorization.

# Incremental implementation plan

Status: **architecture approved; Phase 1 complete**. Read [ARCHITECTURE.md](ARCHITECTURE.md), [MODULES.md](MODULES.md) and [DATA_CONTRACTS.md](DATA_CONTRACTS.md) together. Later phases require separate authorization.

## Phase 1 completion record

The authorized finishing work is recorded in [Phase 1 follow-up](docs/phase1-followup-review.md): restored localized welcome, neutral tokens, one Language preference, declared translation fallback, critical Fallow/security assessment and a feature-based source layout. The initial completion counts below are historical; the follow-up records current verification. No Phase 2 story or audiovisual-engine work was started.

Implemented a small responsive React/TypeScript/Vite reader with two localized Ink passages, two reconverging choices and variable-dependent output. InkJS 2.4.0 is isolated behind NarrativeEngine and loaded on demand; its compiler runs only in build tools/tests. A typed StoryDirector publishes a frame after its coherent IndexedDB checkpoint commits. Restore uses saved resolved text/choices and post-evaluation Ink state, without Continue replay. Restart is explicit, save versions/digests/languages are checked, incompatible saves remain exportable, settings are separate and atomic revision comparison prevents cross-tab overwrites.

The foundation intentionally uses instant paragraphs. The full house story, progressive reveal, typography preferences, themes, illustration interaction, audio/cinematics, RPG, editor, AI and Capacitor implementation remain outside Phase 1. The existing first Git commit and remote were preserved; no remote push or deployment was performed.

Verification: `npm run check` passes TypeScript strict, Oxlint, Oxfmt and **21 real-ink/content/persistence integration tests**. **20 Playwright checks** pass across Chromium, Firefox, WebKit and Pixel mobile emulation, including reload/restart, EN/FR positions, keyboard/focus, 320px reflow, missing content, incompatible saves/export and browser-storage failure/recovery. Firefox requires the unrestricted executor on this Windows host; its restricted page process crashes before navigation. Desktop/mobile screenshots were visually inspected. Production build passes; a remote CI run and physical mobile/native testing have not been performed.

Fallow 3.38.1 is installed as a pinned dev dependency. Current whole-project dead-code, dependency, boundary/cycle and duplication checks pass with **zero findings**. Health baseline is **90/A**, average maintainability **92**, with one visible CRAP finding for StoryPlayer based on estimated coverage. Its browser flows are tested; the estimate is not a measured coverage percentage. `quality` deliberately reports health advisory-only while structural checks gate CI. No finding suppression or debt baseline was used. The changed-code audit against the existing first commit returns **warn, exit 0**. See [baseline](docs/phase1-health.json).

Fallow's generated guide, local MCP registration and Codex hook files were installed, skipping the skill step to preserve existing skill configuration. The native JSON bridge probe passes; `agent status` still labels hook runtime unverified and Codex trust is pending. Explicit CLI checks are verified; automatic hook interception is not claimed. No telemetry was enabled.

Architectural adjustments were small: use IndexedDB's atomic read/compare/update instead of a separate tab-lock service; use run ID plus revision for occurrence identity; keep only the schemas needed now; key reader sessions by story language and abort/dispose old sessions. No event bus, media scheduler, generic plugin mechanism or dormant RPG framework was added. The internal request-choice/save/result boundary was proven in a fixture, with tags inside bracketed labels; action execution is deferred.

Before Phase 2: retain the architecture, port the full house story with EN/FR branch parity, and add text progression/preferences through the existing reader boundary. Extract ChoiceList/ReadingControls when their added behavior makes that split useful; review the current health finding then and consider measured UI coverage. Maintain Phase 3's authored visual/audio quality gate. Native storage/audio lifecycle behavior still needs a dedicated evaluation when Capacitor work is authorized. No correctness issue currently blocks Phase 2.

## Approval decisions

The user approved the following scope and clarifications:

1. One static React/TypeScript/Vite reader, one package, InkJS adapter, shared validation and a small StoryDirector. No production backend initially.
2. First story: port the house demo in EN/FR as narrative-only in Phase 2; Phase 1 uses the small foundation fixture. Preserve clues/objects/relationships in Ink and keep the character interface optional. Do not translate the demo counters into official RPG attributes.
3. Localized Ink builds share semantic IDs and branch checks, with separate language saves initially. Seamless mid-story language transfer is deferred.
4. Published narration uses reviewed segment recordings; evaluate Nano for English and explicit Multilingual V3 for EN/FR in an isolated generation environment.
5. RPG erratum approved: keep the existing enemy-generation formula and correct only its numerical example to **15 HP at approximately 74.1%**. Do not otherwise modify the rules.
6. The final demo must achieve a premium cinematic digital-book standard, substantially improving on the prototype's illustrations, animations, direction, transitions, audio synchronization and polish. Phase 1 is a foundation, not the final visual treatment.
7. Preserve future Capacitor iOS/Android compatibility through the static Web build and existing storage/content/media boundaries. Prioritize responsive React Web; do not implement Capacitor now.

The other RPG ambiguities in MODULES.md need decisions before affected mechanics are implemented. Voice selection, French regional pronunciation and hardware benchmarks can be settled during the narration evaluation. Only Phase 1 is currently authorized; RPG, cinematics, AI and authoring implementation remain deferred.

## Delivery sequence

Each phase ends with something playable or independently verifiable. Implement only its used modules; a folder tree is not a scaffold checklist.

| Phase                              | Deliverable                                                                                                                                                                                                                   | Acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 — This review                    | Four linked design documents and persistent agent guidance                                                                                                                                                                    | Complete; architecture approved with the clarifications above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 1 — Small complete reader          | React/TS strict/Vite, minimal schemas, Ink adapter, two short EN/FR passages, choice/reconvergence, text-only display, separate settings and atomic IndexedDB checkpoint                                                      | Choose/reload/restart returns correct text and variables; incompatible saves are preserved; narrative mode does not initialize RPG. Compile/tag/request-boundary spike and save round-trip tests pass. Capture Fallow baseline after real source exists.                                                                                                                                                                                                                                                                                                                                                                                         |
| 2 — House story                    | Port all eleven passage IDs and three reconverging branches, actual EN/FR writing, quiet responsive layout, typography/reveal, themes, optional story panels, photograph viewer                                               | All eight binary-choice path combinations reach the ending with correct objects/relationships; editing prose does not break IDs; keyboard, focus, touch examination and mobile reading work. Replace hardcoded page count with milestones.                                                                                                                                                                                                                                                                                                                                                                                                       |
| 3 — Premium audiovisual experience | New/refined illustrations and art direction; deliberately staged cinematic presets, transitions and pacing; Skip, cancellation scopes, audio channels/ducking and approved prerecorded segment clips through NarrationManager | A premium cinematic digital book that substantially exceeds the HTML prototype: consistent illustration quality/composition, intentional camera direction, smooth responsive animations/transitions, perceptually verified audio/text/effect synchronization and cohesive visual polish. Review representative moments on desktop and target mobile hardware. Also verify voice-off without restart, reveal-all, choice/restart/load interruption, suspension, rejected playback, missing assets and reduced-motion equivalents. No stale effects, duplicated rewards or media-dependent reading blocks. A React conversion alone does not pass. |
| 4 — Narration production           | Reproducible Nano/V3 evaluation, approved voice profiles, finite text-variant catalog, selective generation/cache, audio review, transcode/timing manifests and bundle export                                                 | Listen in EN/FR, record measured latency/RAM/VRAM/hardware, test pronunciation, regenerate one changed segment without touching others, reject stale/wrong-language clips and verify published voice fallback. Runtime reads static files only.                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5a — Optional noncombat RPG        | After approved clarifications: official RuleSet, initialization, checks, equipment/items, abilities, XP/recovery and optional panels                                                                                          | Deterministic dice/probability/formula tests; correct item persistence and equipment caps; no RPG in narrative story; outcomes drive Ink branches without duplicated formulas. Use a separate tiny RPG fixture rather than changing house-story mechanics.                                                                                                                                                                                                                                                                                                                                                                                       |
| 5b — Combat and enemies            | Approved combat/effect/flee semantics, exact enemy generation, combat restore, defeat branches                                                                                                                                | Golden source examples after source correction, exact convolution and rounding/tie tests, hero-first retaliation, effect probabilities/durations, single resolution XP, frozen enemy stats and reload between actions. Never claim certified victory targets for arbitrary injured/equipped heroes.                                                                                                                                                                                                                                                                                                                                              |
| 6 — Authoring, later               | Ink text editing and the actual player preview first; then graph projection/limited structural editing, assets and cinematic metadata                                                                                         | Ink remains authoritative; advanced source is preserved; reference validation and stale-revision protection work. React Flow is installed only when needed. Publishing/backend decisions are made against actual author workflow.                                                                                                                                                                                                                                                                                                                                                                                                                |
| 7 — AI planner, later              | Structured, revisioned proposals using the same content/rules/asset/voice contracts                                                                                                                                           | Human review, schema/semantic validation, compile/path tests and player preview precede acceptance; no runtime executable generation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Bring a needed feature forward only for a concrete demo requirement. Do not implement combat, a general editor or live TTS merely because their interfaces appear in the architecture.

## Tests tied to real risks

| Area                      | Focused checks                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ink adapter               | Stable tags/choice mapping, interpolation, reconverging branches, host-request boundary, synchronous query lookahead, compiler/runtime compatibility, state round-trip. A real tiny compiled Ink fixture is more useful than mocking the runtime.                                                                                                     |
| Director/save integration | Snapshot after evaluation; restore without Continue/reward replay; repeated clicks; same action ID on a later occurrence; stale callback rejection; cancellation settles once; rollback after a rejected mutation; blocked IndexedDB and write ordering.                                                                                              |
| Schemas/content           | Invalid bounds/durations, cyclic cue dependencies, unsupported actions/effects, duplicate IDs, broken asset refs, wrong locale/digests, unsafe paths and oversized content.                                                                                                                                                                           |
| Text/media                | Grapheme/emphasis-safe reveal; immediate voice-off; actual transport time at non-default speed; missing timing; never-ending audio and rejected play; pause/suspension; skip all children of a cue group; release ducking on every completion path.                                                                                                   |
| RPG                       | Exact d6/d20 outcomes; initial 3d6 distribution; attribute/rank caps; threshold damage bonuses; XP on success/failure and once per combat; ceil recovery; independent effect draws using fixed RNG; equipment exclusion in enemy generation; exact HP search/ties; no recalculation after enemy creation. Add resolved edge rules as golden examples. |
| Browser flows             | Read/choose/reload/restart; narration off during playback; cinematic Skip; missing illustration/audio; settings persistence; EN/FR interface and story selection; keyboard dialogs and visible hotspots; touch/mobile layout. Chromium/WebKit/Firefox as supported by the selected Playwright version, plus actual target-mobile audio checks.        |

Use Vitest for pure domain and coordinator integration; Playwright for a small number of critical browser paths. Start with tests for the first slice, then grow with behavior. Do not add blanket snapshot suites, speculative tests or an arbitrary coverage percentage. Record domain invariants and regression examples; Fallow does not replace any of these tests.

Accessibility requirements belong in acceptance criteria: semantic buttons, visible focus, focus return/containment, touch targets, readable contrast, zoom/reflow, reader-selected typography and reduced motion. Screen readers receive coherent paragraph text, not character-by-character live-region spam. Hide decorative effects from accessibility APIs. Reduced-motion preferences suppress shake/flash and use static transitions; provide an explicit reveal/skip control regardless of motion settings.

## Continuous Ponytail and Fallow use

At the initial review, only skill instructions were available and no JS/TS code, baseline or Git base existed. Phase 1 has now completed the CLI/configuration/checks below; project-local MCP/hook files are installed with trust/runtime limits recorded in the completion record. A skill lockfile alone still does not prove enforcement.

The setup sequence used after approval, retained as guidance for future tooling changes:

1. Read the installed `fallow-setup` skill for tooling changes. Install `fallow` as a pinned development dependency and preserve its lockfile. Prefer project-local execution over an unpinned download on each task.
2. Check the installed CLI's schema/help and supported commands. Use `npx --no-install` (or package scripts) so an absent binary does not silently fetch a different version. Existing local skill guidance takes precedence over remembered flags.
3. Run the initial whole-project health, dead-code, duplication and architecture analyses. Keep report metadata with commit/tool version outside generated source; review findings before choosing gates. A clean new project normally needs no backlog baseline suppression.
4. Add only meaningful architecture boundaries, such as domains not importing React and runtime/build separation. Check that current Fallow rules actually express these imports; do not claim enforcement from directory names alone.
5. Add one CI quality job alongside typecheck/lint/tests. Require architecture checks and agreed dead-code gates; use a real Git base for changed-code audits. Review complexity, duplication and styling findings contextually. Fallow styling candidates do not replace CSS/accessibility review.
6. For agent/Git hooks, preview `fallow agent install --dry-run`, inspect requested integration changes, then follow the setup skill's activation workflow. Verify `fallow agent status --format json --quiet` before reporting enforcement active. Preserve existing skills with `--without skill` rather than forcing replacement. Installation does not imply Codex trust or verified automatic enforcement.

Proposed commands, to verify against the installed CLI before adding scripts:

```text
npm install --save-dev fallow
npx --no-install fallow schema
npx --no-install fallow health --format json --quiet --explain
npx --no-install fallow dead-code --format json --quiet --explain
npx --no-install fallow dupes --format json --quiet --explain
npx --no-install fallow architecture --format json --quiet --explain
npx --no-install fallow audit --base <actual-base-ref> --format json --quiet --explain
```

For machine reports, parse stdout as JSON, inspect `kind`/schema version/gate status and preserve stderr separately. Exit 0/1 are analysis outcomes; 1 indicates an enforced finding, not an execution failure. Other exit codes need investigation. Use `guard` before boundary-sensitive edits and `architecture` after changes where supported. Trace consumers before removing an export/dependency; dry-run any supported autofix and inspect the actual diff. Never enable telemetry for the user, and never run an interactive watch command in agent verification. The installed skill documents these constraints. [Fallow skill](.agents/skills/fallow/SKILL.md), [Official project](https://github.com/fallow-rs/fallow)

Apply Ponytail on every coding task: read affected code/callers first; prefer an existing/library/native solution; preserve validation, correctness and accessibility; make the smallest complete change and test meaningful new logic. Note a deliberate shortcut and when to revisit it. At each vertical-slice milestone, use the installed Ponytail review guidance for a human-readable logic/security/data-integrity review, complemented by Fallow's deterministic evidence. Do not automatically apply every finding. [Ponytail skill](.agents/skills/ponytail/SKILL.md), [Review skill](.agents/skills/ponytail-review/SKILL.md)

Root [AGENTS.md](AGENTS.md) records these expectations without overwriting `.agents` or its installed skills. Update relevant design documents when a boundary or contract changes; keep this document's phase/approval status accurate as work is authorized. Skill availability and enforcement should be checked again after environment changes.

## Performance and deployment

The first production artifact is a static reader plus versioned bundles/assets served over HTTPS. No accounts, DB server, inference endpoint or cloud runtime collection is necessary. Use immutable cache headers for hashed media and explicit bundle digests; retain compatible story releases for old saves. Keep a small unversioned library index with an appropriate update cache policy.

Lazy-load story bundles, optional RPG and panels. Provide responsive compressed illustrations; preload only the current/next likely segment audio with a memory cap. Stream longer music/ambience instead of decoding every track. Reuse audio resources and revoke temporary object URLs on disposal. Animate transform/opacity preferentially; avoid per-character React tree rebuilds. Profile the completed slice on a slower phone before setting numeric budgets. Full offline caching and a service worker are later decisions.

The offline TTS command exports regular files to the same bundle. A future backend is justified by shared authoring/accounts or remote generation queues, not by playback. Model environments, credentials and Python dependencies never ship to the browser.

## Review performed and limits

Inspected both supplied references, workspace contents and installed skill instructions; checked current official library/model documentation. Independently enumerated the DOCX example's 216 outcomes: 15 HP gives 160 wins, 17 gives 108. This was a temporary analysis, not added application code.

Documentation links, code-fence balance and contract consistency were checked. The broad TypeScript examples in DATA_CONTRACTS.md remain illustrative; the implemented subset is typechecked. The initial review did not run application tests, tools or inference benchmarks; Phase 1 checks are recorded above. Narration/audio performance and cinematic quality remain untested because those features are not implemented. Phase 1 completion does not authorize subsequent phases.
