# Contributions

## Mechanical Keyboard Typing (Treble Version)

- Author: stu556
- Source: [Freesound](https://freesound.org/s/450282/)
- License: CC0

The welcome uses a 2.2-second mono MP3 excerpt converted from the supplied WAV with FFmpeg.

## The House That Remembered — published resources

Five Heritage engravings and four Sonniss audio excerpts are incorporated into the
story. No embedded HTML illustration is reused. Exact original filenames, local
license evidence, source/output SHA-256 hashes and excerpts are in
[the curated catalog](assets/catalog/curated.json). Raw libraries remain under assets.

| Resource                          | Creator/source                                           | Usage                                                                                       |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Antique telephone receiver        | 344 Audio                                                | House scene cue only; no reusable sound library                                             |
| Chimney wind                      | InMotionAudio                                            | House scene cue only; no reusable sound library                                             |
| Metal impact accent               | 344 Audio                                                | House scene cue only; no reusable sound library                                             |
| Keeper of Keys — Element 1        | HTC Heritage Type GmbH; historical artist not identified | Illustrates the brass key found inside the letter                                           |
| Loving Moms — Element 1           | HTC Heritage Type GmbH; historical artist not identified | Family photograph illustration and magnifier                                                |
| ABC Library 02 — Element 5        | HTC Heritage Type GmbH; historical artist not identified | Reader character portrait                                                                   |
| Spirit & Myth — Element 5         | HTC Heritage Type GmbH; historical artist not identified | Bird emblem associated with the letter seal                                                 |
| Music Box A 013                   | Sonic Bat                                                | Quiet music-box recollection during the telephone lullaby; not presented as literal humming |
| Childhood Memories 02 — Element 3 | HTC Heritage Type GmbH; historical artist not identified | Restrained hand outline at the window revelation                                            |

Heritage sources: [Heritage Library](https://www.heritagetype.com/pages/free-vintage-illustrations).
The included collection PDFs are the license evidence. Their public-domain/CC0 basis
is accompanied by restrictions on redistribution, rebundling and free resource downloads;
do not offer these edited files as an author asset pack. Historical artists are not
invented or independently identified. Credit is retained voluntarily.

Sonniss sources: 344 Audio, InMotionAudio and Sonic Bat in GDC 2026 bundles. Bundled
licenses and the [official EULA](https://sonniss.com/gdc-bundle-license/) permit finished
interactive-project use, with no raw sound-library redistribution or AI training/development
use without permission. No audio embeddings or training uploads are made. Music Box A 013
is a musical memory accent, not a literal recording of the story's humming.

## React Bits and OGL

Fourteen official React Bits JSX/CSS components are vendored at revision
`4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4`, with individual hashes in
[provenance.json](src/features/presentation/react-bits/vendor/provenance.json).
Their [included license](src/features/presentation/react-bits/vendor/LICENSE.md) is
MIT plus Commons Clause, not plain MIT. Finished-story integration is distinct from
reselling/redistributing the components as a toolkit; reassess future authoring-platform
distribution against those terms. Components are locally bundled as deferred chunks.

RippleDistortion uses [OGL](https://github.com/oframe/ogl), pinned to 1.0.11, MIT.
All eleven native effects and shared camera/magnifier code are implemented locally.
