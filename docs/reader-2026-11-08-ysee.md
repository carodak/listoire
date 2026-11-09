# Orée: practice duel with Ysée

The user selected a direct training duel with Ysée instead of the paper dragon.
Orée 1.3 rewrites `entrainement`, `duel` and `apres-duel` in French and English.
Ysée uses a cushioned shield and a padded staff; the goal is to break through her
guard and touch her sleeve. Both victory and withdrawal/exhaustion have coherent
outcomes, followed by practical advice. The opponent name, action, page headings
and story descriptions now agree with her existing sketch-gallery portrait.
Combat formulas and difficulty are unchanged. The two-second vibration follows
the tap of her staff, rather than the waking of a creature.

The release is `oree-1.3.0`, with checkpoint namespace `oree-v1-3`. Changed Ink
programs are not loaded against earlier checkpoints. Previous `oree-v1-2` and
`oree` saves remain stored; the revised story starts a new playthrough. Recognized
default 1.2 drafts are archived in full before installation, as with earlier default
revisions. Offline, renamed custom and concurrently saved drafts retain their
existing protections. Archived drafts can be restored/exported from editor history.

The narration export still contains 260 exact bilingual variants. Sixteen variants
belong to the revised duel. All six profiles in both languages pass the normal and
editor-preview authorization checks (96 combinations). Publication references are
filtered against the current exact text and cache identities; cached waveforms
are retained. New speech remains on demand and is not listening-approved.

Verification logs are `.fallow/ysee-*`: 229 unit/integration tests and six Python
tests pass. The changed-code Fallow audit exits 0 with `warn`. The previously
measured global score of 81.4 remains below the earlier 88 target.
Twelve browser flows pass across Chromium, Firefox, WebKit and Pixel 7 emulation:
the complete French chapter, combat restoration, and the archived 1.2 upgrade.
Production build and published-asset verification pass; source illustrations are
unchanged. New duel speech has not received human listening review.
