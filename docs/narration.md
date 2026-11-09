# Local narration preparation and preview

Narration stays outside React. The reader uses NarrationManager → AudioManager;
the local preparation tool uses official Chatterbox checkpoints. No paid service,
Sonniss voice recording or browser model download is involved. The Orée story also
uses synthetic voice references, described below.

AudioManager playback now returns a completion promise. Pause, resume and channel
cancellation stay on the manager; the unused public seek/per-clip transport API
was removed. Narration still verifies clip bytes and text digests before playback.

## Reproduce the environment

The verified machine has Windows, Python 3.14 and an RTX 4060 with 8 GB VRAM.
The project-local environment is ignored by Git; model/source/cache files stay
under `assets/narration/`. Normal React development and CI do not install Python ML.

```powershell
python -m venv .fallow/tts-venv
.\.fallow\tts-venv\Scripts\python.exe -m pip install -r tools/narration-requirements.txt
# On this NVIDIA machine, use matching official CUDA wheels:
.\.fallow\tts-venv\Scripts\python.exe -m pip install torch==2.11.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu130
npm run narration:export
.\.fallow\tts-venv\Scripts\python.exe tools/narration.py download
.\.fallow\tts-venv\Scripts\python.exe tools/narration.py prepare --locale both
.\.fallow\tts-venv\Scripts\python.exe tools/narration.py verify
npm run build
```

On other platforms, activate an appropriate Python environment and use `python`
instead of the Windows executable path; choose supported CPU/CUDA/MPS dependencies.
The official project was originally tested with Python 3.11 on Debian. The installed
source now also declares Python 3.14 dependency ranges. The source revision is pinned
in [requirements](../tools/narration-requirements.txt); model revisions are recorded
in [the model catalog](../assets/catalog/narration-models.json).

If the Hugging Face client stalls for the French weights, the standard-library
`python tools/download-narration-models.py` resumes bounded HTTP ranges and verifies
the official LFS SHA-256 before installing a checkpoint. Completed files are reused.
Do not run two downloaders against the same destination at once.

## Actual text, caching and publication

Expressive typography is decoded before narration. The Ink adapter emits plain
segment/choice text and separate validated style spans; neither playback nor export
speaks the `<typo>` tags. The editor's on-demand generation and human recording
digest also use the plain text. Styling does not change the spoken-text cache key.
Existing clips keep their listening-review status; this change generates or approves none.

Device speech resumes the browser's synthesis queue before speaking an unpaused
page. This covers browsers retaining their native paused flag after cancellation,
including when the prior utterance has already been released by the application.

`narration:export` traverses the authored Ink paths with a bounded state budget,
including check and combat outcome variants. Orée 1.2 exports 260 exact
NFC segment variants (130 per language) with stable IDs and text SHA-256. No hand-maintained copy
of narrative paragraphs is used for generation.

`prepare` selects Nano for English and Multilingual V3 for French. The provider's
embedded default conditioning is used. English also offers V3 in local preview,
which can use the same model voice profile across both languages. Voice identity
and pronunciation still need listening review; no claim of matching speakers is made.

Cache identity includes segment ID, normalized text, language, voice profile, model
revision, pinned source and generation settings. An unchanged clip is reused without
model loading. Changed text/settings regenerate affected entries. WAV originals and
cached MP3s remain in `assets/narration/cache/`. Only selected current derivatives are
copied to `stories/house/media/`, with a reproducible `stories/house/narration.json`.
The compiler verifies audio hashes and excludes stale Ink builds from publication.
Prebuilt selected MP3s allow ordinary builds without raw libraries or model weights.

The tool checks finite/non-silent waveform samples, duration, FFmpeg decode and MP3
identity. Generated clips are explicitly marked **preview**, with human listening
pending. That status is different from a human-approved production recording.
No word timestamps are invented: manifests have empty timing marks unless real
alignment is supplied. Playback coordinates at segment boundaries in that case.

## Generation while reading

Start the service in one terminal and the reader in another:

```powershell
.\.fallow\tts-venv\Scripts\python.exe tools/narration.py serve
npm run dev
```

