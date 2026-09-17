import { ActionButton, ActionIconButton } from "../astryx/AstryxControls";

function BoltIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

// assist status dot plus the gate toggle and the manual trigger
export function AssistControls({ status, pending, autoGate, hotkey, onToggleGate, onTrigger }) {
  return (
    <div className="tb-assist" data-tauri-drag-region="false">
      <span
        className={`tb-assist-dot tb-assist-dot--${status}${pending ? " tb-assist-dot--pending" : ""}`}
        title={`assist: ${status}`}
      />
      <ActionButton
        type="button"
        className="tb-btn tb-text-btn"
        size="sm"
        variant={autoGate ? "primary" : "ghost"}
        onClick={() => onToggleGate?.(!autoGate)}
        title="let the gate model watch the conversation"
      >
        auto
      </ActionButton>
      <ActionIconButton
        className="tb-btn"
        icon={<BoltIcon />}
        label={pending ? "stop this answer" : "assist now"}
        title={pending ? `stop this answer (${hotkey})` : `assist now (${hotkey})`}
        onClick={() => onTrigger?.()}
      />
    </div>
  );
}
