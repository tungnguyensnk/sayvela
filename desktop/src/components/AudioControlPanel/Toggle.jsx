// a switch that reads as one control, unlike the browser default checkbox
export function Toggle({ checked, onChange, label, help, disabled = false }) {
  return (
    <div className="acp-toggleWrap">
      <label className={`acp-toggle${disabled ? " acp-toggle--off" : ""}`}>
        <input
          type="checkbox"
          className="acp-toggle-input"
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="acp-toggle-track">
          <span className="acp-toggle-thumb" />
        </span>
        {label ? <span className="acp-toggle-label">{label}</span> : null}
      </label>
      {help ? (
        <span className="acp-help" tabIndex="0" aria-label={`${label} help`} data-tooltip={help}>
          ?
        </span>
      ) : null}
    </div>
  );
}
