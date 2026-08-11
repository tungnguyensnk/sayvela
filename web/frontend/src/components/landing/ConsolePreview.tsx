"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { MicIcon, ShieldIcon, SpeakerIcon } from "@/components/ui/icons";

type Turn = {
  channel: "system" | "mic";
  speakerIndex: number | null;
  source: string;
  target: string;
};

/** Một lát cắt của cuộc họp song ngữ thật: đúng việc sản phẩm làm, trong bốn lượt. */
const SCRIPT: Turn[] = [
  {
    channel: "system",
    speakerIndex: 1,
    source: "会議メモの翻訳をすぐに共有します。",
    target: "I'll share the translated meeting notes right away.",
  },
  {
    channel: "mic",
    speakerIndex: null,
    source: "Could you send the deck as well?",
    target: "デッキも送っていただけますか。",
  },
  {
    channel: "system",
    speakerIndex: 2,
    source: "はい、今日中にお送りします。",
    target: "Sure, I'll send it before the end of today.",
  },
  {
    channel: "mic",
    speakerIndex: null,
    source: "Perfect — let's review it tomorrow morning.",
    target: "了解です。明日の朝レビューしましょう。",
  },
];

const VISIBLE = 3;

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function readToken(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Đo mức hai làn: âm thanh hệ thống phía trên, micro phía dưới. */
function LevelMeter({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let raf = 0;
    let colours = { sys: "#1f3f66", mic: "#935c11", line: "#d1d6cb" };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const mid = h / 2;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = colours.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(mid) + 0.5);
      ctx.lineTo(w, Math.round(mid) + 0.5);
      ctx.stroke();

      const barW = 2;
      const gap = 3;
      const count = Math.floor(w / (barW + gap));

      for (let i = 0; i < count; i += 1) {
        const x = i * (barW + gap);
        // biên độ tiền định để mọi lần tải trông giống nhau
        const env = 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + Math.cos(i * 0.31)));
        ctx.globalAlpha = 0.3 + 0.7 * (i / count);

        const sys = env * (0.3 + 0.7 * Math.abs(Math.sin(i * 0.22 + t * 1.6)));
        ctx.fillStyle = colours.sys;
        const sysH = Math.max(1.5, sys * (mid - 4));
        ctx.fillRect(x, mid - 3 - sysH, barW, sysH);

        const mic = env * (0.18 + 0.5 * Math.abs(Math.sin(i * 0.31 - t * 1.2 + 1.1)));
        ctx.fillStyle = colours.mic;
        const micH = Math.max(1.5, mic * (mid - 4));
        ctx.fillRect(x, mid + 3, barW, micH);
      }
      ctx.globalAlpha = 1;
    };

    const refreshColours = () => {
      colours = {
        sys: readToken("--sys", colours.sys),
        mic: readToken("--mic", colours.mic),
        line: readToken("--line", colours.line),
      };
    };

    const loop = () => {
      if (frame % 30 === 0) refreshColours();
      draw(frame / 60);
      frame += 1;
      raf = requestAnimationFrame(loop);
    };

    resize();
    refreshColours();

    if (reduceMotion) {
      draw(0.8);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      resize();
      draw(frame / 60);
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="h-20 w-full" role="img" aria-label={label} />;
}

export function ConsolePreview() {
  const { m } = useI18n();
  const c = m.landing.console;
  const [cursor, setCursor] = useState(VISIBLE);
  const [elapsed, setElapsed] = useState(252);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const advance = window.setInterval(() => setCursor((value) => value + 1), 3400);
    const clock = window.setInterval(() => setElapsed((value) => value + 1), 1000);

    return () => {
      window.clearInterval(advance);
      window.clearInterval(clock);
    };
  }, []);

  const turns = Array.from({ length: VISIBLE }, (_, i) => {
    const index = (cursor - VISIBLE + i + SCRIPT.length * 4) % SCRIPT.length;
    return { ...SCRIPT[index], key: `${cursor}-${i}` };
  });

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-raised px-4 py-2">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping bg-ok opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 bg-ok" />
          </span>
          <span className="eyebrow text-ok">{c.live}</span>
        </span>
        <span className="eyebrow text-ai">JA → EN</span>
        <span className="tabular text-xs text-muted">{formatClock(elapsed)}</span>
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-[0.7rem] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 bg-sys" />
            {c.system}
          </span>
          <span className="inline-flex items-center gap-1.5">
            {c.mic}
            <span className="h-2 w-2 bg-mic" />
          </span>
        </div>
        <LevelMeter label={c.meterAlt} />
      </div>

      <div className="flex flex-col border-t border-line">
        {turns.map((turn) => (
          <div
            key={turn.key}
            className="grid grid-cols-[2px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <span
              className={turn.channel === "mic" ? "bg-mic" : "bg-sys"}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`eyebrow ${turn.channel === "mic" ? "text-mic" : "text-sys"}`}
                >
                  {turn.speakerIndex ? c.speaker(turn.speakerIndex) : c.you}
                </span>
                <span className="tabular text-[0.65rem] text-faint">
                  {turn.channel === "mic" ? c.channelMic : c.channelSystem}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-ink">{turn.source}</p>
              <p className="mt-0.5 truncate text-sm text-muted">{turn.target}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-raised px-4 py-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <SpeakerIcon width={14} height={14} /> {c.tts}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MicIcon width={14} height={14} /> {c.dual}
        </span>
        <span className="inline-flex items-center gap-1.5 text-ok">
          <ShieldIcon width={14} height={14} /> {c.protection}
        </span>
      </div>
    </div>
  );
}
