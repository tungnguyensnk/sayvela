import { useEffect, useState } from "react";
import { IconPlay, IconStop } from "../Icons";
import { ActionButton } from "../astryx/AstryxControls";
import { formatElapsed } from "../../utils/time";

export function StartStopCard({ running, onStart, onStop, elapsed, activeContextName, preparing, readyToStop, progress = 0, inline = false }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const showPreparing = preparing || (readyToStop && animatedProgress < 0.995);
  const buttonPreparing = showPreparing || (running && !readyToStop);
  const buttonStopping = readyToStop && !buttonPreparing;
  const progressStyle = { "--ssc-progress": `${animatedProgress * 100}%` };

  useEffect(() => {
    if (!preparing && !readyToStop) { setAnimatedProgress(0); return; }
    const target = readyToStop ? 1 : Math.min(1, Math.max(0, progress));
    const timer = setInterval(() => {
      setAnimatedProgress((v) => {
        if (Math.abs(target - v) < 0.01) return target;
        return v + Math.sign(target - v) * Math.min(Math.abs(target - v), 0.014);
      });
    }, 16);
    return () => clearInterval(timer);
  }, [preparing, readyToStop, progress]);

  return (
    <div className={`ssc ${inline ? "ssc--inline" : ""}`}>
      {activeContextName && <span className="ssc-ctx-badge" title="Active context">🗂️ {activeContextName}</span>}

      <div className="ssc-actions">
        <ActionButton
          className={`ssc-btn ${buttonPreparing ? "ssc-btn--preparing" : ""}`}
          disabled={buttonPreparing}
          icon={buttonStopping ? <IconStop size={16} /> : <IconPlay size={16} />}
          onClick={buttonStopping ? onStop : onStart}
          style={buttonPreparing ? progressStyle : undefined}
          variant={buttonStopping ? "destructive" : "primary"}
        >
          {buttonStopping ? "Stop" : buttonPreparing ? "Preparing…" : "Start"}
        </ActionButton>
        {buttonStopping && elapsed > 0 && <span className="ssc-timer">{formatElapsed(elapsed)}</span>}
      </div>
    </div>
  );
}
