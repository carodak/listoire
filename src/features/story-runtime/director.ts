import { ReaderFailure } from "../../contracts/story.ts";
import type {
  FailureCode,
  Frame,
  NarrativeEngine,
  SaveData,
  StoryBundle,
} from "../../contracts/story.ts";

interface Saves {
  read(bundle: StoryBundle): Promise<SaveData | null>;
  commit(bundle: StoryBundle, next: SaveData, expected: SaveData | null | undefined): Promise<void>;
}
interface ReaderSnapshot {
  frame: Frame | null;
  occurrenceId: string | null;
  busy: boolean;
  failure: FailureCode | null;
}

export class StoryDirector {
  private readonly bundle: StoryBundle;
  private readonly engine: NarrativeEngine;
  private readonly saves: Saves;
  private readonly listeners = new Set<() => void>();
  private saved: SaveData | null = null;
  private disposed = false;
  private readonly initialState: string;
  private snapshot: ReaderSnapshot = {
    frame: null,
    occurrenceId: null,
    busy: false,
    failure: null,
  };

  constructor(bundle: StoryBundle, engine: NarrativeEngine, saves: Saves) {
    this.bundle = bundle;
    this.engine = engine;
    this.saves = saves;
    this.initialState = engine.serialize();
  }

  getSnapshot = (): ReaderSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(change: Partial<ReaderSnapshot>): void {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...change };
    this.listeners.forEach((listener) => listener());
  }

  private async run(operation: () => Promise<void>): Promise<void> {
    if (this.disposed || this.snapshot.busy) return;
    this.publish({ busy: true, failure: null });
    try {
      await operation();
    } catch (error) {
      this.publish({ failure: error instanceof ReaderFailure ? error.code : "storage" });
    } finally {
      this.publish({ busy: false });
    }
  }

  async load(): Promise<void> {
    await this.run(async () => {
      const save = await this.saves.read(this.bundle);
      if (this.disposed) return;
      if (save) {
        this.engine.restore(save.inkStateJson, save.frame);
        this.saved = save;
        this.publish({ frame: save.frame, occurrenceId: `${save.runId}:${save.revision}` });
      } else {
        this.engine.restore(this.initialState);
        await this.commitFrame(null);
      }
    });
  }

  private async commitFrame(expected: SaveData | null | undefined): Promise<void> {
    const frame = this.engine.advance();
    const save: SaveData = {
      schemaVersion: 1,
      storyId: this.bundle.storyId,
      release: this.bundle.release,
      locale: this.bundle.locale,
      mode: "narrative",
      inkDigest: this.bundle.inkDigest,
      inkjsVersion: this.bundle.inkjsVersion,
      runId: expected?.runId ?? crypto.randomUUID(),
      revision: (expected?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      inkStateJson: this.engine.serialize(),
      frame,
    };
    await this.saves.commit(this.bundle, save, expected);
    if (this.disposed) return;
    this.saved = save;
    this.publish({ frame, occurrenceId: `${save.runId}:${save.revision}` });
  }

  async choose(choiceId: string, occurrenceId: string): Promise<void> {
    if (!this.saved || this.snapshot.occurrenceId !== occurrenceId) return;
    await this.run(async () => {
      const before = this.saved!;
      try {
        this.engine.choose(choiceId);
        await this.commitFrame(before);
      } catch (error) {
        this.engine.restore(before.inkStateJson, before.frame);
        throw error;
      }
    });
  }

  async restart(): Promise<void> {
    await this.run(async () => {
      const before = this.saved;
      try {
        this.engine.restore(this.initialState);
        await this.commitFrame(undefined);
      } catch (error) {
        this.engine.restore(before?.inkStateJson ?? this.initialState, before?.frame);
        throw error;
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }
}
