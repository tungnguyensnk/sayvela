export function StatsPanel({ entitlement }) {
  if (!entitlement) {
    return (
      <section className="panel stats-panel">
        <div className="panel-header">
          <div className="panel-title">Stats</div>
        </div>
        <div className="lb-empty">No usage data</div>
      </section>
    );
  }
  const pct = Math.min(100, Math.round((entitlement.minutesUsed / entitlement.minutesPerMonth) * 100));
  return (
    <section className="panel stats-panel">
      <div className="panel-header">
        <div className="panel-title">Stats</div>
      </div>
      <div className="stats-body">
        <div className="stats-row">
          <span className="stats-label">Minutes used</span>
          <span className="stats-value">{entitlement.minutesUsed} / {entitlement.minutesPerMonth}</span>
        </div>
        <div className="stats-bar-track">
          <div className="stats-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="stats-pct">{pct}%</div>
      </div>
    </section>
  );
}
