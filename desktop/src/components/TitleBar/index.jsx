import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ActionButton, ActionIconButton } from "../astryx/AstryxControls";
import { IconMinimize, IconMaximize, IconRestore, IconClose } from "./Icons";
import "./TitleBar.css";

// renders remaining minutes badge — green/yellow/red based on quota
function UsageBadge({ entitlement }) {
  if (!entitlement) return null;
  const used = entitlement.minutesUsed ?? 0;
  const total = entitlement.minutesPerMonth ?? 300;
  const remaining = Math.max(0, total - used);
  const pct = used / total;
  const status = pct >= 0.9 ? "danger" : pct >= 0.7 ? "warning" : "success";
  return (
    <span className={`tb-usage-badge tb-usage-badge--${status}`}>
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
              <ActionButton
                type="button"
                className={`tb-btn tb-text-btn${showContexts ? " tb-btn-active" : ""}`}
                onClick={onContextsClick}
                size="sm"
                variant="ghost"
              >
                contexts
              </ActionButton>
            )}
            <ActionButton type="button" className="tb-btn tb-text-btn" onClick={onLogoutClick} size="sm" variant="ghost">
              sign out
            </ActionButton>
          </div>
        ) : (
          <ActionButton type="button" className="tb-btn tb-text-btn" onClick={onLoginClick} size="sm" variant="ghost">
            sign in
          </ActionButton>
        )}
        <ActionIconButton
          className="tb-btn"
          data-tauri-drag-region="false"
          icon={<IconMinimize />}
          label="minimize"
          onClick={minimize}
        />
        <ActionIconButton
          className="tb-btn"
          data-tauri-drag-region="false"
          icon={isMaximized ? <IconRestore /> : <IconMaximize />}
          label={isMaximized ? "restore" : "maximize"}
          onClick={toggleMaximize}
        />
        <ActionIconButton
          className="tb-btn tb-btn-close"
          data-tauri-drag-region="false"
          icon={<IconClose />}
          label="close"
          onClick={close}
        />
      </div>
    </header>
  );
}
