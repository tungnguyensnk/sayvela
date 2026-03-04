import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./TitleBar.css";

function IconMinimize() {
  return (
    <svg className="tb-icon tb-icon-min" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 7.5h8" />
    </svg>
  );
}

function IconMaximize() {
  return (
    <svg className="tb-icon" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1.5" y="1.5" width="7" height="7" rx="0" />
    </svg>
  );
}

function IconRestore() {
  return (
    <svg className="tb-icon" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M3 2.5h4v4" />
      <path d="M3 3.5H2.5v4H6.5V7" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg className="tb-icon" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 2l6 6" />
      <path d="M8 2L2 8" />
    </svg>
  );
}

export function TitleBar({ title = "virex" }) {
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

  const minimize = async () => {
    try {
      await appWindow.minimize();
    } catch {}
  };

  const toggleMaximize = async () => {
    try {
      await appWindow.toggleMaximize();
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch {}
    } catch {}
  };

  const close = async () => {
    try {
      await appWindow.close();
    } catch {}
  };

  return (
    <header className="titlebar" data-tauri-drag-region onDoubleClick={toggleMaximize}>
      <div className="tb-left" data-tauri-drag-region>
        <div className="tb-title" data-tauri-drag-region>
          {title}
        </div>
      </div>

      <div className="tb-controls" data-tauri-drag-region="false">
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