The service listens only on `127.0.0.1:8765`; Vite proxies `/api/narration`. The original
endpoint accepts only exact exported story variants. `/api/narration/editor-preview`
also accepts bounded authored text for unsaved editor previews and edited local stories.
Both endpoints accept named profiles and synthesis settings, with a 7 MB request cap.
The normal reader additionally requires an exact exported story segment.
Examples must be MP3/WAV, 6–30 seconds and at most 5 MB, with author-attested rights.
Forced audio demuxers, local-only protocols and decode timeouts prevent interpreting
an upload as a playlist. Both endpoints check loopback Host/Origin, serialize model
generation and serve only hash-named
cached MP3s. It is a local preview tool, not a public TTS deployment. Refresh the
export after changing repository Ink for batch generation. Cached requests are fast; a new paragraph can have initial
generation latency. Navigation cancels its browser request; an inference already
running may finish into the cache, but its stale audio cannot enter the new scene.

The editor separates model and voice selection. Nano supports temperature and seed;
Multilingual V3 also supports exaggeration and guidance. Pitch is applied with FFmpeg
while preserving duration; playback speed and volume apply in the audio player.
Settings, reference identity and model revision participate in cache identity.
Reference conditioning does not retrain model weights. Each built-in generation resets
the model's original conditioning so an earlier custom voice cannot leak into it.

The static production reader uses bundled clips; it does not require this service.
The device voice is an optional fallback. A voice change applies at the next segment
or explicit Replay; speed/volume changes do not restart a current clip. Pause, Resume,
Replay, Narration Off and scene changes all use AudioManager's existing transport.

See [the official source](https://github.com/resemble-ai/chatterbox),
[Nano](https://huggingface.co/ResembleAI/chatterbox-nano) and
[Multilingual V3](https://huggingface.co/ResembleAI/chatterbox). Both model cards declare
MIT licensing. Keep provider watermarking and included notices intact.

For EN/FR, a scoped adapter bypasses an upstream Chinese-only converter initialization
that otherwise downloads unrelated resources into the user home. No installed files or
Latin tokenization are changed. Revisit this workaround before adding other languages.
French generation was verified with Hub offline mode enabled.

## Orée narrators (2026-11-07)

Orée supplies six Multilingual V3 registers in both English and French: Ariane (warm),
Noé (calm), Lison (childlike), Éli (youthful), Alma (mature/mellow) and Basile (deep).
These are two local synthetic speaker bases with four pitch-shaped reference variants,
not six independently recorded speakers. `tools/prepare-narrator-voices.ps1` prepares
the references from Microsoft Linda/Richard, using FFmpeg Rubber Band without changing
duration. `tools/create-magic-story.ts` embeds the bounded references into each language.
Uploaded author references and installed device voices still use the existing controls.

All twelve voice/language combinations were generated through the normal endpoint and
then requested through the editor-preview endpoint. Each pair returned the same cached
MP3; voice, locale, settings digest, audio hash, decode and preview status were checked.
This is a technical check, not a listening review. Speaker-reference reuse rights have
not been independently verified and are explicitly recorded separately from the model
license. No clip was promoted to approved audio.

Live narration requires the local service. Static/mobile distribution needs optimized
clips for the selected voices and all text variants, followed by human listening review.
The exporter merges equivalent visible frames/globals and has an 8,192-state bound;
revisit it before adding visit-count-dependent loops or prose that interpolates dice/HP.

Paragraph playback now prepares the next local recording during the current recording.
Device narration joins ordinary-page paragraphs into one utterance; full-screen cinematic
barriers retain segmented playback. Device voice changes apply on the next page or Replay;
local voice settings are rechecked before each segment. Text reveals approximately 65
graphemes ahead, and does not move backwards when transport progress changes.

Audio processing revision 1 trims only the leading and trailing silence. Reversing the
signal for the second trim preserves pauses within the recording. Cache keys include
this revision; old MP3 URLs are never overwritten, and an existing exact-source WAV can
be re-encoded without generating speech again. Fresh FR/EN first-paragraph generation
took 15.838s/13.185s locally, with subsequent reader/preview requests taking 12ms/30ms.
Cold synthesis can therefore still take several seconds; clips remain previews until
listening review. Background audio ducks and recovers smoothly over 600ms around playback.
