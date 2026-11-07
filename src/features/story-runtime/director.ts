import { gameFacts, startPlayer, resolveGameAction, resolveGameTurn } from "./game-session.ts";
import type { PlayerMove } from "./game-session.ts";
import type { GameState } from "../../contracts/game.ts";
import { ReaderFailure } from "../../contracts/story.ts";
import type { CharacterProfile } from "../../contracts/character.ts";
import type { NarrativePresentationPort } from "../../contracts/presentation-port.ts";
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
  game: GameState | null;
  frame: Frame | null;
  occurrenceId: string | null;
  busy: boolean;
  failure: FailureCode | null;
  restored: boolean;
  character: CharacterProfile | null;
  canGoBack: boolean;
}

export class StoryDirector {
  private readonly bundle: StoryBundle;
  private readonly engine: NarrativeEngine;
  private readonly saves: Saves;
  private readonly listeners = new Set<() => void>();
  private saved: SaveData | null = null;
  private readonly previousPages: SaveData[] = [];
  private disposed = false;
  private readonly initialState: string;
  private readonly createCharacter?: () => CharacterProfile;
  private readonly presentation?: NarrativePresentationPort;
  private snapshot: ReaderSnapshot = {
    game: null,
    frame: null,
    occurrenceId: null,
    busy: false,
    failure: null,
    restored: false,
    character: null,
    canGoBack: false,
  };

  constructor(
    bundle: StoryBundle,
    engine: NarrativeEngine,
    saves: Saves,
    createCharacter?: () => CharacterProfile,
    presentation?: NarrativePresentationPort,
  ) {
    this.bundle = bundle;
    this.engine = engine;
    this.saves = saves;
    this.initialState = engine.serialize();
    this.createCharacter = createCharacter;
    this.presentation = presentation;
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

  private async run(
    operation: () => Promise<void>,
    direction: "forward" | "back" = "forward",
    transition = true,
  ): Promise<void> {
    if (this.disposed || this.snapshot.busy) return;
    this.publish({ busy: true, failure: null });
    try {
      if (transition) {
        await this.presentation?.leave?.(direction);
        this.presentation?.cancel();
      }
    } catch {
      /* Reading remains available without media. */
    }
    if (this.disposed) return;
    const inkBefore = this.engine.serialize();
    const frameBefore = this.snapshot.frame ?? undefined;
    try {
      await operation();
    } catch (error) {
      this.engine.restore(inkBefore, frameBefore);
      if (this.snapshot.frame) this.present(this.snapshot.frame, this.snapshot.occurrenceId!, true);
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
        this.activate(save, true);
      } else {
        this.engine.restore(this.initialState);
        await this.commitFrame(null);
      }
    });
  }

  private async commitFrame(
    expected: SaveData | null | undefined,
    update?: { character: CharacterProfile; game: GameState },
    retainedFrame?: Frame,
  ): Promise<void> {
    const { character, game } = update ?? startPlayer(this.bundle, expected, this.createCharacter);
    if (!expected && character && game && this.bundle.game)
      this.engine.setGameFacts?.(gameFacts({ character, game }));
    const frame = retainedFrame ?? this.engine.advance();
    const save: SaveData = {
      schemaVersion: 1,
      storyId: this.bundle.storyId,
      release: this.bundle.release,
      locale: this.bundle.locale,
      mode: this.bundle.mode,
      inkDigest: this.bundle.inkDigest,
      inkjsVersion: this.bundle.inkjsVersion,
      runId: expected?.runId ?? crypto.randomUUID(),
      revision: (expected?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      inkStateJson: this.engine.serialize(),
      frame,
      ...(character ? { character, game } : {}),
    };
    await this.saves.commit(this.bundle, save, expected);
    if (this.disposed) return;
    this.activate(save, false, Boolean(retainedFrame));
  }

  async choose(choiceId: string, occurrenceId: string): Promise<void> {
    if (!this.saved || this.saved.game?.combat || this.snapshot.occurrenceId !== occurrenceId)
      return;
    await this.run(async () => {
      const before = this.saved!;
      const actionId = [...before.frame.choices, ...(before.frame.actions ?? [])].find(
        (choice) => choice.id === choiceId,
      )?.gameAction;
      const update = actionId
        ? resolveGameAction(this.bundle, before, actionId, choiceId)
        : undefined;
      if (update?.game.combat) {
        await this.commitFrame(before, update, before.frame);
        return;
      }
      if (update) this.engine.setGameFacts?.(gameFacts(update));
      this.engine.choose(choiceId);
      await this.commitFrame(before, update);
      this.previousPages.push(before);
      if (this.previousPages.length > 100) this.previousPages.shift();
      this.publish({ canGoBack: true });
    });
  }

  async gameTurn(move: PlayerMove, occurrenceId: string): Promise<void> {
    if (!this.saved?.game || !this.saved.character || this.snapshot.occurrenceId !== occurrenceId)
      return;
    await this.run(
      async () => {
        const before = this.saved!;
        const { choice, ...update } = resolveGameTurn(this.bundle, before, move);
        if (choice) {
          this.engine.setGameFacts?.(gameFacts(update));
          this.engine.choose(choice);
        }
        await this.commitFrame(before, update, choice ? undefined : before.frame);
      },
      "forward",
      false,
    );
  }
  async restart(): Promise<void> {
    await this.run(async () => {
      this.engine.restore(this.initialState);
      this.presentation?.reset?.();
      await this.commitFrame(undefined);
      this.previousPages.length = 0;
      this.publish({ canGoBack: false });
    });
  }

  dispose(): void {
    try {
      this.presentation?.dispose();
    } catch {
      /* Always release narrative subscriptions. */
    }
    this.disposed = true;
    this.listeners.clear();
  }
  async replay(): Promise<void> {
    if (!this.saved) return;
    await this.run(async () => {
      const save = this.saved!;
      const occurrenceId = `${save.runId}:${save.revision}:replay:${crypto.randomUUID()}`;
      this.present(save.frame, occurrenceId, false);
      this.publish({ frame: save.frame, occurrenceId, restored: false });
    });
  }
  async back(): Promise<void> {
    if (!this.saved || !this.previousPages.length) return;
    await this.run(async () => {
      const before = this.saved!;
      const previous = this.previousPages.at(-1)!;
      const save = {
        ...previous,
        runId: before.runId,
        revision: before.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      this.engine.restore(previous.inkStateJson, previous.frame);
      await this.saves.commit(this.bundle, save, before);
      this.previousPages.pop();
      this.activate(save, false);
      this.publish({ canGoBack: this.previousPages.length > 0 });
    }, "back");
  }
  private activate(save: SaveData, restored: boolean, retained = false) {
    this.saved = save;
    const occurrenceId = retained ? this.snapshot.occurrenceId : `${save.runId}:${save.revision}`;
    if (!retained) this.present(save.frame, occurrenceId!, restored);
    this.publish({
      frame: save.frame,
      occurrenceId,
      restored,
      character: save.character ?? null,
      game: save.game ?? null,
    });
  }
  private present(frame: Frame, occurrenceId: string, restored: boolean) {
    try {
      this.presentation?.start(frame, occurrenceId, restored);
    } catch {
      /* Media cannot invalidate a committed checkpoint. */
    }
  }
}
