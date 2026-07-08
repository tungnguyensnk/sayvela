import { AudioControlPanel } from "../AudioControlPanel";
import { ContextsPanel } from "../ContextsPanel";
import { SessionsPanel } from "../SessionsPanel";
import { StatsPanel } from "../StatsPanel";

export function AppLeftContent({ activeTab, audio, contextsState, sessionsState, stats }) {
  switch (activeTab) {
    case "settings":
      return <AudioControlPanel {...audio} />;
    case "contexts":
      return <ContextsPanel {...contextsState} />;
    case "stats":
      return <StatsPanel entitlement={stats.entitlement} />;
    case "sessions":
      return <SessionsPanel {...sessionsState} />;
    default:
      return null;
  }
}
