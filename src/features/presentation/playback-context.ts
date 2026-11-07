import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import type { ReactBitsEffect } from "../../contracts/effects.ts";
export interface PresentationState {
  departed: boolean;
  exiting: boolean;
  completedBlocks: string[];
  textComplete: boolean;
  previousImage?: string;
  paused: boolean;
  blocking: boolean;
  voice: "off" | "playing" | "paused" | "ended" | "unavailable";
  progress: Record<string, number>;
  synchronized: boolean;
  revealAll: boolean;
  layers: { id: string; blockId?: string; effect: ReactBitsEffect }[];
  visibleMedia: string[];
  expiredMedia: string[];
}
export class PlaybackContext {
  readonly bundle: StoryBundle;
  preferences: ReadingPreferences;
  frame: Frame | null = null;
  scope = new AbortController();
  restored = false;
  skipped = false;
  generation = 0;
  readonly reachedSegments = new Set<string>();
  readonly revealedSegments = new Set<string>();
  readonly queuedSegments = new Set<string>();
  private readonly listeners = new Set<() => void>();
  state: PresentationState = {
    departed: false,
    exiting: false,
    completedBlocks: [],
    textComplete: false,
    paused: false,
    blocking: false,
    voice: "off",
    progress: {},
    synchronized: false,
    revealAll: false,
    layers: [],
    visibleMedia: [],
    expiredMedia: [],
  };
  constructor(bundle: StoryBundle, preferences: ReadingPreferences) {
    this.bundle = bundle;
    this.preferences = preferences;
  }
  begin(frame: Frame, restored: boolean, reducedMotion: boolean) {
    const previousImage = this.frame
      ? this.bundle.scenes?.[this.frame.passageId]?.image
      : undefined;
    this.scope = new AbortController();
    this.frame = frame;
    this.restored = restored;
    this.skipped = false;
    this.revealedSegments.clear();
    this.queuedSegments.clear();
    this.reachedSegments.clear();
    this.publish({
      departed: false,
      exiting: false,
      completedBlocks: [],
      textComplete: restored || this.preferences.reveal === "instant" || reducedMotion,
      blocking: false,
      voice: "off",
      progress: {},
      synchronized: false,
      previousImage:
        !restored &&
        this.bundle.scenes?.[frame.passageId]?.events?.some(
          (event) => event.action.kind === "effect" && event.action.effect.id === "crossfade",
        )
          ? previousImage
          : undefined,
      revealAll: restored || this.preferences.reveal === "instant" || reducedMotion,
      layers: [],
      visibleMedia: [],
      expiredMedia: [],
    });
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  publish = (change: Partial<PresentationState>) => {
    this.state = { ...this.state, ...change };
    this.listeners.forEach((listener) => listener());
  };
  dispose() {
    this.listeners.clear();
  }
}
