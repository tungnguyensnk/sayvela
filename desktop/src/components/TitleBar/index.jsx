import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PhysicalSize } from "@tauri-apps/api/dpi";
import { ActionButton, ActionIconButton } from "../astryx/AstryxControls";
import { IconMinimize, IconMaximize, IconRestore, IconMini, IconClose } from "./Icons";
import { AssistControls, AssistDot } from "./AssistControls";
import { NavTabs } from "./NavTabs";
import "./TitleBar.css";

function SyncLoadingIcon() {
  return <span className="tb-sync-spinner" aria-hidden="true" />;
}

function SyncDoneIcon() {
  return (
    <svg className="tb-sync-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.2 6.6 11 12.5 5" />
    </svg>
  );
}

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
export function TitleBar({ title = "sayvela", user, entitlement, syncStatus, assist, activeTab, onTabChange, onLogoutClick, miniMode = false, onToggleMiniMode, miniAction }) {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);
  const fullSizeRef = useRef(null);

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

  // mini mode halves the window, pins it on top and remembers the size to restore
  // on the way out. both sizes are centred, so growing back stays on screen
  const toggleMiniMode = async () => {
    const next = !miniMode;
    try {
      if (next) {
        if (await appWindow.isMaximized()) {
          await appWindow.unmaximize();
          setIsMaximized(false);
        }
        const size = await appWindow.innerSize();
        fullSizeRef.current = size;
        await appWindow.setSize(
          new PhysicalSize(Math.max(320, Math.round(size.width / 2)), Math.max(240, Math.round(size.height / 2))),
        );
        await appWindow.center();
      } else if (fullSizeRef.current) {
        await appWindow.setSize(fullSizeRef.current);
        await appWindow.center();
      }
      // the mini window is meant to sit over whatever you are working in
      await appWindow.setAlwaysOnTop(next);
    } catch (err) {
      // a blocked resize would otherwise flip the layout while the window stays put
      console.error("mini mode resize failed", err);
    }
    onToggleMiniMode?.(next);
  };

  // closes the application window
  const close = async () => {
    try {
      await appWindow.close();
    } catch {}
  };

  // the bar drags itself instead of using data-tauri-drag-region, because tauri
  // wires double click on a drag region straight to maximize with no way to opt out
  const startDragging = (e) => {
    if (e.button !== 0) return;
    // e.detail is 2 on the second press of a double click: swallow it, no maximize
    if (e.detail !== 1) {
      e.preventDefault();
      return;
    }
    if (e.target.closest("button, a, input, select, textarea, label, [tabindex]")) return;
    e.preventDefault();
    appWindow.startDragging().catch(() => {});
  };

  return (
    <header className="titlebar" onMouseDown={startDragging}>
      <div className="tb-left">
        <img
          src="/sayvela-mark.svg"
          alt="Sayvela"
          className="tb-logo"
        />
        <div className="tb-title">
          {title}
        </div>
        {miniMode ? (
          <div className="tb-mini-left">
            {assist ? <AssistDot status={assist.status} pending={assist.pending} /> : null}
            {miniAction}
          </div>
        ) : null}
        {onTabChange && !miniMode ? <NavTabs activeTab={activeTab} onTabChange={onTabChange} /> : null}
        {!miniMode && <UsageBadge entitlement={entitlement} />}
        {!miniMode && syncStatus === "syncing" && <span className="tb-sync-badge syncing" title="saving"><SyncLoadingIcon /></span>}
        {!miniMode && syncStatus === "synced" && <span className="tb-sync-badge synced" title="saved"><SyncDoneIcon /></span>}
        {!miniMode && syncStatus === "failed" && <span className="tb-sync-badge failed" title="sync failed">!</span>}
      </div>

      <div className="tb-controls">
        {assist && !miniMode ? <AssistControls {...assist} /> : null}
        {user && !miniMode ? (
          <div className="tb-user">
            <span className="tb-user-email">{user.email}</span>
            <ActionButton type="button" className="tb-btn tb-text-btn" onClick={onLogoutClick} size="sm" variant="ghost">
              sign out
            </ActionButton>
          </div>
        ) : null}
        <ActionIconButton
          className={`tb-btn${miniMode ? " tb-btn-active" : ""}`}
          icon={<IconMini />}
          label={miniMode ? "leave mini mode" : "mini mode"}
          onClick={toggleMiniMode}
        />
        <ActionIconButton
          className="tb-btn"
          icon={<IconMinimize />}
          label="minimize"
          onClick={minimize}
        />
        {miniMode ? null : (
          <ActionIconButton
            className="tb-btn"
            icon={isMaximized ? <IconRestore /> : <IconMaximize />}
            label={isMaximized ? "restore" : "maximize"}
            onClick={toggleMaximize}
          />
        )}
        <ActionIconButton
          className="tb-btn tb-btn-close"
          icon={<IconClose />}
          label="close"
          onClick={close}
        />
      </div>
    </header>
  );
}
