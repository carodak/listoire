# Book illustration experiment

Open `/editor`, select **Media → 3D Scene**. The initial composition uses selected
models from the local Synty POLYGON Knights pack. The original six-second courtyard
test remains at `/editor?experiment=synty-parallax`.

Quick start: choose **Medieval village**, **Forest path**, **Character only** or
**Object only**, choose a visual style, then **Apply to Story**. Village and forest
presets include a composed camera, depth layers and editable models. Place scenes
automatically get earth, a winding path, grass clumps, distant hills, a clouded sky
and atmospheric depth. Single visible subjects keep transparent surroundings.
Places do not require a character or main subject. Village/forest start without one;
add a character/object from the gallery when wanted. Automatic framing uses visible
scenery when there is no subject and excludes foreground framing objects from that
focus calculation. Curated gallery scales keep trees as framing foliage and rocks low.
The village starts in Hand painted with warm afternoon light; it uses the existing
optimized Synty castle walls, gate, houses, trees and rocks.

1. Browse the thumbnail gallery or import a self-contained GLB and record your
   permission to use it. Search and categories filter compatible depth layers.
   Category determines safe scale. Add a subject and optional background,
   midground and foreground elements; no environment is required for an isolated
   object illustration.
2. In the normal editor interface, choose the illustration name, visual style,
   shot and ambience above the preview. The main styles are Toon, Hand painted,
   Sketch / Pencil and Sketch / Color ink; six additional treatments remain available.
   These change Three.js materials, shader lighting
   and geometry outlines. Animation choices are the actual
   clip names in the model. The converted Synty knight is a static, faceless pose.
3. Orbit/rotate with the mouse, pan with the Pan tool or right mouse, and zoom with
   the wheel. Reframe restores the shot preset. Select an object in the layer list
   or canvas; Move/Rotate/Scale provide gizmos. **Adjust selected object** contains
   bounded numerical transforms and compatible model animations.
   Camera position, target, lens, visibility and object transforms are saved.
   The book beside the canvas uses a clean raster preview without editor gizmos.
   Use the existing **Type**, position, timing and cinematic controls below the
   composer. Right Page uses portrait framing. The existing cinematic keyframes
   drive a real perspective camera, independently of model animation.
4. **Apply to Story**. A still composition becomes a WebP; camera movement, model animation or
   dust becomes a recorded MP4/WebM. Animation export runs in real time, using the
   browser's supported encoder. The book renders these through its existing image
   and video components and does not initialize WebGL.
5. Save a complete project backup. It includes editable composition metadata, GLBs
   and cached output. Choosing a saved 3D Scene in the media library restores its
   composition. Editing a media reference replaces that placement without changing
   other uses of the reusable asset.

Limits: GLB 2.0 only, embedded resources, no Draco/Meshopt/BasisU decoders, 20 MB per
model, 250,000 rendered vertices per model, 500 nodes, 64 hierarchy levels, 32 clips,
4096-pixel texture dimensions. Adding a scene also keeps total uploaded project media
within 130 MB so that a complete backup fits the existing 200 MB import limit.
A scene has at most twelve elements, with separate
layer limits and initial placement anchors. Architecture intersections produce
warnings while editing and must be corrected before applying the illustration.
These are a guided composition aid, not a general collision or animation editor.
Use in-place animation clips; root/hips/pelvis translation is removed during baking.
The current painterly treatment is procedural brush shading, not an offline
painted illustration. The ten presets are local treatments, not the commercial
shader package shown in the visual references. The WebGL authoring flow has Chromium software
rendering coverage; physical GPU/mobile authoring performance is not measured.
The same feathered mask is used for live drafts and cached reader media, including
soft side edges and rounded atmospheric falloff. Wide illustrations extend into
the reader gutter and overlap softly behind the heading. Wide cached scenes use
1280 × 900 pixels; Right Page uses 720 × 1080. Hiding all environment layers gives the subject a transparent
background, retained in static WebP output. Browser video-codec alpha is not guaranteed.
**Book illustration** blending adds page-colored atmospheric gradients, a vignette,
text-safe heading/lower edges and optional leaf/grass silhouettes. Live and saved
output share the same presentation component. These page ornaments are decorative,
separate from editable 3D foreground objects and cinematic effects.

The catalog knight is now bareheaded. Only the optimized soldier GLB is regenerated
with `node src/experiments/synty-parallax/convert.mjs --character-only`; source FBX files
remain untouched. The removed helmet component is calibrated to 103 triangles; a
small scalp closes the source model's hidden opening behind the original face.
Already cached images/videos retain their pixels: replace the old character with
the current catalog knight and Apply to Story to regenerate an older illustration.

Animated 3D illustrations play silently when reached, with no native video controls.
Camera shots play once; steady-camera model/particle clips loop. The reader's global
pause/resume still controls them. Restored pages can replay decorative clips without
replaying narrative events; reduced-motion users keep a still image. Ordinary
uploaded videos retain their existing controls and audio behavior.
Removing a model keeps other model positions fixed, and adding a replacement reuses
the free placement anchor. Presets remain editable rather than flattening the scene.

`models.ts` handles importing and local storage; `composition.ts` handles placement
and camera framing; `render.ts` handles Three.js; `export.ts` handles cached output.
The editor adapter is `MediaDialog` / `prepare-scene-media`. No story progression,
save logic, default story content or game mechanics are owned by this experiment.
Removing the composer and its Media button leaves cached story media readable.
The optional `model3d` / `scene3d` contracts must remain while saved projects use them.

Synty source files remain unchanged. The small converted subset and palette textures
come from `../synty-parallax/assets/conversion.json`; the standalone conversion
script records exact source paths. Ownership of the pack is user-attested, not
independently verified. Imported model rights remain distinct from catalog-provider
verification. There is no general source-library browsing or redistribution endpoint.
