import { useAssetSource } from "../presentation/use-asset-source.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useState } from "react";
import { Dialog } from "../../shared/Dialog.tsx";
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
  const [zoom, setZoom] = useState(false);
  const [reset, setReset] = useState(0);
  const [turned, setTurned] = useState(false);
  const [detail, setDetail] = useState(0);
  const asset = bundle.assets?.find((entry) => entry.id === examination.image);
  const source = useAssetSource(asset, presentation.resolveAsset);
  return (
    <Dialog className="photo-dialog" aria-labelledby="photo-title" onDismiss={onClose}>
      <div className="dialog-heading">
        <h2 id="photo-title">{examination.title}</h2>
        <button aria-label={t("close")} title={t("close")} onClick={onClose}>
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
      <PhotoControls
        zoom={zoom}
        turned={turned}
        canTurn={Boolean(examination.reverse)}
        onZoom={() => setZoom(!zoom)}
        onDetail={() => setDetail((detail + 1) % examination.descriptions.length)}
        onTurn={() => {
          setTurned(!turned);
          setZoom(false);
          setReset((value) => value + 1);
        }}
      />
      {asset?.credit && <small className="photo-credit">{asset.credit}</small>}
    </Dialog>
  );
}

interface PhotographHotspotProps {
  hotspot: ImageExamination["hotspot"];
  enabled: boolean;
  busy: boolean;
  onDiscover: () => void;
}

function ExamineIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 6 6M5.5 10s1.7-3 4.5-3 4.5 3 4.5 3-1.7 3-4.5 3-4.5-3-4.5-3Z" />
      <circle cx="10" cy="10" r="1" />
    </svg>
  );
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
  if (!enabled || !examination) return null;
  const canDiscover = Boolean(
    examination.hotspot && frame?.actions?.some((action) => action.id === examination.actionId),
  );
  return (
    <>
      <button
        className="examine-photo"
        onClick={(event) => {
          event.currentTarget.focus();
          setOpen(true);
        }}
      >
        <ExamineIcon />
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

function PhotoControls({
  zoom,
  turned,
  canTurn,
  onZoom,
  onTurn,
  onDetail,
}: {
  zoom: boolean;
  turned: boolean;
  canTurn: boolean;
  onZoom: () => void;
  onTurn: () => void;
  onDetail: () => void;
}) {
  const { t } = useTranslation();
  const zoomLabel = t(zoom ? "zoomOut" : "zoomIn");
  return (
    <div className="photo-controls">
      <div className="photo-controls-group">
        <button disabled={turned} aria-label={zoomLabel} title={zoomLabel} onClick={onZoom}>
          <span aria-hidden="true">{zoom ? "−" : "+"}</span>
        </button>
      </div>
      <div className="photo-controls-group">
        <button
          disabled={turned}
          aria-label={t("nextDetail")}
          title={t("nextDetail")}
          onClick={onDetail}
        >
          <ExamineIcon />
        </button>
        {canTurn && (
          <button aria-label={t("turnPhoto")} title={t("turnPhoto")} onClick={onTurn}>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
