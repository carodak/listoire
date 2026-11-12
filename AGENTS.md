# Listoire project instructions

## Scope
Listoire is a bilingual (en/fr) interactive book: a reader (Ink stories,
RPG rules and combat, narration, cinematic presentation) and a story
editor (text, media composition, narration, game configuration).
Not in scope: AI planner, Capacitor build. Mobile compatibility is
still required.

## Architecture
- React UI must not own Ink progression or RPG calculations. Ink stays
  behind NarrativeEngine; StoryDirector owns progression and
  cancellation. RulesEngine stays pure (no React, Ink, media or
  persistence).
- Gameplay mutations and dice rolls never originate in presentation
  callbacks or Ink lookahead/external functions. Saves hold coherent
  Ink/domain/RNG snapshots.
- The RPG DOCX is authoritative, with one approved erratum: keep the
  enemy formula, its example is 15 HP (about 74.1% victory).
- Features live in src/features/*; shared contracts, storage, i18n and
  app composition stay outside features. Same validated contracts for
  manual stories and the editor.
- assets/ source libraries stay local and unchanged. Library images
  are freely licensed and may be published, catalog included. Keep
  each asset's license and attribution in docs/contributions.md.
- Generated narration clips remain previews until a human listens.
- Update the affected doc in docs/ when a contract or boundary changes.

## Git
- Never commit to main, never push. One commit per item.
- Never commit logs, reviews, notes, .patch or .disabled files.
- Delete dead code instead of archiving it; git history keeps it.

## Environment (Windows)
- Run Vite, Vitest and Playwright from PowerShell, never Git Bash
  (lowercase drive letter breaks them).
- Dev server: port 4175 only, via the untracked
  playwright.local.config.ts (4173 and 4180 are off-limits). Start it
  once, warm it (editor page and a page with dice), keep it running,
  stop it when done.

## Code
- Read .agents/skills/ponytail/SKILL.md before coding and follow its
  ladder: delete > reuse > platform/stdlib > installed dependency >
  small change > minimal new code. Reuse src/shared/ components.
- All new UI text through i18n (en + fr).
- No new ignorePatterns, config exclusions or suppression comments.
- No artificial splits or one-liner cramming.
- Before adding CSS, reuse an existing rule if one fits.
- Only format the files you change.

## Tests
- Never weaken an assertion or drop coverage of a behavior. Moved code
  keeps its tests. Log any changed or removed assertion with the
  reason and where the behavior is still covered.
- Extend the existing test file for a module; create a new file only
  when none exists.
- Logic (computations, validation, rules) → unit test. E2E only for
  full user journeys, never for what a unit test already covers.
- No assertions on CSS values, pixel positions or DOM structure;
  assert user-visible behavior.

## Checks
After each commit (~1-2 min):
- typecheck + lint
- all unit tests: npx vitest --run
- the e2e spec(s) you touched, chromium only
- fallow audit runs automatically before each commit (hook); fix what
  it reports.
- Run e2e with 4 workers (--workers=4), except when measuring
  performance.
- Run npm run perf only when a change targets performance.

Once at the end of a session:
- full e2e on chromium
- E2E_PORT=4175 npm run test:coverage, then
  npx fallow health --score --hotspots --coverage coverage/coverage-final.json
  (score >= 92)
- if something fails, git bisect over your commits and fix it in a
  new commit.

## Working alone
I usually don't check in: don't stop for my OK. Take the most
reasonable choice, log it in REFACTOR_LOG.md and keep going. Only stop
before something that can't be undone (deleting user data, an
incompatible save or project format change): prepare it, write the
options in the log, and move on.

## REFACTOR_LOG.md
Read the summary at the top first. Update it in place; keep at most
the last 3 passes in detail and move older ones to
docs/refactor-history.md.

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
