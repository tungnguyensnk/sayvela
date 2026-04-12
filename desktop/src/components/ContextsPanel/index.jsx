import { useState } from "react";
import { ContextModal } from "../ContextModal";
import "./ContextsPanel.css";

// displays and manages the list of user soniox contexts; allows crud operations
export function ContextsPanel({ contexts, loading, onAdd, onEdit, onRemove, selectedId, onSelect }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (ctx) => { setEditing(ctx); setModalOpen(true); };
  const handleSave = async (payload) => {
    if (editing) await onEdit(editing.id, payload);
    else await onAdd(payload);
  };

  const handleDelete = async (id) => {
    await onRemove(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="ctxp panel">
      <div className="panel-header">
        <span className="panel-title">Contexts</span>
        <button className="btn btn-primary ctxp-add-btn" onClick={openNew}>+ New</button>
      </div>

      <div className="ctxp-body">
        {loading && <div className="ctxp-empty">Loading…</div>}
        {!loading && contexts.length === 0 && (
          <div className="ctxp-empty empty">
            No contexts yet. Create one to improve transcription accuracy.
          </div>
        )}
        {contexts.map((ctx) => (
          <div
            key={ctx.id}
            className={`ctxp-item ${selectedId === ctx.id ? "ctxp-item-active" : ""}`}
            onClick={() => onSelect(ctx.id === selectedId ? null : ctx.id)}
          >
            <div className="ctxp-item-content">
              <span className="ctxp-item-name">{ctx.name}</span>
              {ctx.description && (
                <span className="ctxp-item-desc">{ctx.description}</span>
              )}
              <div className="ctxp-item-tags">
                {ctx.contextJson?.general && <span className="ctxp-tag">general</span>}
                {ctx.contextJson?.text && <span className="ctxp-tag">text</span>}
                {ctx.contextJson?.terms?.length > 0 && (
                  <span className="ctxp-tag">terms ({ctx.contextJson.terms.length})</span>
                )}
                {ctx.contextJson?.translation_terms?.length > 0 && (
                  <span className="ctxp-tag">translation_terms ({ctx.contextJson.translation_terms.length})</span>
                )}
              </div>
            </div>
            <div className="ctxp-item-actions" onClick={(e) => e.stopPropagation()}>
              {confirmDeleteId === ctx.id ? (
                <>
                  <button className="btn btn-danger ctxp-tiny-btn" onClick={() => handleDelete(ctx.id)}>Confirm</button>
                  <button className="btn ctxp-tiny-btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn ctxp-tiny-btn" onClick={() => openEdit(ctx)}>Edit</button>
                  <button className="btn btn-danger ctxp-tiny-btn" onClick={() => setConfirmDeleteId(ctx.id)}>Del</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <ContextModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
