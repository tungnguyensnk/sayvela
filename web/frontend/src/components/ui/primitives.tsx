import type { ReactNode } from "react";

/** Page title block used at the top of every signed-in screen. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h1>
        {description ? (
          <p className="measure text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Section heading inside a page — smaller than PageHeader, same rhythm. */
export function SectionHeading({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint ? <span className="text-xs text-faint">{hint}</span> : null}
      </div>
      {action}
    </div>
  );
}

/** Quota / usage bar. Colour encodes severity, never decoration. */
export function Meter({
  value,
  label,
  className = "",
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 90 ? "meter-fill-crit" : pct >= 75 ? "meter-fill-warn" : "";

  return (
    <div
      className={className}
      role="meter"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Mức sử dụng"}
    >
      <div className="meter">
        <div className={`meter-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Empty / error state with a single clear next action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon ? (
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-raised text-faint">
          {icon}
        </div>
      ) : null}
      <p className="font-semibold">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-6 text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

/** Live indicator — a dot that reads as state at a glance. */
export function LiveDot({ label = "live" }: { label?: string }) {
  return (
    <span className="chip chip-ok">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
