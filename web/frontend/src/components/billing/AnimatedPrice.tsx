import type { BillingInterval } from "@/lib/billing-catalog";

export function AnimatedPrice({
  interval,
  monthlyPrice,
  yearlyListPrice,
  yearlyPrice,
  monthsSaved,
}: {
  interval: BillingInterval;
  monthlyPrice: number;
  yearlyListPrice: number;
  yearlyPrice: number;
  monthsSaved: number;
}) {
  return (
    <div className="mt-2 grid grid-cols-1 grid-rows-1 items-center">
      <div
        className={`col-start-1 row-start-1 transform-gpu will-change-transform will-change-opacity transition-transform duration-200 ease-out ${
          interval === "month" ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
        }`}
        aria-hidden={interval !== "month"}
      >
        <div className="text-3xl font-semibold leading-none text-white">{monthlyPrice}</div>
      </div>
      <div
        className={`col-start-1 row-start-1 transform-gpu will-change-transform will-change-opacity transition-transform duration-200 ease-out ${
          interval === "year" ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-1"
        }`}
        aria-hidden={interval !== "year"}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold leading-none text-white/40 line-through">{yearlyListPrice}</span>
          <span className="text-3xl font-semibold leading-none text-white">{yearlyPrice}</span>
          <span className="whitespace-nowrap text-sm font-medium leading-none text-emerald-200/85">
            tiết kiệm {monthsSaved} tháng
          </span>
        </div>
      </div>
    </div>
  );
}
