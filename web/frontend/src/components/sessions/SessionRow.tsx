"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "@/hooks/useSessions";
import { useI18n } from "@/i18n/client";
import { formatDateTime, formatDuration } from "@/lib/format";
import { TrashIcon } from "@/components/ui/icons";

export function SessionRow({
  session,
  /** thời lượng dài nhất trong trang — thanh đo là tương đối với những gì đang thấy */
  maxDuration,
  onDelete,
}: {
  session: Session;
  maxDuration: number;
  onDelete?: (id: string) => void;
}) {
  const { locale, m } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const share = maxDuration > 0 ? (session.durationSeconds / maxDuration) * 100 : 0;
  const title = session.title ?? m.sessions.untitled;

  return (
    <li className="group relative flex flex-col gap-2 border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-raised sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <Link
          href={`/sessions/${session.id}`}
          className="block truncate text-sm font-medium after:absolute after:inset-0 after:content-['']"
        >
          {title}
        </Link>
        {session.summary ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted">{session.summary}</p>
        ) : null}
      </div>

      <div className="flex w-full shrink-0 items-center gap-4 sm:w-auto">
        <div className="w-24">
          <div className="tabular text-xs font-medium">
            {formatDuration(session.durationSeconds, locale)}
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden bg-sunken">
            <div
              className="h-full bg-accent/70"
              style={{ width: `${Math.max(3, Math.min(100, share))}%` }}
            />
          </div>
        </div>

        <div className="tabular hidden w-36 text-xs text-faint md:block">
          {formatDateTime(session.createdAt, locale)}
        </div>

        <div className="w-20 shrink-0">
          {session.status === "active" ? (
            <span className="chip chip-ok">{m.sessions.live}</span>
          ) : (
            <span className="text-xs text-faint">{m.sessions.saved}</span>
          )}
        </div>

        {onDelete ? (
          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
            {confirming ? (
              <>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    setConfirming(false);
                    onDelete(session.id);
                  }}
                >
                  {m.common.delete}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirming(false)}
                >
                  {m.common.cancel}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm h-8 w-8 px-0 text-faint opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={m.sessions.deleteLabel(title)}
                onClick={() => setConfirming(true)}
              >
                <TrashIcon width={16} height={16} />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}
