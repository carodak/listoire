import {
  gameFacts,
  startPlayer,
  resolveGameAction,
  resolveGameTurn,
  beforeCheck,
  checkOrigin,
  copyPlayer,
  playerDetails,
} from "./game-session.ts";
import type { GameState, PlayerMove } from "../../contracts/game.ts";
import { ReaderFailure } from "../../contracts/story.ts";
import type { CharacterProfile } from "../../contracts/character.ts";
import type { NarrativePresentationPort } from "../../contracts/presentation-port.ts";
import type {
  Frame,
  NarrativeEngine,
  SaveData,
  StoryBundle,
  ReaderController,
  ReaderSnapshot,
} from "../../contracts/story.ts";

interface Saves {
  read(bundle: StoryBundle): Promise<SaveData | null>;
  commit(bundle: StoryBundle, next: SaveData, expected: SaveData | null | undefined): Promise<void>;
}
export class StoryDirector implements ReaderController {
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
    attributeDetails: null,
    canGoBack: false,
    combatOptions: [],
    checkOptions: {},
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
      this.engine.setGameFacts(gameFacts({ character, game }));
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
      character,
      game,
    };
    await this.saves.commit(this.bundle, save, expected);
    if (this.disposed) return;
    this.activate(save, false, Boolean(retainedFrame));
  }

  async choose(choiceId: string, occurrenceId: string): Promise<void> {
    const saved = this.currentSave(occurrenceId);
    if (!saved || saved.game?.combat || saved.game?.pendingCheck || saved.game?.pendingEvent)
      return;
    const actionId = [...saved.frame.choices, ...(saved.frame.actions ?? [])].find(
      (choice) => choice.id === choiceId,
    )?.gameAction;
    await this.run(
      async () => {
        const before = this.saved!;
        const update = actionId
          ? resolveGameAction(this.bundle, before, actionId, choiceId, true)
          : undefined;
        if (update) {
          if (!update.game.combat && !update.game.pendingCheck)
            update.game.pendingEvent = { choiceId };
          await this.commitFrame(before, update, before.frame);
          return;
        }
        this.engine.choose(choiceId);
        await this.commitFrame(before);
        this.rememberPage(before);
      },
      "forward",
      !actionId,
    );
  }

  async gameTurn(move: PlayerMove, occurrenceId: string): Promise<void> {
    const saved = this.currentSave(occurrenceId);
    if (!saved?.game || saved.game.pendingCheck || saved.game.pendingEvent) return;
    await this.run(
      async () => {
        const before = this.saved!;
        const { choice, ...update } = resolveGameTurn(this.bundle, before, move);
        if (choice) {
          update.game.pendingEvent = { choiceId: choice };
        }
        await this.commitFrame(before, update, before.frame);
      },
      "forward",
      false,
    );
  }
  async rollCheck(occurrenceId: string): Promise<void> {
    const pending = this.currentSave(occurrenceId)?.game?.pendingCheck;
    if (!pending || pending.rolled) return;
    await this.run(
      async () => {
        const before = this.saved!;
        const update = resolveGameAction(this.bundle, before, pending.actionId, pending.choiceId);
        update.game.pendingCheck = {
          ...pending,
          origin: pending.origin ?? checkOrigin(before),
          rolled: true,
        };
        await this.commitFrame(before, update, before.frame);
      },
      "forward",
      false,
    );
  }
  async finishEvent(occurrenceId: string): Promise<void> {
    await this.finishPending("pendingEvent", occurrenceId);
  }
  async finishCheck(occurrenceId: string): Promise<void> {
    await this.finishPending("pendingCheck", occurrenceId);
  }
  private async finishPending(kind: "pendingEvent" | "pendingCheck", occurrenceId: string) {
    const pending = this.currentSave(occurrenceId)?.game?.[kind];
    if (!pending || ("rolled" in pending && !pending.rolled)) return;
    await this.run(async () => {
      const before = this.saved!;
      const update = copyPlayer(before);
      delete update.game[kind];
      this.engine.setGameFacts(gameFacts(update));
      this.engine.choose(pending.choiceId);
      delete update.game.lastResult;
      await this.commitFrame(before, update);
      this.rememberPage(
        kind === "pendingCheck"
          ? beforeCheck(before)
          : {
              ...before,
              game: { ...before.game!, pendingEvent: undefined, lastResult: undefined },
            },
      );
    });
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
    const pending = Boolean(this.saved?.game?.pendingCheck);
    if (!this.saved || (!pending && !this.previousPages.length)) return;
    await this.run(
      async () => {
        const before = this.saved!;
        const previous = pending ? beforeCheck(before) : this.previousPages.at(-1)!;
        const save = {
          ...previous,
          runId: before.runId,
          revision: before.revision + 1,
          updatedAt: new Date().toISOString(),
        };
        this.engine.restore(previous.inkStateJson, previous.frame);
        await this.saves.commit(this.bundle, save, before);
        if (!pending) this.previousPages.pop();
        this.activate(save, true);
        this.publish({ canGoBack: this.previousPages.length > 0 });
      },
      "back",
      !pending,
    );
  }
  private rememberPage(before: SaveData) {
    this.previousPages.push(before);
    if (this.previousPages.length > 100) this.previousPages.shift();
    this.publish({ canGoBack: true });
  }
  private currentSave(occurrenceId: string) {
    return this.snapshot.occurrenceId === occurrenceId ? this.saved : null;
  }
  private activate(save: SaveData, restored: boolean, retained = false) {
    this.saved = save;
    const occurrenceId = retained ? this.snapshot.occurrenceId : `${save.runId}:${save.revision}`;
    const character = save.character ?? null;
    const game = save.game ?? null;
    if (!retained) this.present(save.frame, occurrenceId!, restored);
    this.publish({
      frame: save.frame,
      occurrenceId,
      restored,
      character,
      game,
      ...playerDetails(this.bundle, character, game),
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
