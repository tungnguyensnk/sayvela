// renders the minimize icon
export function IconMinimize() {
  return (
    <svg className="tb-icon tb-icon-min" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 7.5h8" />
    </svg>
  );
}

export function IconMaximize() {
  return (
    <svg className="tb-icon" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1.5" y="1.5" width="7" height="7" rx="0" />
    </svg>
  );
}

// renders the restore icon
export function IconRestore() {
  return (
    <svg className="tb-icon" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M3 2.5h4v4" />
      <path d="M3 3.5H2.5v4H6.5V7" />
    </svg>
  );
}

// renders the always on top icon: a pin holding the window down
export function IconPin() {
  return (
    <svg className="tb-icon" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 7.5V11" />
      <path d="M3 1.5h6l-1 3 1.8 1.5H2.2L4 4.5l-1-3Z" />
    </svg>
  );
}

// renders the click-through icon: a pointer passing through the surface
export function IconClickThrough() {
  return (
    <svg className="tb-icon" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1.5 1.5 5 10l1.3-3.2L9.5 5.5 1.5 1.5Z" />
      <path d="M7.5 8.5 11 11.5" strokeDasharray="1.6 1.4" />
    </svg>
  );
}

// renders the mini mode icon: a small pane tucked inside the window
export function IconMini() {
  return (
    <svg className="tb-icon" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1" y="1" width="8" height="8" rx="0" />
      <rect x="4.5" y="4.5" width="4.5" height="4.5" rx="0" />
    </svg>
  );
}

// renders the close icon
export function IconClose() {
  return (
    <svg className="tb-icon" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 2l6 6" />
      <path d="M8 2L2 8" />
    </svg>
  );
}
