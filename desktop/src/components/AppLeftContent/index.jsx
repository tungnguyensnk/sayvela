import { useSelector } from "react-redux";
import { AudioControlPanelContainer } from "../AudioControlPanel/AudioControlPanelContainer";
import { ContextsPanelContainer } from "../ContextsPanel/ContextsPanelContainer";
import { SessionsPanelContainer } from "../SessionsPanel/SessionsPanelContainer";
import { StatsPanel } from "../StatsPanel";
import { selectActiveTab } from "../../store/selectors";

export function AppLeftContent({ stats, updateSetting, audioRuntime }) {
  const activeTab = useSelector(selectActiveTab);

  switch (activeTab) {
    case "settings":
      return <AudioControlPanelContainer {...audioRuntime} updateSetting={updateSetting} />;
    case "contexts":
      return <ContextsPanelContainer updateSetting={updateSetting} />;
    case "stats":
      return <StatsPanel entitlement={stats.entitlement} />;
    case "sessions":
      return <SessionsPanelContainer />;
    default:
      return null;
  }
}
