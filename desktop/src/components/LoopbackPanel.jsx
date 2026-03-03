export function LoopbackPanel({
  devices,
  selectedDeviceId,
  onChangeDeviceId,
  running,
  onRefreshDevices,
  devicesError,
  bytes,
  captureState,
  onStart,
  onStop,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Loopback audio</div>
          <div className="panel-sub">wasapi → emit audio_chunk</div>
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <div className="field">
          <div className="label">Thiết bị loopback</div>
          <div className="row">
            <select
              className="select"
              value={selectedDeviceId}
              disabled={running}
              onChange={(e) => onChangeDeviceId?.(e.target.value)}
            >
              {devices.length === 0 ? (
                <option value="" disabled>
                  Không có thiết bị
                </option>
              ) : (
                <option value="" disabled>
                  Chọn thiết bị...
                </option>
              )}
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={running}
              onClick={onRefreshDevices}
            >
              Làm mới
            </button>
          </div>
          {devicesError ? <div className="empty">{devicesError}</div> : null}
        </div>

        <div className="actions">
          {!running ? (
            <button
              className="btn btn-primary"
              type="button"
              disabled={!selectedDeviceId}
              onClick={onStart}
            >
              Bắt đầu
            </button>
          ) : (
            <button className="btn btn-danger" type="button" onClick={onStop}>
              Dừng
            </button>
          )}
          <div className="small">received: {bytes} bytes</div>
        </div>

        <div className="small" style={{ marginTop: 8 }}>
          state: {captureState?.state || "-"}{" "}
          {captureState?.message ? `(${captureState.message})` : ""}
        </div>
      </div>
    </section>
  );
}
