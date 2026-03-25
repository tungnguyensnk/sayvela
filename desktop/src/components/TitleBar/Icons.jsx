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

// renders the close icon
export function IconClose() {
  return (
    <svg className="tb-icon" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 2l6 6" />
      <path d="M8 2L2 8" />
    </svg>
  );
}
