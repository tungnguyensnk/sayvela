import { CommonModal } from "../CommonModal";
import { ActionButton } from "../astryx/AstryxControls";

// confirms installation and reports progress or failures from the native installer
export function VbCableInstallModal({ open, installing, error, onCancel, onInstall }) {
  return (
    <CommonModal
      open={open}
      title="VB-CABLE required"
      onClose={installing ? undefined : onCancel}
      footer={<>
        <ActionButton type="button" disabled={installing} onClick={onCancel}>Cancel</ActionButton>
        <ActionButton type="button" variant="primary" disabled={installing} onClick={onInstall}>
          {installing ? "Installing…" : "Download and install"}
        </ActionButton>
      </>}
    >
      <div>Sayvela needs VB-CABLE to route TTS audio. The official Pack45 ZIP will be downloaded, verified, then its setup will request administrator permission. Restart Windows after installation, then enable TTS again.</div>
      {error ? <div className="empty acp-error">{error}</div> : null}
    </CommonModal>
  );
}
