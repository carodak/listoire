# Cinematic presets

The editor reuses EffectsEngine's cancellable Web Animations transport. Camera presets
combine bounded scale, pan, perspective and rotation with a weighted easing curve;
slow/normal/fast durations are 24/14/8 seconds. Suspense includes small, phased instability.
No GSAP, image-generation service or reading-time AI dependency was added.

Select an existing image in Scene Media and choose a preset thumbnail to apply it.
Hovering a thumbnail previews its camera motion using the selected illustration.
For a new image, select library media, choose a preset and apply its properties.
Speed, intensity, applicable direction and atmosphere are the optional main controls.
Images can remain static; native fades/reveals remain available through Animation.

| Camera                   | Behavior                                                             |
| ------------------------ | -------------------------------------------------------------------- |
| Slow Reveal              | Pull back from a close framing                                       |
| Dramatic Push            | Move toward the subject                                              |
| Downward / Upward Reveal | Combine vertical movement with a pullback                            |
| Cinematic Drift          | Restrained horizontal or vertical travel                             |
| Perspective Reveal       | Pull back with a small perspective tilt and rotation                 |
| Suspense                 | Slow push with restrained camera instability                         |
| Parallax                 | Move the base illustration and up to four additional depth layers    |
| Auto Parallax            | Use available layers; otherwise use the documented 2D drift fallback |

Depth layers use licensed image references, ordered background to foreground with
increasing movement. Authors can reorder them. Transparent foreground cutouts are
needed for visibly separated subjects; opaque illustrations naturally cover layers
behind them. The current catalog does not provide reliable segmentation/depth metadata,
so no automatic subject extraction or background reconstruction is claimed. Layer motion
is bounded against an overscanned frame; all layers share pause/resume/cancellation.

Historical combines procedural grain, sparse scratches, subtle light fluctuation and
vignette. Mystery uses dark vignette and restrained light fluctuation. Fantasy combines
floating particles, mist-like light and soft vignette. Dreamlike adds softer light.
Dramatic adds contrast and controlled light/vignette. These monochrome combinations
work alongside camera presets without adding arbitrary colored assets.

Scene Transition exposes the existing departure fade. An optional story default and
reader preference enable a short perspective page turn with a curved edge, shadow and
opposite direction for Back. Default navigation stays a short fade. The turn is a
lightweight paper-transition approximation, not a deforming 3D mesh simulation.

Replay and Back recreate presentation from the saved resolved frame without advancing
Ink or re-rolling a character. Reduced motion disables camera animation, moving grain,
particles and page turns; fullscreen sequences remain skippable. Static illustrations
and readable text remain available. Atmosphere pauses with presentation and is removed
when its page unmounts. Motion quality and listening approval still require human review;
no physical mobile frame-rate measurement is claimed.
