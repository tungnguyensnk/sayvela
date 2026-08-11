import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";

export function PricingPlanCard({
  title,
  badge,
  price,
  priceCaption,
  features,
  footer,
  featured = false,
}: {
  title: string;
  badge?: ReactNode;
  price: ReactNode;
  priceCaption: ReactNode;
  features: readonly string[];
  footer: ReactNode;
  featured?: boolean;
}) {
  return (
    <article
      className={`flex flex-col p-6 ${featured ? "bg-ai-soft" : "bg-surface"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {badge ?? null}
      </div>

      {price}
      {priceCaption}

      <ul className="mt-6 flex flex-col gap-2.5 text-sm text-muted">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-ok" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">{footer}</div>
    </article>
  );
}
