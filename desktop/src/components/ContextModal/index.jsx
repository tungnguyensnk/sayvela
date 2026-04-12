import { useEffect, useRef, useState } from "react";
import "./ContextModal.css";

const EMPTY_FORM = {
  name: "",
  description: "",
  general: "",
  text: "",
  terms: "",
  translation_terms: "",
};

// parses user's raw textarea input into the soniox context_json shape
function buildContextJson(form) {
  const json = {};

  if (form.general.trim()) {
    try {
      json.general = JSON.parse(form.general.trim());
    } catch {
      const pairs = form.general.trim().split("\n").filter(Boolean);
      json.general = pairs.map((line) => {
        const [key, ...rest] = line.split(":");
        return { key: key?.trim(), value: rest.join(":").trim() };
      });
    }
  }

  if (form.text.trim()) json.text = form.text.trim();

  if (form.terms.trim()) {
    json.terms = form.terms
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  if (form.translation_terms.trim()) {
    try {
      json.translation_terms = JSON.parse(form.translation_terms.trim());
    } catch {
      const lines = form.translation_terms
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      json.translation_terms = lines.map((line) => {
        const [source, ...rest] = line.split("→");
        return { source: source?.trim(), target: rest.join("→").trim() };
      });
    }
  }

  return json;
}

// parses existing context_json back into form fields for editing
function jsonToForm(contextJson) {
  if (!contextJson) return EMPTY_FORM;
  return {
    name: "",
    description: "",
    general: contextJson.general
      ? JSON.stringify(contextJson.general, null, 2)
      : "",
    text: contextJson.text || "",
    terms: Array.isArray(contextJson.terms)
      ? contextJson.terms.join("\n")
      : "",
    translation_terms: contextJson.translation_terms
      ? JSON.stringify(contextJson.translation_terms, null, 2)
      : "",
  };
}

// modal for creating or editing a soniox context with its four sections
export function ContextModal({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name || "",
        description: initial.description || "",
        ...jsonToForm(initial.contextJson),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
    setTimeout(() => nameRef.current?.focus(), 50);
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const contextJson = buildContextJson(form);
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        contextJson,
      });
      onClose();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="ctx-overlay" onClick={onClose}>
      <div className="ctx-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ctx-modal-header">
          <span className="ctx-modal-title">
            {initial ? "Edit Context" : "New Context"}
          </span>
          <button className="ctx-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ctx-modal-body">
          <div className="field">
            <label className="label">Name *</label>
            <input
              ref={nameRef}
              className="input"
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Medical Interview"
              maxLength={128}
            />
          </div>

          <div className="field">
            <label className="label">Description</label>
            <input
              className="input"
              value={form.description}
              onChange={set("description")}
              placeholder="Short description (optional)"
              maxLength={512}
            />
          </div>

          <div className="ctx-section-label">General — key:value pairs or JSON array</div>
          <textarea
            className="ctx-textarea"
            value={form.general}
            onChange={set("general")}
            placeholder={'domain: medical\ntopic: patient consultation\nlanguage: en'}
            rows={3}
          />

          <div className="ctx-section-label">Text — longer background text</div>
          <textarea
            className="ctx-textarea"
            value={form.text}
            onChange={set("text")}
            placeholder="Meeting notes, reference doc, background summary..."
            rows={3}
          />

          <div className="ctx-section-label">Terms — one per line</div>
          <textarea
            className="ctx-textarea"
            value={form.terms}
            onChange={set("terms")}
            placeholder={"Soniox\nHemoglobin A1c\nNestJS"}
            rows={3}
          />

          <div className="ctx-section-label">Translation Terms — source → target (one per line or JSON)</div>
          <textarea
            className="ctx-textarea"
            value={form.translation_terms}
            onChange={set("translation_terms")}
            placeholder={"St John's → St John's\nAPI → API"}
            rows={3}
          />

          {error && <div className="ctx-error">{error}</div>}
        </div>

        <div className="ctx-modal-footer">
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
