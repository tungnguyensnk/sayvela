"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSessions, deleteSession } from "@/hooks/useSessions";
import { useI18n } from "@/i18n/client";
import { SessionRow } from "@/components/sessions/SessionRow";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { ArrowLeftIcon, ArrowRightIcon, ListIcon } from "@/components/ui/icons";

const PAGE_SIZE = 20;

export function SessionList() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const { state, refresh } = useSessions(page, PAGE_SIZE);
  const { m } = useI18n();

  const items = useMemo(
    () => (state.kind === "ready" ? state.data.items : []),
    [state],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((session) =>
      `${session.title ?? ""} ${session.summary ?? ""}`.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const maxDuration = useMemo(
    () => filtered.reduce((max, session) => Math.max(max, session.durationSeconds), 0),
    [filtered],
  );

  async function handleDelete(id: string) {
    await deleteSession(id);
    refresh();
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div className="card flex flex-col gap-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <EmptyState
        icon={<ListIcon />}
        title={m.sessions.errorTitle}
        description={m.sessions.errorBody}
        action={
          <button type="button" onClick={refresh} className="btn btn-secondary">
            {m.common.retry}
          </button>
        }
      />
    );
  }

  const { total, limit } = state.data;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (total === 0) {
    return (
      <EmptyState
        icon={<ListIcon />}
        title={m.sessions.emptyTitle}
        description={m.sessions.emptyBody}
        action={
          <a
            href="https://sayvela.com/download"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            {m.sessions.emptyAction}
          </a>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex-1 sm:max-w-xs">
          <span className="sr-only">{m.sessions.filterLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.sessions.filterPlaceholder}
            className="field h-9 text-sm"
          />
        </label>
        <p className="tabular text-xs text-muted">
          {m.sessions.counts(filtered.length, items.length, total)}
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-line bg-raised px-5 py-2.5">
          <span className="eyebrow flex-1">{m.sessions.columns.session}</span>
          <span className="eyebrow w-24">{m.sessions.columns.duration}</span>
          <span className="eyebrow hidden w-36 md:block">{m.sessions.columns.started}</span>
          <span className="eyebrow w-20">{m.sessions.columns.status}</span>
          <span className="w-8" aria-hidden="true" />
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            {m.sessions.noMatch(query)}
          </p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                maxDuration={maxDuration}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeftIcon width={14} height={14} />
            {m.sessions.prev}
          </button>
          <span className="tabular text-xs text-muted">
            {m.sessions.pageOf(page, totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="btn btn-secondary btn-sm"
          >
            {m.sessions.next}
            <ArrowRightIcon width={14} height={14} />
          </button>
        </div>
      ) : null}

      <p className="text-xs text-faint">
        {m.sessions.retentionHint}{" "}
        <Link href="/settings/billing" className="text-accent hover:underline">
          {m.sessions.retentionLink}
        </Link>
      </p>
    </div>
  );
}
