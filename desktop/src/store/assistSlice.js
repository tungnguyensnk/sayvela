import { createSlice } from "@reduxjs/toolkit";
import { FRAME_TOOLS, MAX_SLOTS, pickSlot } from "../ai/autoAssist";

const initialState = {
  status: "off", // off | watching | assisting
  slots: Array(MAX_SLOTS).fill(null),
  frames: {}, // kind -> { items: [], updatedAt }
  pending: false,
  lastGateAt: 0,
  error: "",
  hotkeyError: "",
  hotkeyPaused: false,
};

function dropKind(state, kind) {
  delete state.frames[kind];
  state.slots = state.slots.map((s) => (s === kind ? null : s));
}

const assistSlice = createSlice({
  name: "assist",
  initialState,
  reducers: {
    setStatus: (state, action) => {
      state.status = action.payload;
      if (action.payload === "off") {
        state.slots = Array(MAX_SLOTS).fill(null);
        state.frames = {};
        state.pending = false;
      }
    },
    setPending: (state, action) => { state.pending = action.payload; },
    setLastGateAt: (state, action) => { state.lastGateAt = action.payload; },
    setError: (state, action) => { state.error = action.payload || ""; },
    setHotkeyError: (state, action) => { state.hotkeyError = action.payload || ""; },
    setHotkeyPaused: (state, action) => { state.hotkeyPaused = Boolean(action.payload); },

    // applies one tool call emitted by the assist model
    applyToolCall: (state, action) => {
      const { name, args, id, createdAt } = action.payload;
      if (name === "finish") {
        state.slots = Array(MAX_SLOTS).fill(null);
        state.frames = {};
        state.status = "watching";
        return;
      }
      if (name === "close_frame") {
        dropKind(state, args?.kind);
        return;
      }
      const kind = FRAME_TOOLS[name];
      if (!kind) return;
      const slot = pickSlot(state.slots, state.frames, kind);
      const replaced = state.slots[slot];
      if (replaced && replaced !== kind) delete state.frames[replaced];
      state.slots[slot] = kind;
      const frame = state.frames[kind] ?? { items: [] };
      frame.items = [{ id, createdAt, ...args }, ...frame.items].slice(0, 10);
      frame.updatedAt = createdAt;
      state.frames[kind] = frame;
    },

    closeFrame: (state, action) => { dropKind(state, action.payload); },
    resetAssist: () => initialState,
  },
});

export const {
  setStatus,
  setHotkeyError,
  setHotkeyPaused,
  setPending,
  setLastGateAt,
  setError,
  applyToolCall,
  closeFrame,
  resetAssist,
} = assistSlice.actions;
export default assistSlice.reducer;
