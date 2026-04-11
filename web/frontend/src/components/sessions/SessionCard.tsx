"use client";

import Link from "next/link";
import type { Session } from "@/hooks/useSessions";

// formats duration in seconds to human-readable string (e.g. "5m 30s")
function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// formats ISO date string to locale date
function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

// renders a single session card with title, language, duration, date, and a link to detail
export function SessionCard({
  session,
  onDelete,
}: {
  session: Session;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="glass-panel group flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/sessions/${session.id}`}
          className="flex-1 truncate text-sm font-semibold text-white/90 hover:text-white transition-colors"
        >
          {session.title ?? "Untitled session"}
        </Link>
        {session.language && (
          <span className="glass-chip shrink-0 text-[10px] uppercase tracking-wider">
            {session.language}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-white/45 text-xs">
        <span>⏱ {formatDuration(session.durationSeconds)}</span>
        <span>·</span>
        <span>{formatDate(session.createdAt)}</span>
        {session.status === "active" && (
          <>
            <span>·</span>
            <span className="text-emerald-400">live</span>
          </>
        )}
      </div>

      {session.summary && (
        <p className="mt-1 line-clamp-2 text-xs text-white/55 leading-relaxed">
          {session.summary}
        </p>
      )}

      <div className="flex items-center justify-between mt-1">
        <Link
          href={`/sessions/${session.id}`}
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          View transcript →
        </Link>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(session.id)}
            className="text-xs text-white/30 hover:text-red-400 transition-colors"
          >
            delete
          </button>
        )}
      </div>
    </div>
  );
}
