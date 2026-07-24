import { useEffect, useState } from "react";
import { deleteSonioxApiKey, setSonioxApiKey } from "../../services/sonioxTtsService";
import { CommonModal } from "../CommonModal";
import { ActionButton } from "../astryx/AstryxControls";

export function SonioxSettingsModal({ open, exists, onClose, onChanged }) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey("");
      setError("");
    }
  }, [open]);

  const save = async () => {
    if (!apiKey.trim()) return setError("API key is required.");
    setSaving(true);
    setError("");
    try {
      await setSonioxApiKey(apiKey.trim());
      await onChanged?.();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError("");
    try {
      await deleteSonioxApiKey();
      await onChanged?.();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CommonModal
      open={open}
      title="Soniox setting"
      onClose={saving ? undefined : onClose}
      className="acp-sonioxModal"
      footer={<>
        {exists ? <ActionButton type="button" disabled={saving} onClick={remove}>Delete</ActionButton> : null}
        <ActionButton type="button" disabled={saving} onClick={onClose}>Cancel</ActionButton>
        <ActionButton type="button" disabled={saving || !apiKey.trim()} onClick={save}>Save</ActionButton>
      </>}
    >
      <div className="acp-sonioxForm">
        <div className="acp-subLabel">API key</div>
        <input className="input" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        <div className="hint">{exists ? "API key is configured." : "API key is not configured."}</div>
        {error ? <div className="empty acp-error">{error}</div> : null}
      </div>
    </CommonModal>
  );
}
