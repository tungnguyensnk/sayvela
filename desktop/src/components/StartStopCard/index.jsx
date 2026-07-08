import { IconSettings, IconContexts, IconStats, IconPlay, IconStop } from "../Icons";
import { ActionButton } from "../astryx/AstryxControls";
import { formatElapsed } from "../../utils/time";

export function StartStopCard({ running, onStart, onStop, elapsed, loopbackStatus, micStatus, activeContextName, onOpenTab }) {
  return (
    <div className="ssc">
      <div className="ssc-status-row">
        <span className={`ssc-dot${running ? " ssc-dot--running" : ""}`} />
        <span className="ssc-state">{running ? "Recording…" : "Idle"}</span>
        {running && elapsed > 0 && (
          <span className="ssc-timer">{formatElapsed(elapsed)}</span>
        )}
        {activeContextName && (
          <span className="ssc-ctx-badge" onClick={() => onOpenTab("contexts")} title="Active context">
            🗂️ {activeContextName}
          </span>
        )}
      </div>

      <div className="ssc-actions">
        {!running ? (
          <ActionButton className="ssc-btn" icon={<IconPlay size={16} />} onClick={onStart} variant="primary">
            Start
          </ActionButton>
        ) : (
          <ActionButton className="ssc-btn" icon={<IconStop size={16} />} onClick={onStop} variant="destructive">
            Stop
          </ActionButton>
        )}
      </div>

      <div className="ssc-quick-row">
        <ActionButton className="ssc-quick-btn" icon={<IconSettings size={15} />} onClick={() => onOpenTab("settings")} size="sm" variant="ghost">
          Settings
        </ActionButton>
        <ActionButton className="ssc-quick-btn" icon={<IconContexts size={15} />} onClick={() => onOpenTab("contexts")} size="sm" variant="ghost">
          Contexts
        </ActionButton>
        <ActionButton className="ssc-quick-btn" icon={<IconStats size={15} />} onClick={() => onOpenTab("stats")} size="sm" variant="ghost">
          Stats
        </ActionButton>
      </div>

      <div className="ssc-sub-row">
        {loopbackStatus && <span className="ssc-badge">Sys: {loopbackStatus}</span>}
        {micStatus && <span className="ssc-badge">Mic: {micStatus}</span>}
      </div>
    </div>
  );
}
