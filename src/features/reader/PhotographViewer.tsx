import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import { MagnifiedImage } from "../presentation/MagnifiedImage.tsx";
import { HandwrittenText } from "../presentation/HandwrittenText.tsx";

function PhotographViewer({
  bundle,
  canDiscover,
  busy,
  onDiscover,
  onClose,
}: {
  bundle: StoryBundle;
  canDiscover: boolean;
  busy: boolean;
  onDiscover: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(false);
  const [reset, setReset] = useState(0);
  const [turned, setTurned] = useState(false);
  const [detail, setDetail] = useState(0);
  const zoomLabel = t(zoom ? "zoomOut" : "zoomIn");
  const examination = bundle.examination!;
  const asset = bundle.assets?.find((entry) => entry.id === examination.image);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="photo-dialog"
      aria-labelledby="photo-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      <div className="dialog-heading">
        <h2 id="photo-title">{examination.title}</h2>
        <button aria-label={t("close")} title={t("close")} onClick={() => dialog.current?.close()}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div className="photo-window">
        {turned ? (
          <HandwrittenText text={examination.reverse} />
        ) : (
          asset && (
            <MagnifiedImage
              key={reset}
              src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${asset.path}`}
              alt={asset.alt}
              zoom={zoom ? 1.5 : 1}
              instructions={t("magnifierHelp")}
            >
              {canDiscover && (
                <button
                  className="photo-hotspot"
                  style={{ left: `${examination.hotspot.x}%`, top: `${examination.hotspot.y}%` }}
                  disabled={busy}
                  aria-label={examination.hotspot.label}
                  onClick={onDiscover}
                >
                  ＋
                </button>
              )}
            </MagnifiedImage>
          )
        )}
      </div>
      <p className="photo-caption" aria-live="polite">
        {examination.descriptions[detail]}
      </p>
      <div className="photo-controls">
        <div className="photo-controls-group">
          <button
            disabled={turned}
            aria-label={zoomLabel}
            title={zoomLabel}
            onClick={() => setZoom(!zoom)}
          >
            <span aria-hidden="true">{zoom ? "−" : "+"}</span>
          </button>
          <button
            aria-label={t("resetView")}
            title={t("resetView")}
            onClick={() => {
              setTurned(false);
              setDetail(0);
              setZoom(false);
              setReset((value) => value + 1);
            }}
          >
            <span aria-hidden="true">↺</span>
          </button>
        </div>
        <div className="photo-controls-group">
          <button
            disabled={turned}
            aria-label={t("nextDetail")}
            title={t("nextDetail")}
            onClick={() => setDetail((detail + 1) % examination.descriptions.length)}
          >
            <span aria-hidden="true">⌕</span>
          </button>
          <button
            aria-label={t("turnPhoto")}
            title={t("turnPhoto")}
            onClick={() => {
              setTurned(!turned);
              setZoom(false);
              setReset((value) => value + 1);
            }}
          >
            <span aria-hidden="true">↻</span>
          </button>
        </div>
      </div>
      {asset?.credit && <small className="photo-credit">{asset.credit}</small>}
    </dialog>
  );
}

export function PhotographExamination({
  bundle,
  frame,
  enabled,
  disabled,
  onDiscover,
}: {
  bundle: StoryBundle;
  frame: Frame | null;
  enabled: boolean;
  disabled: boolean;
  onDiscover: (actionId: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!enabled || !bundle.examination) return null;
  const examination = bundle.examination;
  const canDiscover = Boolean(frame?.actions?.some((action) => action.id === examination.actionId));
  return (
    <>
      <button ref={trigger} className="examine-photo" onClick={() => setOpen(true)}>
        {t("examinePhoto")}
      </button>
      {open && (
        <PhotographViewer
          bundle={bundle}
          canDiscover={canDiscover}
          busy={disabled}
          onDiscover={() => onDiscover(examination.actionId)}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}
