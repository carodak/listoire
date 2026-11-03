# Contributions

## Mechanical Keyboard Typing (Treble Version)

- Author: stu556
- Source: [Freesound](https://freesound.org/s/450282/)
- License: CC0

The 2.2-second mono MP3 was converted from the supplied WAV with FFmpeg.
Published path: `public/audio/keyboard-typing.mp3`.

## Published illustrations and sound design

Eight selected dependencies are used: four images and four sound/music excerpts.
No embedded prototype image is reused. Original paths, local license evidence,
source/output hashes and excerpts are in [the curated catalog](assets/catalog/curated.json).

| Resource                                   | Creator / source                                         | Use                                                                                         |
| ------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Antique telephone receiver                 | 344 Audio                                                | House scene cue only; no reusable sound library                                             |
| Chimney wind                               | InMotionAudio                                            | House scene cue only; no reusable sound library                                             |
| Metal impact accent                        | 344 Audio                                                | House scene cue only; no reusable sound library                                             |
| Keeper of Keys — Element 1                 | HTC Heritage Type GmbH; historical artist not identified | Illustrates the brass key found inside the letter                                           |
| Spirit & Myth — Element 5                  | HTC Heritage Type GmbH; historical artist not identified | Bird emblem associated with the letter seal                                                 |
| Music Box A 013                            | Sonic Bat                                                | Quiet music-box recollection during the telephone lullaby; not presented as literal humming |
| Childhood Memories 02 — Element 3          | HTC Heritage Type GmbH; historical artist not identified | Restrained hand outline at the window revelation                                            |
| TCP Human 5 — Terrible Character Portraits | Jeff Preston; project coordinated by Duane O’Brien       | Girl portrait and interactive photograph; selected by the user                              |

**TCP Human 5 / Terrible Character Portraits:** art by [Jeff Preston](http://team-preston.com),
project coordinated by [Duane O'Brien](http://aterribleidea.com/ccworks/).
License: [CC BY 3.0 Unported](https://creativecommons.org/licenses/by/3.0/), supplied in
`assets/images/TCP/license.txt` and `readme.txt`. The JPEG is converted to WebP.
Attribution is also displayed in the photograph dialog. No endorsement is claimed.

**Heritage:** [Heritage Library](https://www.heritagetype.com/pages/free-vintage-illustrations),
HTC Heritage Type GmbH; historical artists are not independently identified.
Included collection PDFs record a public-domain/CC0 basis with restrictions on
redistribution/rebundling as resource downloads. These edits are incorporated in the
finished story, not offered as an author resource pack. Credit is voluntary.

**Sonniss:** 344 Audio, InMotionAudio and Sonic Bat, GDC 2026 bundles. Included licenses
and the [official EULA](https://sonniss.com/gdc-bundle-license/) allow finished interactive
projects, restricting raw-library redistribution and AI training/development use without
permission. No Sonniss recording is supplied to a model or used as a voice reference.
Music Box A 013 is a memory/music accent, not literal humming.

## Generated narration

Resemble AI [Chatterbox Nano](https://huggingface.co/ResembleAI/chatterbox-nano) and
[Chatterbox Multilingual V3](https://huggingface.co/ResembleAI/chatterbox), MIT model cards;
source copyright 2025 Resemble AI. The provider's embedded default conditioning is used,
with no external voice reference. Provider watermarking is retained.
See [model revisions](assets/catalog/narration-models.json) and
[output provenance](assets/catalog/narration-output.json).
The 72 included clips are previews pending human listening.
The code notice is included in `public/licenses/chatterbox-MIT.txt`.

## Presentation and handwriting

Fourteen official React Bits JSX/CSS components are vendored at revision
`4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4`, with hashes in
[provenance.json](src/features/presentation/react-bits/vendor/provenance.json).
The [license](src/features/presentation/react-bits/vendor/LICENSE.md) is MIT plus
Commons Clause, not plain MIT. Reassess toolkit/editor-platform redistribution against
those terms. Components are locally bundled as deferred chunks.
The notice is included in `public/licenses/react-bits.txt`.

RippleDistortion uses [OGL](https://github.com/oframe/ogl), pinned to 1.0.11,
**Unlicense**, as stated in the installed package and README.
Notice: `public/licenses/ogl-Unlicense.txt`.

Handwriting uses **Caveat**, copyright 2014 The Caveat Project Authors
([source](https://github.com/googlefonts/caveat)), SIL Open Font License 1.1.
The font is subset to Latin/punctuation and converted to WOFF2; the original stays
under `assets/fonts/`. License: `public/licenses/caveat-OFL.txt`.
A shared SVG mask reveals continuous handwritten lines after a native fade.
All eleven native effects and shared camera/magnifier logic are implemented locally.
