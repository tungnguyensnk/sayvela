import { useEffect, useMemo, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";

const TRAY_ID = "sayvela-click-through";

// drives the two window switches: pinned on top, and mouse falling through to
// whatever sits underneath
export function useWindowOverlay({ alwaysOnTop, clickThrough, onToggleClickThrough }) {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const toggleRef = useRef(onToggleClickThrough);
  toggleRef.current = onToggleClickThrough;

  useEffect(() => {
    appWindow.setAlwaysOnTop(alwaysOnTop).catch((err) => {
      console.error("always on top failed", err);
    });
  }, [appWindow, alwaysOnTop]);

  useEffect(() => {
    appWindow.setIgnoreCursorEvents(clickThrough).catch((err) => {
      console.error("click-through failed", err);
    });
  }, [appWindow, clickThrough]);

  // once clicks pass through, the switch in the title bar is out of reach, so the
  // only way back is from outside the window: a tray icon you right click
  useEffect(() => {
    if (!clickThrough) return undefined;
    let tray = null;
    let cancelled = false;

    (async () => {
      try {
        const menu = await Menu.new({
          items: [
            {
              id: "stop-click-through",
              text: "Stop click-through",
              action: () => toggleRef.current?.(false),
            },
          ],
        });
        const icon = await defaultWindowIcon();
        const created = await TrayIcon.new({
          id: TRAY_ID,
          icon,
          menu,
          showMenuOnLeftClick: false,
          tooltip: "Sayvela — clicks pass through. Right click to stop.",
        });
        // the switch may have been turned off while the tray was still being built
        if (cancelled) {
          created.close().catch(() => {});
          return;
        }
        tray = created;
      } catch (err) {
        console.error("click-through tray icon failed", err);
      }
    })();

    return () => {
      cancelled = true;
      if (tray) tray.close().catch(() => {});
    };
  }, [clickThrough]);
}
