import type { NarrativePresentationPort } from "../../contracts/presentation-port.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { AudioManager } from "../media/audio-manager.ts";
import { PlaybackContext } from "./playback-context.ts";
import { ScenePlayback } from "./scene-playback.ts";
import { NarrationPlayback } from "./narration-playback.ts";
export class PresentationSession implements NarrativePresentationPort {
  private readonly context: PlaybackContext;
  private readonly scene: ScenePlayback;
  private readonly text: NarrationPlayback;
  readonly audio: AudioManager;
  readonly voices: { id: string; label: string }[];
  readonly resolveAsset: (asset: MediaAsset) => Promise<{ url: string; dispose: () => void }>;
  readonly getSnapshot: PlaybackContext["getSnapshot"];
  readonly subscribe: PlaybackContext["subscribe"];
  readonly pause: ScenePlayback["pause"];
  readonly bind: ScenePlayback["bind"];
  readonly bindPage: ScenePlayback["bindPage"];
  readonly leave: ScenePlayback["leave"];
  readonly segmentRevealed: NarrationPlayback["segmentRevealed"];
  readonly segmentReached: NarrationPlayback["segmentReached"];
  readonly replayNarration: NarrationPlayback["replayNarration"];
  readonly skipCinematic: ScenePlayback["skipCinematic"];
  readonly revealRemaining: ScenePlayback["revealRemaining"];
  constructor(
    bundle: StoryBundle,
    preferences: ReadingPreferences,
    audio = new AudioManager(),
    resolveAsset?: (asset: MediaAsset) => Promise<{ url: string; dispose: () => void }>,
    editorPreview = false,
  ) {
    this.context = new PlaybackContext(bundle, preferences);
    this.audio = audio;
    this.scene = new ScenePlayback(this.context, audio);
    this.text = new NarrationPlayback(this.context, this.scene, audio, editorPreview);
    this.voices = this.text.voices;
    this.resolveAsset =
      resolveAsset ??
      (async (asset) => ({
        url: `${import.meta.env.BASE_URL}stories/${bundle.storyId}/${asset.path}`,
        dispose() {},
      }));
    this.getSnapshot = this.context.getSnapshot;
    this.subscribe = this.context.subscribe;
    this.bind = this.scene.bind.bind(this.scene);
    this.pause = this.scene.pause.bind(this.scene);
    this.bindPage = this.scene.bindPage.bind(this.scene);
    this.leave = this.scene.leave.bind(this.scene);
    this.segmentRevealed = this.text.segmentRevealed;
    this.segmentReached = this.text.segmentReached.bind(this.text);
    this.replayNarration = this.text.replayNarration;
    this.skipCinematic = this.scene.skipCinematic;
    this.revealRemaining = this.scene.revealRemaining;
    this.configure(preferences);
  }
  start(frame: Frame, _occurrenceId: string, restored: boolean) {
    this.cancel();
    this.scene.beginFrame();
    this.context.begin(frame, restored, this.scene.reducedMotion());
    if (!restored) {
      this.scene.queue("passage");
      if (this.context.preferences.narration) this.replayNarration();
    }
    for (const block of this.context.bundle.scenes?.[frame.passageId]?.blocks ?? [])
      if (block.kind === "media" && block.show?.kind !== "segment")
        this.scene.showMedia(block.id, block.show?.delayMs ?? 0);
  }
  configure(preferences: ReadingPreferences) {
    if (this.context.bundle.narrationMode === "disabled")
      preferences = { ...preferences, narration: false };
    const voiceWasEnabled = this.context.preferences.narration;
    const soundWasEnabled = this.context.preferences.sound;
    this.context.preferences = preferences;
    this.scene.configure(preferences, soundWasEnabled);
    this.text.configure(voiceWasEnabled);
  }
  resume = () => {
    this.scene.resume();
    this.text.resume();
  };
  cancel() {
    this.scene.cancel();
    this.text.stop();
  }
  reset() {
    this.cancel();
    this.scene.resetAudio();
    this.context.publish({ paused: false });
  }
  dispose() {
    this.cancel();
    this.scene.dispose();
    this.context.dispose();
  }
}
