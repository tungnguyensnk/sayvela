import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconMinimize, IconMaximize, IconRestore, IconClose } from "./Icons";
import "./TitleBar.css";

// custom title bar component with window controls (minimize, maximize, close)
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
