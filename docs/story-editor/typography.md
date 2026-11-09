# Expressive typography

In `/editor`, select narrative words, open **Text**, preview a style by hover or
keyboard focus, adjust the controls and choose **Apply to selection**. The ordinary
Preview button renders the real reader. Formatting is a project history transaction:
undo, redo, autosave, backup and import retain it. Default removes the selected words'
formatting. Reformatting part of a styled phrase splits the original span and keeps
the neighboring words' style. Selection survives applying a style for further changes.

Presets are Default, Shout, Whisper, Mystery, Impact, Handwritten, Wave and Falling.
Controls independently override the preset's size, font, color, letter spacing,
shape and horizontal, vertical or diagonal orientation. Handwriting reuses the
existing bundled Listoire font. Colors blend with the inherited ink so they adapt
to the reader's paper. The preview and reader use the same `TypographicText` renderer.

## Source and runtime contract

The source remains Ink. Formatting inserts allowlisted literal text markup:

```ink
There was a <typo style="shout" direction="diagonal-up">BOOM</typo>.
* [<typo color="ocean">Follow the river</typo>] -> river
```

`contracts/typography.ts` owns the allowed values, presets, decoder and span schema.
The compiler validates markup before compiling Ink. `ink-frame.ts` decodes evaluated
prose and choices into plain `text` plus optional `typography` spans with UTF-16
`start`, `end` and `format`. Frame/checkpoint validation rejects overlapping, unordered
or out-of-bounds spans. Existing frames without typography remain valid. The Ink
checkpoint still identifies the exact compiled source; editing formatting changes
that source's digest like other Ink edits.

React renders text nodes and allowlisted CSS classes; the markup never becomes HTML.
Unknown attributes/styles, empty spans, unbalanced tags, nesting and spans crossing
paragraphs fail validation. Reader text reveal counts whole Unicode graphemes while
narration positions stay in UTF-16 characters. Shaped letters keep their final positions
during reveal. Screen readers and speech receive plain words in their original order.
Page departure traverses styled text nodes without mutating React's contents.

## Boundaries and limits

- Formatting is local to the selected language; translated words are styled separately.
- Select words within one source line. Ink instructions, tags and expressions are
  excluded from the toolbar selection. Manual markup may surround evaluated Ink text;
  the runtime still validates the resulting frame.
- The offered fonts, relative sizes, palette and orientations are bounded choices.
  No font upload, arbitrary CSS/HTML, free-positioned page editor or animated text
  choreography is included. Add those only when an actual story requires them.
- Semantic text, style spans, TTS generation, playback preferences and saves remain
  separate. No RNG or story progression moved into presentation callbacks.
- Native `shared/Dialog` now provides focus trapping, Escape/backdrop dismissal and
  focus restoration for editor, reader, photograph and cinematic windows. Locked
  game dialogs retain their lock; docked editor panels remain regular sections.
  Fallow permits editor/presentation to depend on shared UI; domain/media boundaries
  and every existing exclusion/threshold remain unchanged.

Verification results and the measured Fallow score are recorded in
[the implementation report](typography-verification.md).
