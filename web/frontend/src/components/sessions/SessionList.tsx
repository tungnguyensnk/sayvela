"use client";

import { useState } from "react";
import { useSessions, deleteSession } from "@/hooks/useSessions";
import { SessionCard } from "./SessionCard";

// renders a paginated list of sessions with delete support
export function SessionList() {
  const [page, setPage] = useState(1);
  const { state, refresh } = useSessions(page, 20);

  async function handleDelete(id: string) {
    if (!confirm("Delete this session?")) return;
    await deleteSession(id);
    refresh();
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-panel h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="glass-panel p-6 text-center text-white/55">
        <p>Failed to load sessions.</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 text-sm text-sky-400 hover:text-sky-300"
        >
          Try again
        </button>
      </div>
    );
  }

  const { items, total, limit } = state.data;
  const totalPages = Math.ceil(total / limit);

  if (items.length === 0) {
    return (
      <div className="glass-panel p-10 text-center">
        <p className="text-white/45 text-sm">No sessions yet.</p>
        <p className="text-white/30 text-xs mt-2">
          Start a session in the desktop app to see your transcripts here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <SessionCard key={s.id} session={s} onDelete={handleDelete} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="glass-button text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-white/45 text-sm">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="glass-button text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
