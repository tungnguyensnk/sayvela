import { ActionIconButton } from "../astryx/AstryxControls";

function BoltIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

// the assist state light on its own, so mini mode can show it next to the logo
export function AssistDot({ status, pending }) {
  return (
    <span
      className={`tb-assist-dot tb-assist-dot--${status}${pending ? " tb-assist-dot--pending" : ""}`}
      title={`assist: ${status}`}
    />
  );
}

// assist status dot plus the manual trigger
export function AssistControls({ status, pending, hotkey, onTrigger, className = "" }) {
  return (
    <div className={`tb-assist${className ? ` ${className}` : ""}`}>
      <AssistDot status={status} pending={pending} />
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
