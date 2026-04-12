import "./RightBar.css";

// tab definitions for the right sidebar
const TABS = [
  { id: "transcript", icon: "📝", label: "Transcript" },
  { id: "ai",        icon: "🤖", label: "AI Chat" },
  { id: "settings",  icon: "⚙️",  label: "Settings" },
  { id: "contexts",  icon: "🗂️",  label: "Contexts" },
];

// collapsible right sidebar with icon rail and tab content panel
export function RightBar({ activeTab, onTabChange, children }) {
  return (
    <aside className="rb-root">
      <nav className="rb-rail">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`rb-icon-btn${activeTab === t.id ? " rb-icon-btn--active" : ""}`}
            onClick={() => onTabChange(activeTab === t.id ? null : t.id)}
            title={t.label}
          >
            <span className="rb-icon">{t.icon}</span>
          </button>
        ))}
      </nav>

      {activeTab && (
        <div className="rb-panel">
          <div className="rb-panel-header">
            <span className="rb-panel-title">
              {TABS.find((t) => t.id === activeTab)?.label}
            </span>
            <button
              className="rb-close-btn"
              onClick={() => onTabChange(null)}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="rb-panel-body">{children}</div>
        </div>
      )}
    </aside>
  );
}
