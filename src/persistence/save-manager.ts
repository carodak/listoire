import { SaveSchema, ReaderFailure, SettingsSchema } from "../contracts/story.ts";
import type { ReaderSettings, SaveData, StoryBundle } from "../contracts/story.ts";
import { validateCheckpoint } from "../contracts/save-validation.ts";
import { z } from "zod";

const LegacySettings = z
  .object({
    schemaVersion: z.literal(1),
    interfaceLocale: SettingsSchema.shape.language,
    storyLocale: SettingsSchema.shape.language,
  })
  .strict();

export interface SaveStore {
  read(key: string): Promise<unknown>;
  update(key: string, updater: (previous: unknown) => unknown): Promise<void>;
}

export class SaveManager {
  private readonly store: SaveStore;

  constructor(store: SaveStore) {
    this.store = store;
  }

  private key(bundle: StoryBundle): string {
    return `save:${bundle.checkpointId ?? bundle.storyId}:${bundle.locale}`;
  }

  async read(bundle: StoryBundle): Promise<SaveData | null> {
    const raw = await this.store.read(this.key(bundle));
    if (raw === undefined) return null;
    return validateCheckpoint(bundle, raw);
  }

  async commit(
    bundle: StoryBundle,
    next: SaveData,
    expected: SaveData | null | undefined,
  ): Promise<void> {
    const valid = validateCheckpoint(bundle, next);
    await this.store.update(this.key(bundle), (previous) => {
      if (expected === null && previous !== undefined) throw new ReaderFailure("save-conflict");
      if (expected) {
        const current = SaveSchema.safeParse(previous);
        if (
          !current.success ||
          current.data.runId !== expected.runId ||
          current.data.revision !== expected.revision
        )
          throw new ReaderFailure("save-conflict");
      }
      return valid;
    });
  }

  async backup(bundle: StoryBundle): Promise<string> {
    return JSON.stringify(await this.store.read(this.key(bundle)), null, 2) ?? "null";
  }

  async settings(): Promise<ReaderSettings> {
    const raw = await this.store.read("reader-settings");
    const parsed = SettingsSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    const legacy = LegacySettings.safeParse(raw);
    return {
      schemaVersion: 2,
      language: legacy.success ? legacy.data.interfaceLocale : "en",
      welcomeSound: true,
    };
  }

  async saveSettings(settings: ReaderSettings): Promise<void> {
    await this.store.update("reader-settings", () => SettingsSchema.parse(settings));
  }
  async notes(bundle: StoryBundle): Promise<string> {
    const text = await this.store.read(`notes:${bundle.storyId}:${bundle.release}`);
    return typeof text === "string" ? text.slice(0, 20000) : "";
  }
  async saveNotes(bundle: StoryBundle, text: string): Promise<void> {
    const valid = z.string().max(20000).parse(text);
    await this.store.update(`notes:${bundle.storyId}:${bundle.release}`, () => valid);
  }
}
