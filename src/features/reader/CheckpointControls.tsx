import { useTranslation } from "react-i18next";
import type { FailureCode } from "../../contracts/story.ts";
import type { ReaderController } from "../../contracts/story.ts";

interface CheckpointControlsProps {
  director: ReaderController;
  busy: boolean;
  hasFrame: boolean;
  failure: FailureCode | null;
  onFailure: (code: FailureCode | null) => void;
  backup: () => Promise<void>;
}

export function CheckpointControls({
  director,
  busy,
  hasFrame,
  failure,
  onFailure,
  backup,
}: CheckpointControlsProps) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {failure && (
        <div className="notice" role="alert" lang={i18n.resolvedLanguage}>
          <p>{t(`errors.${failure}`)}</p>
          <button
            disabled={busy}
            onClick={() => {
              onFailure(null);
              void director.load();
            }}
          >
            {t("retry")}
          </button>
        </div>
      )}
      <footer className="reader-footer" lang={i18n.resolvedLanguage}>
        <p role="status">{busy ? t("saving") : hasFrame && !failure ? t("saved") : ""}</p>
        <div className="footer-actions">
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm(t("restartConfirm"))) {
                onFailure(null);
                void director.restart();
              }
            }}
          >
            {t("restart")}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              void backup().catch(() => onFailure("storage"));
            }}
          >
            {t("backup")}
          </button>
        </div>
      </footer>
    </>
  );
}
