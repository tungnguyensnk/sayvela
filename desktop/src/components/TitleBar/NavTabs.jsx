import { IconHome, IconSettings, IconContexts, IconStats, IconSessions } from "../Icons";
import { ActionIconButton } from "../astryx/AstryxControls";

const TABS = [
  { id: null, icon: IconHome, label: "Home" },
  { id: "settings", icon: IconSettings, label: "Settings" },
  { id: "contexts", icon: IconContexts, label: "Contexts" },
  { id: "sessions", icon: IconSessions, label: "Sessions" },
  { id: "stats", icon: IconStats, label: "Stats" },
];

// section switcher living in the title bar; clicking the active tab returns home
export function NavTabs({ activeTab, onTabChange }) {
  return (
    <nav className="tb-nav" data-tauri-drag-region="false">
      {TABS.map(({ id, icon: Icon, label }) => (
        <ActionIconButton
          key={label}
          className={`tb-nav-btn${activeTab === id ? " tb-nav-btn--active" : ""}`}
          icon={<Icon size={18} />}
          label={label}
          title={label}
          tooltip={null}
          onClick={() => onTabChange(activeTab === id ? null : id)}
        />
      ))}
    </nav>
  );
}
