import { useMemo, useReducer } from "react";

const initialState = {
  status: "idle",
  error: null,
  startedAt: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "QUOTA_CHECKING":
      return { ...state, status: "checkingQuota", error: null };
    case "STARTING":
      return { ...state, status: "starting", error: null, startedAt: Date.now() };
    case "STARTED":
      return { ...state, status: "running", error: null };
    case "STOPPING":
      return { ...state, status: "stopping" };
    case "SYNCING":
      return { ...state, status: "syncing" };
    case "SYNCED":
      return { ...state, status: "synced", error: null };
    case "FAILED":
      return { ...state, status: "failed", error: action.error ?? "failed" };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useRecorderMachine() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const derived = useMemo(() => ({
    isRunning: ["checkingQuota", "starting", "running"].includes(state.status),
    canStart: ["idle", "failed", "synced"].includes(state.status),
    canStop: ["starting", "running"].includes(state.status),
  }), [state.status]);

  return { state, dispatch, ...derived };
}
