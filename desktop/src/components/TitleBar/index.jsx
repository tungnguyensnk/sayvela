import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconMinimize, IconMaximize, IconRestore, IconClose } from "./Icons";
import "./TitleBar.css";

// renders remaining minutes badge — green/yellow/red based on quota
function UsageBadge({ entitlement }) {
  if (!entitlement) return null;
  const used = entitlement.minutesUsed ?? 0;
  const total = entitlement.minutesPerMonth ?? 300;
  const remaining = Math.max(0, total - used);
  const pct = used / total;
  const color = pct >= 0.9 ? "#ff6b6b" : pct >= 0.7 ? "#ffc96b" : "#4ade80";
  return (
    <span className="tb-usage-badge" style={{ color }}>
      {remaining}m left
    </span>
  );
}

// custom title bar component with window controls (minimize, maximize, close)
export function TitleBar({ title = "sayvela", user, entitlement, syncStatus, onLoginClick, onLogoutClick, onContextsClick, showContexts }) {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten;

    (async () => {
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch {}

      try {
        if (typeof appWindow.onResized === "function") {
          unlisten = await appWindow.onResized(async () => {
            try {
              setIsMaximized(await appWindow.isMaximized());
            } catch {}
          });
        }
      } catch {}
    })();

    return () => {
      try {
        if (unlisten) unlisten();
      } catch {}
    };
  }, [appWindow]);

  // minimizes the application window
  const minimize = async () => {
    try {
      await appWindow.minimize();
    } catch {}
  };

  // toggles the application window between maximized and restored states
  const toggleMaximize = async () => {
    try {
      await appWindow.toggleMaximize();
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch {}
    } catch {}
  };

  // closes the application window
  const close = async () => {
    try {
      await appWindow.close();
    } catch {}
  };

  return (
    <header className="titlebar" data-tauri-drag-region onDoubleClick={toggleMaximize}>
      <div className="tb-left" data-tauri-drag-region>
        <img
          src="/sayvela-mark.svg"
          alt="Sayvela"
          className="tb-logo"
          data-tauri-drag-region
        />
        <div className="tb-title" data-tauri-drag-region>
          {title}
        </div>
        <UsageBadge entitlement={entitlement} />
        {syncStatus === "syncing" && <span className="tb-sync-badge syncing">syncing…</span>}
        {syncStatus === "synced" && <span className="tb-sync-badge synced">synced ✓</span>}
        {syncStatus === "failed" && <span className="tb-sync-badge failed">sync failed</span>}
      </div>

      <div className="tb-controls" data-tauri-drag-region="false">
        {user ? (
          <div className="tb-user">
            <span className="tb-user-email">{user.email}</span>
            {onContextsClick && (
              <button
                type="button"
                className={`tb-btn tb-text-btn${showContexts ? " tb-btn-active" : ""}`}
                onClick={onContextsClick}
              >
                contexts
              </button>
            )}
            <button type="button" className="tb-btn tb-text-btn" onClick={onLogoutClick}>
              sign out
            </button>
          </div>
        ) : (
          <button type="button" className="tb-btn tb-text-btn" onClick={onLoginClick}>
            sign in
          </button>
        )}
        <button
          type="button"
          className="tb-btn"
          aria-label="minimize"
          data-tauri-drag-region="false"
          onClick={minimize}
        >
          <IconMinimize />
        </button>
        <button
          type="button"
          className="tb-btn"
          aria-label={isMaximized ? "restore" : "maximize"}
          data-tauri-drag-region="false"
          onClick={toggleMaximize}
        >
          {isMaximized ? <IconRestore /> : <IconMaximize />}
        </button>
        <button
          type="button"
          className="tb-btn tb-btn-close"
          aria-label="close"
          data-tauri-drag-region="false"
          onClick={close}
        >
          <IconClose />
        </button>
      </div>
    </header>
  );
}
