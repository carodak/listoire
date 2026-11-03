# Story Editor verification

Verified locally on Windows on 2026-11-03. Authoring remains at `/editor`.
The scope and deliberate limitations are in [implementation.md](implementation.md)
and [cinematic-effects.md](cinematic-effects.md).

## Automated checks

| Check                                                       | Result                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run check`                                             | Passed: story build, TypeScript, lint, formatting and 115 tests in 17 files                         |
| `npm run build`                                             | Passed; editor and compiler load separately from the initial reader                                 |
| `python -m unittest discover -s tools -p test_narration.py` | 5 passed                                                                                            |
| `python tools/verify-assets.py --published-only`            | 80 files, 3,002,705 bytes, no extraction failures                                                   |
| `git diff --check`                                          | Passed                                                                                              |
| Playwright, Chromium / Firefox / WebKit / mobile Chromium   | 140 passed in 6.6 minutes; video-resume regression checked separately                               |
| Fallow audit, default merge-base scope                      | Exit 0, `warn`: 0 dead-code issues, 84 complexity findings, max cyclomatic 19, 2 duplication groups |
| Fallow architecture                                         | Exit 0, no detected cycles or configured boundary violations                                        |
| Fallow review, `--base HEAD`                                | 23 accepted judgments, 0 rejected, snapshot current; see [review.md](review.md)                     |

The original English and French Ink digests remain `a71cf399f8d1` and
`d468f79cc9e2`. Migration tests compare 16 original paths per language, including
photograph examination and save/reload outcomes. Published source libraries were
not changed or exposed.

Behavioral checks include invalid-draft retention without replacing the working
reader, complete bilingual undo/history, source-position image placement, media
reference deletion, native untagged Ink, conditional media anchors, CRLF source,
Find query transfer, scene-media highlights, compatible animation targets, preview
window controls, panel resizing and preview focus isolation.

The video browser flow uploads an owned one-second MP4, exports the complete
project, clears its binary store, restores the backup and reopens the actual
reader. Chromium, Firefox and mobile Chromium check that playback time advances.
Windows WebKit preserves the file and controls but lacks a suitable MP4 decoder
in this environment; it uses the documented duration override. This is not proof
of video decoding on Safari or physical mobile devices.

Lifecycle tests cover timeline pause/resume/cancellation and restoration of image
styles, bounded camera transforms, reduced motion, waiting for video data before
issuing fullscreen cues, Replay/Back and disposal during an awaited departure.
Closing a preview cannot commit a pending story choice.
The final regression proves Resume does not start a hidden or expired video.
After that focused fix, all 115 unit tests and the production build passed again;
the 16 affected browser flows were rerun across all four browser configurations.

Desktop (1600 x 1000) and narrow (390 x 844) editor captures were inspected locally.
They verify layout and controls, not a measured frame-rate or an artistic approval.

## Real narration smoke checks

Actual local synthesis, MP3 decoding and hashes were checked separately from the
browser tests, which intercept the local preview endpoint to inspect requests:

- Nano English on CUDA: default voice and a synthetic reference-conditioned voice,
  including a pitch offset; approximately 1.6-second output clips.
- Multilingual V3 French on CPU: synthetic reference conditioning, temperature,
  guidance, expressiveness and pitch -1; 1.839-second output.
- Reference size/type/duration validation, local-only FFmpeg decoding, cache
  identity and resetting conditioning between voices have focused checks.

An initial French GPU attempt exited inside the native inference stack while an
older narration service also occupied GPU memory. The CPU retry passed; this does
not establish custom French GPU generation reliability. No model weights or installed
model packages were changed. Reference audio conditions the existing model; it does
not train new weights. All generated clips remain previews pending human listening.

An already-running narration process was preserved. Restart the local narration
service to load the updated Python endpoint and voice parameters. The new code was
exercised directly through real synthesis; a pre-existing process cannot reload it
automatically.

## Review limits

Fallow's warnings were inspected rather than suppressed or resolved by weakening
thresholds. The two short duplication groups are duration-input markup with
different media constraints and existing build-output boilerplate. They do not
justify a new general-purpose form or build abstraction.

Fallow security reported 38 candidates, not confirmed vulnerabilities. Dynamic
application fetches use fixed origins, validated asset paths, digest checks and
redirect rejection. Vendor Ace regex, object-copy and HTML construction sites were
traced: editor text is passed as text; search markup and options are trusted
constants. Explicit user regex searches can still be expensive on large documents.
This was a focused trust-boundary review, not a security certification.

No policy rule packs or production runtime coverage are configured. Zero policy
violations means that detector did not run. Import reach in the review describes
the dependency graph, not execution coverage.

The expected load is one local author with a static reader. Browser storage quotas
still apply. Back up the complete project before clearing site data. Metadata is
capped at 8 MB, archive imports at 200 MB, each video at 50 MB and human/voice-example
audio at 5 MB. No deployment, physical-device performance run, automatic image
segmentation or human listening approval was performed. Auto Parallax uses the
documented 2D fallback; page turns are a lightweight perspective approximation.

No RPG combat/check executor was introduced. The original specification assumes
one that the repository does not contain; unsupported controls remain disabled and
explained rather than simulating domain results in React.
