# Contributions

What the published story (_The School of Impossible Things_ / _L'École des choses
impossibles_, Orée 1.3.0) and the published library use, with each resource's licence and the
attribution it requires. Per-file origin, hashes and rights for every library entry are in
[the curated catalogue](../assets/catalog/curated.json); the published `project.json` carries
the library's catalogue (titles, categories, themes).

## Story and library

| Resource                                                                                              | Used by                                | Licence / rights                                                                                          | Attribution required   |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------- |
| Sketch pack (graphite sketch illustrations)                                                           | 18 images in the story; 181 in library | Supplied by the project's author, who authorises their publication (catalogue `rights.userAuthorization`) | No                     |
| Sonniss #GameAudioGDC 2026 bundles (sound effects)                                                    | 8 sounds in the story; 344 in library  | Sonniss GDC bundle licence: royalty-free, commercial use, no attribution                                  | No (credited below)    |
| Original score: _Tomorrow there will be a lesson_, _The missing note_ (`oree.wonder`, `oree.silence`) | Story and library                      | Made for Listoire by `tools/compose-magic-score.py`                                                       | No                     |
| Generated narration (1 English clip, `matin-ville.p1`)                                                | Story, read aloud                      | Resemble AI Chatterbox Nano, MIT                                                                          | Licence notice (below) |

**Sketch pack.** Images generated for this project from the author's own references
(`assets/images/sketch-pack/catalog/generation_manifest.json`) and supplied by the author. The
optimised copies the story uses are in `stories/house/media/`.

**Sonniss.** From the five Sonniss.com GDC 2026 Game Audio Bundles. The bundles' licence
(`License - GDC Game Audio.pdf` and `Readme.txt` in each bundle, and the
[official licence](https://sonniss.com/gdc-bundle-license/)) allows use in finished projects,
commercial or not, without attribution; it forbids redistributing the sounds as a sound
library and using them to train or develop AI. They are published here only inside the story
and its editor library, and are never given to a model. Sounds the story uses, by supplier:

- **344 Audio:** Antique Books Flicking Through Pages 11; Magic Christmas Bells 2; Ambience,
  Forest Crickets, Birds, Connecticut 02; Water, Liquid Impact, Bubble, Sci Fi, Hit 04; Wind,
  Rush, Whoosh, Long x5 01.
- **CB Sounddesign:** Magic Creation 23 (APPlicable Sounds).
- **Epic Stock Media:** Magic Light Spell Enchantment Potion Effect Tonal Bright 03 (Fantasy
  Game 2).
- **Jake Fielding:** Heavy Rain on Window, Constant (Interior Wind, Rain and Storms).

The library's other Sonniss sounds come from 344 Audio, Epic Stock Media, InMotionAudio,
Cinematic Sound Design, SoundBits, Sonic Bat, The Noisery, Jake Fielding, TheWorkRoom,
Alexander Kopeikin, Ivo Vicic, Federico Soler, Sonik Sound Library, CB Sounddesign, David
Dumais Audio, Just Sound Effects and Victor Ermakov.

**Generated narration.** Resemble AI [Chatterbox Nano](https://huggingface.co/ResembleAI/chatterbox-nano),
MIT, copyright 2025 Resemble AI, with the provider's built-in voice (no voice reference) and
its watermark kept. Notice: `public/licenses/chatterbox-MIT.txt`. Model revisions and output
provenance: [narration-models.json](../assets/catalog/narration-models.json),
[narration-output.json](../assets/catalog/narration-output.json). The clip is a preview until a
person listens to it.

## The reader and editor around the story

| Resource                                                                                          | Licence                                               | Notice                                                      |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Mechanical Keyboard Typing (Treble Version), stu556, [Freesound](https://freesound.org/s/450282/) | CC0                                                   | — (`public/audio/keyboard-typing.mp3`)                      |
| Caveat font, The Caveat Project Authors ([source](https://github.com/googlefonts/caveat))         | SIL OFL 1.1                                           | `public/licenses/caveat-OFL.txt`                            |
| 14 React Bits components, revision `4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4`                     | MIT + Commons Clause                                  | `public/licenses/react-bits.txt`                            |
| [OGL](https://github.com/oframe/ogl) 1.0.11                                                       | Unlicense                                             | `public/licenses/ogl-Unlicense.txt`                         |
| [Inky Web](https://github.com/dtsykunov/inky-web) (editor menu, Ink mode)                         | MIT                                                   | `public/licenses/inky-web-MIT.txt`                          |
| Ace 1.2.6 (script editor)                                                                         | BSD                                                   | `public/licenses/ace-BSD.txt`                               |
| d6 and d20 meshes and textures from a dice set supplied by the author (`assets/dnd-dice-set`)     | Author's authorisation; provider licence not verified | — (`src/features/presentation/dice-assets/provenance.json`) |
| Home and character toolbar icons (`public/home-icon.png`, `public/rpg-icon.png`)                  | Supplied by the author                                | —                                                           |

The keyboard sound was converted from the supplied WAV to a 2.2-second mono MP3 with FFmpeg. The
Caveat font is subset to Latin and punctuation and converted to WOFF2 (original in
`assets/fonts/`). React Bits is MIT plus Commons Clause, not plain MIT: reassess before
redistributing the editor as a toolkit or platform. Vendor hashes:
[React Bits provenance](../src/features/presentation/react-bits/vendor/provenance.json),
[editor provenance](../src/features/editor/vendor/provenance.json).
