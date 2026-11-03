# Listoire project instructions

## Current scope

Phases 2 and 3 are authorized together: complete bilingual house story, source-library
assets, character panel, precise photograph magnifier, reusable audio/narration/effects
engines and declarative direction. Preserve the approved landing and wide reader.
Initial character: 6/6 HP, STR/DEX/WIL each 3d6, retained in the checkpoint; two Rank 1
abilities, unused in narrative checks. No RPG combat/check executor, editor, AI planner
or Capacitor implementation. Future mobile compatibility remains required.
Do not reuse/extract embedded HTML illustrations. All house imagery must come from
the downloaded assets/images library. The HTML remains a story/layout reference.

## Architecture

- React/TypeScript UI must not own Ink progression or RPG calculations.
- Group cohesive functionality in `src/features/landing`, `reader` and
  `story-runtime`; preserve the finer Fallow zones inside story-runtime.
  Keep shared contracts, storage, localization and app composition outside features.
- Keep Ink behind NarrativeEngine; StoryDirector owns progression and cancellation.
- Keep RulesEngine pure and independent of React, Ink, media and persistence.
- The supplied RPG DOCX is authoritative with one user-approved numerical erratum:
  retain the enemy formula and correct its example to 15 HP (about 74.1% victory).
  Other mechanics remain unchanged; settle remaining gaps before implementation.
- The HTML is a functional/conceptual prototype. Later visual/audio production must
  achieve a premium cinematic digital book, substantially exceeding its polish.
- Gameplay mutations and dice rolls must not originate in presentation callbacks
  or Ink lookahead/external functions. Save coherent Ink/domain/RNG snapshots.
- Use the same validated contracts for manual stories, future authoring and AI.
- Separate UI/story localization, story saves/settings and TTS generation/playback.
- Favor one static modular application; do not build future editor/AI infrastructure.
- Source libraries in `assets/` remain local and unchanged; only explicitly referenced,
  licensed optimized story files may be published. Never expose catalogs as an asset
  redistribution service. Record provider-verified and user-attested rights separately.

## Engineering and verification

- Read `.agents/skills/ponytail/SKILL.md` for coding tasks. Prefer the smallest
  complete change, existing solutions and focused modules; preserve accessibility,
  validation and data integrity. Document meaningful limits and revisit conditions.
- Read `.agents/skills/fallow/SKILL.md` for analysis; use `fallow-setup` for tooling
  changes. Installed skill instructions do not establish executable/hook availability.
- After JS/TS exists, establish a code-health baseline. Run applicable Fallow
  architecture/dead-code/duplication/changed-code checks after significant changes
  and before milestones. Review evidence; trace before deletion; dry-run autofixes.
- Fallow reports use JSON/quiet and separate stderr; preserve exit and gate status.
  Do not enable telemetry. Report missing tools or unverified enforcement honestly.
- Typecheck, lint and test implemented behavior. Use deterministic domain tests,
  real Ink fixtures, lifecycle/save integration tests and focused browser flows.
- Review milestone changes for logic, interruption, data loss, security and scope
  using installed Ponytail review guidance. Fallow complements this review.
- Update affected design documents when contracts/boundaries change. Preserve
  existing user work and installed skill configuration. Report checks and limits.

---

<!-- fallow:setup-hooks:start -->
## Fallow checks

Use fallow for code-quality, cleanup, and setup tasks in this repository. Fallow checks the changed code before each `git commit` and `git push`. In Claude Code and Codex, a PreToolUse hook from `fallow agent install` runs this check and blocks the command when the verdict is `fail`. Other agents run the check themselves: `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before you try again. A JSON runtime error such as `{ "error": true, ... }` does not block.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to... | Run |
|---|---|
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` |
| prove a TypeScript symbol's exact consumers before refactoring | `fallow dead-code --type-aware --symbol-impact <file>:<export-or-class.method>` |
| find how one module reaches another | `fallow trace --path <from> <to>` (Reports `reachable: false` instead of failing when no import path exists; type-only hops are reported, not skipped.) |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` |
| migrate a dependency | `fallow trace --dependency <name> --sites` (Counts each imported name, follows one hop through project wrappers, and counts each use that it cannot resolve.) |
| commit or open a PR | `fallow audit --base <ref>` |
| read a diff before approving it | `fallow review --base <ref> --brief` (orientation, never gates: deterministic and always exit 0, unlike the audit row) |
| prioritize refactoring | `fallow health --hotspots --targets` |
| ask who owns code | `fallow health --ownership` |
| check untested-but-reachable code | `fallow health --coverage-gaps` |
| consolidate duplication | `fallow dupes --trace dup:<fingerprint>` |
| find feature flags | `fallow flags` |
| check which architecture rules apply to a file before changing it | `fallow guard <files>` |
| check import cycles, boundaries and policy rules after changing code | `fallow architecture` |
| surface security candidates | `fallow security` |
| understand a finding | `fallow explain <issue-type>` |
| scope a monorepo | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |
<!-- fallow:setup-hooks:end -->
