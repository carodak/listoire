import type { NarrativeEvent } from "../../contracts/narrative-events.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { AudioManager } from "../media/audio-manager.ts";

export class SceneAudio {
  private scope = new AbortController();
  private readonly tracks = new Map<string, string>();
  private readonly bundle: StoryBundle;
  private readonly audio: AudioManager;
  constructor(bundle: StoryBundle, audio: AudioManager) {
    this.bundle = bundle;
    this.audio = audio;
  }
  play(event: NarrativeEvent, signal: AbortSignal, sound: boolean) {
    if (event.action.kind !== "audio" || !sound) return;
    const action = event.action;
    const asset = this.bundle.assets?.find(
      (asset) => asset.id === action.assetId && asset.type === "audio",
    );
    if (!asset) return;
    const url =
      this.bundle.embeddedAudio?.[asset.id] ??
      `${import.meta.env.BASE_URL}stories/${this.bundle.storyId}/${asset.path}`;
    const persistent = this.bundle.authored && action.channel !== "sfx";
    const signature = JSON.stringify(action);
    if (persistent && this.tracks.get(action.channel) === signature) return;
    if (persistent) this.tracks.set(action.channel, signature);
    const scope = persistent ? this.scope.signal : signal;
    const playback =
      action.channel !== "sfx" && action.fadeMs
        ? this.audio.crossfade(
            action.channel,
            url,
            scope,
            action.fadeMs,
            action.volume ?? 1,
            action.loop ?? false,
          )
        : this.audio.play({
            url,
            channel: action.channel,
            signal: scope,
            loop: action.loop,
            gain: action.volume ?? 1,
            fadeMs: action.fadeMs,
          });
    if (persistent)
      void playback.then(() => {
        if (this.tracks.get(action.channel) === signature) this.tracks.delete(action.channel);
      });
  }
  stop(channel: Parameters<AudioManager["stopChannel"]>[0]) {
    this.audio.stopChannel(channel);
    this.tracks.delete(channel);
  }
  cancelPage() {
    if (this.bundle.authored) this.audio.stopChannel("sfx");
    else this.audio.stopAll();
  }
  reset() {
    this.scope.abort();
    this.scope = new AbortController();
    this.tracks.clear();
    this.audio.stopAll();
  }
  dispose() {
    this.scope.abort();
    this.audio.dispose();
  }
}
