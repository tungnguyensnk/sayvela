export type Value = { kind: "yes" | "no" | "custom" | "text"; text?: string };

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-200/90" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.7 13.6 3.7 9.6l1.4-1.4 2.6 2.6 6.9-6.9 1.4 1.4-8.3 8.3Z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-white/45" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5.3 4 4 5.3 8.7 10 4 14.7 5.3 16 10 11.3 14.7 16 16 14.7 11.3 10 16 5.3 14.7 4 10 8.7 5.3 4Z"
      />
    </svg>
  );
}

function CustomPill() {
  return (
    <span className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10">
      custom
    </span>
  );
}

export function renderValue(value: Value) {
  if (value.kind === "yes") return <CheckIcon />;
  if (value.kind === "no") return <XIcon />;
  if (value.kind === "custom") return <CustomPill />;
  return <span className="text-sm text-white/80">{value.text}</span>;
}
