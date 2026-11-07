# Disposable Synty courtyard

At `/editor?experiment=synty-parallax`, the actual first novel passage appears beside
a Three.js courtyard built from the user's POLYGON Knights models. Toon and Painterly
share the camera, lighting and geometry. Play / Replay moves the camera over six
seconds, with actual foreground/midground/background depth.

`node src/experiments/synty-parallax/convert.mjs` converts only the selected local FBX
models and palette textures. `assets/conversion.json` records source paths and bounds.
The source pack is unchanged. The knight's face overlays are removed, mouth palette
marks are mapped to skin, and a neutral pose is baked; original body proportions,
nose, hair and clothing remain. No animation clips are invented.

`node src/experiments/synty-parallax/verify.mjs` checks styles, playback and replay
against the running server on port 4173. It writes screenshots to `.fallow/`.
The entry point is the single query branch in `src/app/EditorRoute.tsx`.
The later book-scene3d experiment also reuses this converted subset and material
helper; keep these shared files if removing just the standalone courtyard screen.

This is a visual feasibility test, not a production scene pipeline. Software WebGL
was checked; physical GPU performance and human art approval remain unverified.
