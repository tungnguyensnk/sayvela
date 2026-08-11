"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import {
  CardIcon,
  DownloadIcon,
  ExternalIcon,
  ListIcon,
  SparkIcon,
} from "@/components/ui/icons";

export function QuickActions() {
  const { m } = useI18n();
  const q = m.dashboard.quick;

  const actions = [
    { ...q.download, href: "https://sayvela.com/download", external: true, icon: DownloadIcon },
    { ...q.sessions, href: "/sessions", external: false, icon: ListIcon },
    { ...q.billing, href: "/settings/billing", external: false, icon: CardIcon },
    { ...q.pricing, href: "/pricing", external: false, icon: SparkIcon },
  ];

  return (
    <section className="card flex flex-col">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-sm font-semibold">{q.title}</h2>
      </div>
      <ul className="flex flex-col">
        {actions.map((action) => {
          const Glyph = action.icon;
          const content = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-raised text-accent">
                <Glyph width={16} height={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-medium">
                  {action.label}
                </span>
                <span className="block text-xs text-faint">{action.hint}</span>
              </span>
              {action.external ? (
                <ExternalIcon width={14} height={14} className="shrink-0 text-faint" />
              ) : null}
            </>
          );

          return (
            <li key={action.href} className="border-b border-line last:border-b-0">
              {action.external ? (
                <a
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-raised"
                >
                  {content}
                </a>
              ) : (
                <Link
                  href={action.href}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-raised"
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
