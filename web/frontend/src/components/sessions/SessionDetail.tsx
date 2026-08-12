"use client";

import { useMemo, useState } from "react";
import { useSessionDetail, type SessionSegment } from "@/hooks/useSessions";
import { useI18n } from "@/i18n/client";
import { formatDateTime, formatDuration, formatTimecode } from "@/lib/format";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { CheckIcon, CopyIcon, ListIcon } from "@/components/ui/icons";

const LANE = [
  { text: "text-mic", bar: "bg-mic" },
  { text: "text-sys", bar: "bg-sys" },
  { text: "text-warn", bar: "bg-warn" },
  { text: "text-crit", bar: "bg-crit" },
];

/** an original turn plus the translations derived from it */
type Turn = { original: SessionSegment; translations: SessionSegment[] };

// translated segments carry no timing of their own, so they are attached to their
// original instead of being sorted as standalone turns at 00:00
function toTurns(segments: SessionSegment[]): Turn[] {
  const known = new Set(segments.map((segment) => segment.id));
  const byOriginal = new Map<string, Turn>();
  const turns: Turn[] = [];

  for (const segment of segments) {
    if (segment.originId && known.has(segment.originId)) continue;
    const turn: Turn = { original: segment, translations: [] };
    byOriginal.set(segment.id, turn);
    turns.push(turn);
  }

  for (const segment of segments) {
    if (!segment.originId) continue;
    byOriginal.get(segment.originId)?.translations.push(segment);
  }

  return turns.sort((a, b) => a.original.startMs - b.original.startMs);
}

export function SessionDetail({ id }: { id: string }) {
  const { session, loading, error } = useSessionDetail(id);
  const { locale, m } = useI18n();
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const segments = useMemo(() => session?.segments ?? [], [session]);
  const turns = useMemo(() => toTurns(segments), [segments]);

  const speakerMeta = useMemo(
    () => (speaker?: string | null, source?: string | null) => {
      if (!speaker || speaker === "me" || source === "mic") {
        return { label: m.sessions.detail.you, ...LANE[0] };
      }
      const index = Number.parseInt(speaker, 10);
      if (!Number.isNaN(index)) {
        return {
          label: m.sessions.detail.speaker(index + 1),
          ...LANE[(index + 1) % LANE.length],
        };
      }
      return { label: speaker, ...LANE[1] };
    },
    [m],
  );

  const speakers = useMemo(() => {
    const seen = new Map<string, { label: string; text: string; bar: string }>();
    for (const turn of turns) {
      const meta = speakerMeta(turn.original.speaker, turn.original.source);
      if (!seen.has(meta.label)) seen.set(meta.label, meta);
    }
    return [...seen.values()];
  }, [turns, speakerMeta]);

  const visible = activeSpeaker
    ? turns.filter(
        (turn) => speakerMeta(turn.original.speaker, turn.original.source).label === activeSpeaker,
      )
    : turns;

  async function copyTranscript() {
    const text = turns
      .flatMap((turn) => {
        const meta = speakerMeta(turn.original.speaker, turn.original.source);
        return [
          `[${formatTimecode(turn.original.startMs)}] ${meta.label}: ${turn.original.text}`,
          ...turn.translations.map(
            (translation) =>
              `    ${translation.language ? `${translation.language}: ` : ""}${translation.text}`,
          ),
        ];
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <EmptyState
        icon={<ListIcon />}
        title={m.sessions.detail.notFoundTitle}
        description={m.sessions.detail.notFoundBody}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl">{session.title ?? m.sessions.untitled}</h1>
            <div className="tabular mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span>{formatDuration(session.durationSeconds, locale)}</span>
              <span className="text-faint">·</span>
              <span>{formatDateTime(session.createdAt, locale)}</span>
              <span className="text-faint">·</span>
              <span>{m.sessions.detail.segments(turns.length)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={copyTranscript}
            disabled={segments.length === 0}
          >
            {copied ? <CheckIcon width={15} height={15} /> : <CopyIcon width={15} height={15} />}
            {copied ? m.sessions.detail.copied : m.sessions.detail.copy}
          </button>
        </div>

        {session.summary ? (
          <div className="card-inset mt-5 p-4">
            <div className="eyebrow">{m.sessions.detail.summary}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{session.summary}</p>
          </div>
        ) : null}
      </header>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-raised px-5 py-3">
          <h2 className="font-display text-sm font-semibold">
            {m.sessions.detail.transcript}
          </h2>
          {speakers.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSpeaker(null)}
                className={`chip ${activeSpeaker === null ? "chip-accent" : ""}`}
                aria-pressed={activeSpeaker === null}
              >
                {m.sessions.detail.all}
              </button>
              {speakers.map((speaker) => (
                <button
                  key={speaker.label}
                  type="button"
                  onClick={() =>
                    setActiveSpeaker(activeSpeaker === speaker.label ? null : speaker.label)
                  }
                  aria-pressed={activeSpeaker === speaker.label}
                  className={`chip ${
                    activeSpeaker === speaker.label ? "border-line-strong text-ink" : ""
                  }`}
                >
                  <span className={`h-1.5 w-1.5 ${speaker.bar}`} />
                  {speaker.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-muted">
            {m.sessions.detail.emptyTranscript}
          </p>
        ) : (
          <ol className="max-h-[62vh] overflow-y-auto">
            {visible.map((turn) => {
              const meta = speakerMeta(turn.original.speaker, turn.original.source);
              return (
                <li
                  key={turn.original.id}
                  className="flex gap-3 border-b border-line px-5 py-3 last:border-b-0 hover:bg-raised"
                >
                  <span className="tabular w-11 shrink-0 pt-0.5 text-[0.7rem] text-faint">
                    {formatTimecode(turn.original.startMs)}
                  </span>
                  <span aria-hidden="true" className={`w-0.5 shrink-0 ${meta.bar}`} />
                  <div className="min-w-0 flex-1">
                    <span className={`eyebrow ${meta.text}`}>{meta.label}</span>
                    <p className="mt-1 text-sm leading-6">{turn.original.text}</p>
                    {turn.translations.map((translation) => (
                      <p
                        key={translation.id}
                        className="mt-1 flex gap-2 text-sm leading-6 text-muted"
                      >
                        {translation.language ? (
                          <span className="eyebrow shrink-0 pt-1 text-faint">
                            {translation.language}
                          </span>
                        ) : null}
                        <span className="min-w-0">{translation.text}</span>
                      </p>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
