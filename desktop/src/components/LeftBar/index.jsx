import { IconSettings, IconContexts, IconStats, IconSessions } from "../Icons";
import { ActionIconButton } from "../astryx/AstryxControls";
import "./LeftBar.css";

const TABS = [
  { id: "settings",  icon: IconSettings,  label: "Settings" },
  { id: "contexts",  icon: IconContexts,  label: "Contexts" },
  { id: "sessions",  icon: IconSessions,  label: "Sessions" },
  { id: "stats",     icon: IconStats,     label: "Stats" },
];

// left sidebar with icon rail and overlay panel
export function LeftBar({ activeTab, onTabChange, children }) {
  const panelOpen = Boolean(activeTab);

  function handleTabClick(id) {
    onTabChange(activeTab === id ? null : id);
  }

  return (
    <aside className="lb-root">
      <nav className="lb-rail">
        <div className="lb-rail-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <ActionIconButton
                key={t.id}
                label={t.label}
                className={`lb-icon-btn${active ? " lb-icon-btn--active" : ""}`}
                icon={<Icon size={22} />}
                onClick={() => handleTabClick(t.id)}
                title={t.label}
                tooltip={null}
              >
                <span className="lb-icon-label">{t.label}</span>
              </ActionIconButton>
            );
          })}
        </div>

      </nav>

      <div className={`lb-panel${panelOpen ? " lb-panel--open" : ""}`} aria-hidden={!panelOpen}>
          <div className="lb-panel-body">{children}</div>
        </div>
    </aside>
  );
}
