import { ActionIconButton } from "../astryx/AstryxControls";
import { IconClose } from "../Icons";
import "./CommonModal.css";

// renders a reusable modal shell with overlay close, header, body and optional footer
export function CommonModal({ open, title, onClose, children, footer, className = "" }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-shell ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <ActionIconButton className="modal-close-btn" icon={<IconClose size={14} />} label="Close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
