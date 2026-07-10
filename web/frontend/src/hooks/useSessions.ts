"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

export type Session = {
  id: string;
  title: string | null;
  durationSeconds: number;
  status: string;
  summary: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SessionDetail = Session & {
  segments: {
    id: string;
    speaker: string | null;
    text: string;
    startMs: number;
    endMs: number;
    createdAt: string | null;
  }[];
};

type ListResult = {
  items: Session[];
  total: number;
  page: number;
  limit: number;
};

type SessionsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: ListResult }
  | { kind: "error"; message: string };

// hook to fetch paginated sessions list
export function useSessions(page = 1, limit = 20) {
  const [state, setState] = useState<SessionsState>({ kind: "idle" });
  const inFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState({ kind: "loading" });
    try {
      const res = await authFetch(`/api/proxy/sessions?page=${page}&limit=${limit}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed to load sessions");
      const data = (await res.json()) as ListResult;
      setState({ kind: "ready", data });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "error" });
    } finally {
      inFlightRef.current = false;
    }
  }, [page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, refresh: load };
}

// hook to fetch a single session with segments
export function useSessionDetail(id: string) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/proxy/sessions/${id}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<SessionDetail>;
      })
      .then((d) => {
        if (!cancelled) {
          setSession(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  return { session, loading, error };
}

// deletes a session by id and returns whether successful
export async function deleteSession(id: string) {
  const res = await authFetch(`/api/proxy/sessions/${id}`, { method: "DELETE" });
  return res.ok;
}
