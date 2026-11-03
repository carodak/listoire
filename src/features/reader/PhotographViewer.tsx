import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import { MagnifiedImage } from "../presentation/MagnifiedImage.tsx";

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
        <button onClick={() => dialog.current?.close()}>{t("close")}</button>
      </div>
      <div className="photo-window">
        {turned ? (
          <p className="photo-reverse">{examination.reverse}</p>
        ) : (
          asset && (
            <MagnifiedImage
              key={reset}
              src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${asset.path}`}
              alt={asset.alt}
              active={zoom}
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
      <p aria-live="polite">{turned ? examination.reverse : examination.descriptions[detail]}</p>
      <div className="photo-controls">
        <button disabled={turned} onClick={() => setZoom(!zoom)}>
          {t(zoom ? "zoomOut" : "zoomIn")}
        </button>
        <button
          onClick={() => {
            setTurned(!turned);
            setZoom(false);
            setReset((value) => value + 1);
          }}
        >
          {t("turnPhoto")}
        </button>
        <button
          disabled={turned}
          onClick={() => setDetail((detail + 1) % examination.descriptions.length)}
        >
          {t("nextDetail")}
        </button>
        <button
          onClick={() => {
            setTurned(false);
            setDetail(0);
            setZoom(false);
            setReset((value) => value + 1);
          }}
        >
          {t("resetView")}
        </button>
      </div>
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
