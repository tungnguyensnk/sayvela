"use client";

import Link from "next/link";
import { useSessions } from "@/hooks/useSessions";
import { useI18n } from "@/i18n/client";
import { formatDuration, formatShortDateTime } from "@/lib/format";
import { SectionHeading, Skeleton } from "@/components/ui/primitives";
import { ChevronRightIcon } from "@/components/ui/icons";

export function RecentSessions() {
  const { state } = useSessions(1, 6);
  const { locale, m } = useI18n();

  return (
    <section className="card flex flex-col">
      <div className="border-b border-line px-5 py-4">
        <SectionHeading
          title={m.dashboard.recent.title}
          action={
            <Link
              href="/sessions"
              className="font-display text-xs font-semibold text-accent hover:underline"
            >
              {m.common.viewAll} →
            </Link>
          }
        />
      </div>

      {state.kind === "loading" || state.kind === "idle" ? (
        <div className="flex flex-col gap-2 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : state.kind === "error" ? (
        <p className="px-5 py-10 text-center text-sm text-muted">
          {m.dashboard.recent.failed}
        </p>
      ) : state.data.items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-display text-sm font-semibold">{m.dashboard.recent.empty}</p>
          <p className="mt-1 text-sm text-muted">{m.dashboard.recent.emptyHint}</p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {state.data.items.map((session) => (
            <li key={session.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/sessions/${session.id}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-raised"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {session.title ?? m.sessions.untitled}
                  </span>
                  <span className="tabular mt-0.5 block text-xs text-faint">
                    {formatShortDateTime(session.createdAt, locale)} ·{" "}
                    {formatDuration(session.durationSeconds, locale)}
                  </span>
                </span>
                {session.status === "active" ? (
                  <span className="chip chip-ok shrink-0">{m.sessions.live}</span>
                ) : null}
                <ChevronRightIcon
                  width={16}
                  height={16}
                  className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
