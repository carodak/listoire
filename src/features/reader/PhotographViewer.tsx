import { useAssetSource } from "../presentation/use-asset-source.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import { MagnifiedImage } from "../presentation/MagnifiedImage.tsx";
import { HandwrittenText } from "../presentation/HandwrittenText.tsx";
import type { ImageExamination } from "../../contracts/presentation.ts";

interface PhotographViewerProps {
  bundle: StoryBundle;
  presentation: PresentationSession;
  examination: ImageExamination;
  canDiscover: boolean;
  busy: boolean;
  onDiscover: () => void;
  onClose: () => void;
}

function PhotographViewer({
  bundle,
  presentation,
  examination,
  canDiscover,
  busy,
  onDiscover,
  onClose,
}: PhotographViewerProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(false);
  const [reset, setReset] = useState(0);
  const [turned, setTurned] = useState(false);
  const [detail, setDetail] = useState(0);
  const zoomLabel = t(zoom ? "zoomOut" : "zoomIn");
  const asset = bundle.assets?.find((entry) => entry.id === examination.image);
  const source = useAssetSource(asset, presentation.resolveAsset);
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
          <PhotographImage
            asset={asset}
            source={source}
            reset={reset}
            zoom={zoom}
            instructions={t("magnifierHelp")}
            hotspot={examination.hotspot}
            canDiscover={canDiscover}
            busy={busy}
            onDiscover={onDiscover}
          />
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
            hidden={!examination.reverse}
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

interface PhotographHotspotProps {
  hotspot: ImageExamination["hotspot"];
  enabled: boolean;
  busy: boolean;
  onDiscover: () => void;
}

function PhotographHotspot({ hotspot, enabled, busy, onDiscover }: PhotographHotspotProps) {
  if (!enabled || !hotspot) return null;
  return (
    <button
      className="photo-hotspot"
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
      disabled={busy}
      aria-label={hotspot.label}
      onClick={onDiscover}
    >
      ＋
    </button>
  );
}

interface PhotographExaminationProps {
  bundle: StoryBundle;
  presentation: PresentationSession;
  frame: Frame | null;
  enabled: boolean;
  disabled: boolean;
  onDiscover: (actionId: string) => void;
  examination?: ImageExamination;
}

export function PhotographExamination({
  bundle,
  presentation,
  frame,
  enabled,
  disabled,
  onDiscover,
  examination = bundle.examination,
}: PhotographExaminationProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!enabled || !examination) return null;
  const canDiscover = Boolean(
    examination.hotspot && frame?.actions?.some((action) => action.id === examination.actionId),
  );
  return (
    <>
      <button ref={trigger} className="examine-photo" onClick={() => setOpen(true)}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
          <path d="m12 2 10 10-10 10L2 12Z m0 5 5 5-5 5-5-5Z" fill="none" stroke="currentColor" />
        </svg>
        {examination.buttonLabel ||
          t(examination === bundle.examination ? "examinePhoto" : "examineImage")}
      </button>
      {open && (
        <PhotographViewer
          bundle={bundle}
          presentation={presentation}
          examination={examination}
          canDiscover={canDiscover}
          busy={disabled}
          onDiscover={() => {
            if (examination.actionId) onDiscover(examination.actionId);
          }}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}

interface PhotographImageProps {
  asset: NonNullable<StoryBundle["assets"]>[number] | undefined;
  source: string | null;
  reset: number;
  zoom: boolean;
  instructions: string;
  hotspot: ImageExamination["hotspot"];
  canDiscover: boolean;
  busy: boolean;
  onDiscover: () => void;
}

function PhotographImage({
  asset,
  source,
  reset,
  zoom,
  instructions,
  hotspot,
  canDiscover,
  busy,
  onDiscover,
}: PhotographImageProps) {
  if (!asset || !source) return null;
  return (
    <MagnifiedImage
      key={reset}
      src={source}
      alt={asset.alt}
      zoom={zoom ? 1.5 : 1}
      instructions={instructions}
    >
      <PhotographHotspot
        hotspot={hotspot}
        enabled={canDiscover}
        busy={busy}
        onDiscover={onDiscover}
      />
    </MagnifiedImage>
  );
}
