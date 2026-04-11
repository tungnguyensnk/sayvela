"use client";

import Link from "next/link";
import { useSessions } from "@/hooks/useSessions";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

// renders the 5 most recent sessions as a compact list
export function RecentSessions() {
  const { state } = useSessions(1, 5);

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div className="glass-panel p-6 flex flex-col gap-3">
        <p className="text-xs text-white/50 uppercase tracking-wider">Recent Sessions</p>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-white/4 animate-pulse" />
        ))}
      </div>
    );
  }

  if (state.kind !== "ready") return null;

  const { items } = state.data;

  return (
    <div className="glass-panel p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50 uppercase tracking-wider">Recent Sessions</p>
        <Link href="/sessions" className="text-xs text-sky-400 hover:text-sky-300">
          View all →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-white/35 text-sm py-4 text-center">No sessions yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/6">
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="flex items-center justify-between py-3 hover:text-white/90 transition-colors group"
            >
              <span className="truncate text-sm text-white/75 group-hover:text-white/90">
                {s.title ?? "Untitled session"}
              </span>
              <span className="shrink-0 text-xs text-white/35 ml-4">{formatDate(s.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
