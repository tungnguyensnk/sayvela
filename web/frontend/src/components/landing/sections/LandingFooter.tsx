import Link from "next/link";
import type { Messages } from "@/i18n/messages";
import { SayvelaBrand } from "@/components/brand/SayvelaBrand";

export function LandingFooter({ m }: { m: Messages }) {
  const footer = m.landing.footer;
  const year = new Date().getFullYear();

  const columns = [
    {
      title: footer.product,
      links: [
        { label: m.nav.features, href: "/#features" },
        { label: m.nav.workflow, href: "/#workflow" },
        { label: m.nav.useCases, href: "/#use-cases" },
        { label: m.nav.pricing, href: "/pricing" },
      ],
    },
    {
      title: footer.account,
      links: [
        { label: m.nav.signIn, href: "/auth?mode=login" },
        { label: m.nav.createAccount, href: "/auth?mode=register" },
        { label: m.nav.billing, href: "/settings/billing" },
        { label: m.nav.faq, href: "/#faq" },
      ],
    },
  ];

  return (
    <footer className="bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <SayvelaBrand size="sm" />
          <p className="measure mt-4 text-sm leading-6 text-muted">{footer.tagline}</p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <div className="eyebrow">{column.title}</div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="tabular">{footer.rights(year)}</span>
          <span className="tabular">{footer.strip}</span>
        </div>
      </div>
    </footer>
  );
}
