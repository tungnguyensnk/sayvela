"use client";

import { useSessionDetail } from "@/hooks/useSessions";

function msToTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// maps speaker identifier to a display label and color class
function speakerMeta(speaker?: string | null, source?: string | null) {
  if (!speaker || speaker === "me" || source === "mic") {
    return { label: "Bạn", color: "text-emerald-400/90" };
  }
  const num = parseInt(speaker, 10);
  if (!isNaN(num)) {
    const colors = ["text-sky-400/90", "text-violet-400/90", "text-amber-400/90", "text-rose-400/90"];
    return { label: `Speaker ${num + 1}`, color: colors[num % colors.length] };
  }
  return { label: speaker, color: "text-cyan-400/80" };
}

// renders session detail page with full transcript grouped by speaker
export function SessionDetail({ id }: { id: string }) {
  const { session, loading, error } = useSessionDetail(id);

  if (loading) {
    return (
      <div className="glass-panel h-64 animate-pulse" />
    );
  }

  if (error || !session) {
    return (
      <div className="glass-panel p-6 text-center text-white/55">
        Session not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel p-6 flex flex-col gap-2">
        <h1 className="text-xl font-bold text-white/90">
          {session.title ?? "Untitled session"}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-white/45 text-xs">
          <span>
            ⏱{" "}
            {session.durationSeconds >= 60
              ? `${Math.floor(session.durationSeconds / 60)}m ${session.durationSeconds % 60}s`
              : `${session.durationSeconds}s`}
          </span>
          {session.createdAt && (
            <span>
              {new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Ho_Chi_Minh",
              }).format(new Date(session.createdAt))}
            </span>
          )}
        </div>
        {session.summary && (
          <div className="mt-2 rounded-xl border border-white/8 bg-white/4 p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              Summary
            </p>
            <p className="text-sm text-white/75 leading-relaxed">{session.summary}</p>
          </div>
        )}
      </div>

      <div className="glass-panel p-4 flex flex-col gap-1">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 px-2">
          Transcript · {session.segments.length} segments
        </p>
        {session.segments.length === 0 ? (
          <p className="text-white/35 text-sm text-center py-8">No transcript segments.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pr-1">
            {session.segments.map((seg) => {
              const meta = speakerMeta(seg.speaker, (seg as Record<string, unknown>).source as string);
              return (
                <div
                  key={seg.id}
                  className="flex gap-3 rounded-lg px-3 py-2 hover:bg-white/4 transition-colors"
                >
                  <span className="shrink-0 text-[10px] text-white/30 pt-0.5 font-mono w-10">
                    {msToTime(seg.startMs)}
                  </span>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
                      {meta.label}
                    </span>
                    <p className="text-sm text-white/80 leading-relaxed">{seg.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
