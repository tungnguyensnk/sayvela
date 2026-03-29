import type { ReactNode } from "react";

export function PricingPlanCard({
  className,
  title,
  badge,
  price,
  priceCaption,
  features,
  footer,
}: {
  className: string;
  title: string;
  badge?: ReactNode;
  price: ReactNode;
  priceCaption: ReactNode;
  features: ReactNode;
  footer: ReactNode;
}) {
  return (
    <article className={className}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-white">{title}</div>
        {badge ?? null}
      </div>
      {price}
      {priceCaption}
      {features}
      <div className="mt-auto pt-8">{footer}</div>
    </article>
  );
}
