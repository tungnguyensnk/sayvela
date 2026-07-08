import { useState } from "react";
import { IconSettings, IconContexts, IconStats, IconSessions, IconChevronLeft, IconChevronRight, IconClose } from "../Icons";
import "./LeftBar.css";

const TABS = [
  { id: "settings",  icon: IconSettings,  label: "Settings" },
  { id: "contexts",  icon: IconContexts,  label: "Contexts" },
  { id: "sessions",  icon: IconSessions,  label: "Sessions" },
  { id: "stats",     icon: IconStats,     label: "Stats" },
];

// collapsible left sidebar — icon rail + optional expanded panel
export function LeftBar({ activeTab, onTabChange, children }) {
  const [expanded, setExpanded] = useState(true);

  function handleTabClick(id) {
    if (!expanded) {
      setExpanded(true);
      onTabChange(id);
    } else {
      onTabChange(activeTab === id ? null : id);
    }
  }

  return (
    <aside className={`lb-root${expanded ? " lb-root--open" : ""}`}>
      <nav className="lb-rail">
        <div className="lb-rail-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id && expanded;
            return (
              <button
                key={t.id}
                className={`lb-icon-btn${active ? " lb-icon-btn--active" : ""}`}
                onClick={() => handleTabClick(t.id)}
                title={t.label}
              >
                <Icon size={22} />
                <span className="lb-icon-label">{t.label}</span>
              </button>
            );
          })}
        </div>

        <button
          className="lb-toggle-btn"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
        </button>
      </nav>

      {activeTab && expanded && (
        <div className="lb-panel">
          <div className="lb-panel-header">
            <span className="lb-panel-title">
              {TABS.find((t) => t.id === activeTab)?.label}
            </span>
            <button className="lb-close-btn" onClick={() => onTabChange(null)} title="Close">
              <IconClose size={14} />
            </button>
          </div>
          <div className="lb-panel-body">{children}</div>
        </div>
      )}
    </aside>
  );
}
