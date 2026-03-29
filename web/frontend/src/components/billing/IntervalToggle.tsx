import type { BillingInterval } from "@/lib/billing-catalog";

export function IntervalToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div className="relative inline-flex rounded-full bg-white/8 p-1 ring-1 ring-white/10 backdrop-blur">
      <div
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] transform-gpu rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 shadow-[0_10px_24px_-18px_rgba(56,189,248,0.8)] will-change-transform transition-transform duration-200 ease-out ${
          interval === "year" ? "translate-x-full" : "translate-x-0"
        }`}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => onChange("month")}
        className={`relative z-10 min-w-24 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
          interval === "month" ? "text-slate-950" : "text-white/70"
        }`}
      >
        Tháng
      </button>
      <button
        type="button"
        onClick={() => onChange("year")}
        className={`relative z-10 min-w-24 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
          interval === "year" ? "text-slate-950" : "text-white/70"
        }`}
      >
        Năm
      </button>
    </div>
  );
}
