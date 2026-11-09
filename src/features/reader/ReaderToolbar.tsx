import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Frame, StoryBundle, Locale } from "../../contracts/story.ts";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import type { ReaderNotesPort } from "../../contracts/reader-notes.ts";
import type { ReaderController, ReaderSnapshot } from "../../contracts/story.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { ReadingControls } from "./ReadingControls.tsx";
import { GameInventory } from "./GamePanel.tsx";
import { CharacterPanel } from "../character/CharacterPanel.tsx";
import { LanguageSetting } from "../../shared/LanguageSetting.tsx";
import { ToolbarGlyph } from "../../shared/ToolbarGlyph.tsx";
import { useAssetSource } from "../presentation/use-asset-source.ts";

export interface StoryPlayerProps {
  bundle: StoryBundle;
  director: ReaderController;
  presentation: PresentationSession;
  backup: () => Promise<void>;
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  preview?: boolean;
  notes?: ReaderNotesPort;
  onHome?: () => void;
  onLanguageChange?: (language: Locale) => void;
  languageBusy?: boolean;
}

interface ReaderToolbarProps {
  player: StoryPlayerProps;
  state: ReaderSnapshot & { frame: Frame };
  characterOpen: boolean;
  onCharacterToggle: () => void;
}

export function ReaderToolbar({
  player,
  state,
  characterOpen,
  onCharacterToggle,
}: ReaderToolbarProps) {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const { bundle, director, presentation, preferences, onPreferencesChange } = player;
  const portrait = bundle.assets?.find((asset) => asset.id === bundle.character?.portrait);
  const portraitSource = useAssetSource(portrait, presentation.resolveAsset);
  return (
    <div className="reader-toolbar">
      <ToolbarStart player={player} />
      <div className="reader-toolbar-end">
        <ReadingControls
          {...{ preferences, presentation, bundle }}
          onChange={onPreferencesChange}
          navigation={<PageNavigation director={director} state={state} preview={player.preview} />}
          open={preferencesOpen}
          onOpenChange={(open) => {
            setPreferencesOpen(open);
            if (open && characterOpen) onCharacterToggle();
          }}
        />
        <CharacterPanel
          {...{ bundle, notes: player.notes, attributeDetails: state.attributeDetails }}
          portraitSource={portraitSource || undefined}
          frame={state.frame}
          profile={state.character}
          game={state.game}
          inventoryControls={<GameInventory bundle={bundle} director={director} state={state} />}
          open={characterOpen && !state.game?.combat}
          onToggle={() => {
            setPreferencesOpen(false);
            onCharacterToggle();
          }}
        />
      </div>
    </div>
  );
}

/** Home, story title and language. */
function ToolbarStart({ player }: Pick<ReaderToolbarProps, "player">) {
  const { t } = useTranslation();
  return (
    <div className="reader-toolbar-start">
      {player.onHome && (
        <button
          className="reader-home-button"
          type="button"
          onClick={player.onHome}
          aria-label={t("home")}
          title={t("home")}
        >
          <ToolbarGlyph name="home" width={24} height={24} strokeWidth={1.75} />
        </button>
      )}
      <span className="reader-story-title">{player.bundle.title}</span>
      {player.onLanguageChange && (
        <LanguageSetting
          language={player.bundle.locale}
          busy={Boolean(player.languageBusy)}
          onChange={player.onLanguageChange}
        />
      )}
    </div>
  );
}

interface PageNavigationProps {
  director: ReaderController;
  state: ReaderSnapshot;
  preview?: boolean;
}

function PageNavigation({ director, state, preview }: PageNavigationProps) {
  const { t } = useTranslation();
  return (
    <div className="page-navigation">
      {!preview && (
        <button
          disabled={state.busy || !state.canGoBack}
          className="reader-icon-button"
          aria-label={t("previousPage")}
          title={t("previousPage")}
          onClick={() => {
            void director.back();
          }}
        >
          <ToolbarGlyph name="back" />
        </button>
      )}
      <button
        disabled={state.busy}
        className="reader-icon-button"
        aria-label={t("replayPage")}
        title={t("replayPage")}
        onClick={() => {
          void director.replay();
        }}
      >
        <ToolbarGlyph name="replay" />
      </button>
    </div>
  );
}
