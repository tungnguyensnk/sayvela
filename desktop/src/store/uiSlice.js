import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeTab: null,
  quotaExceeded: false,
  syncStatus: null,
  sessionElapsed: 0,
  miniMode: false,
  alwaysOnTop: false,
  clickThrough: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveTab: (state, action) => { state.activeTab = action.payload; },
    setQuotaExceeded: (state, action) => { state.quotaExceeded = action.payload; },
    setSyncStatus: (state, action) => { state.syncStatus = action.payload; },
    setSessionElapsed: (state, action) => { state.sessionElapsed = action.payload; },
    resetSessionElapsed: (state) => { state.sessionElapsed = 0; },
    setMiniMode: (state, action) => { state.miniMode = Boolean(action.payload); },
    setAlwaysOnTop: (state, action) => { state.alwaysOnTop = Boolean(action.payload); },
    setClickThrough: (state, action) => { state.clickThrough = Boolean(action.payload); },
  },
});

export const {
  setActiveTab,
  setQuotaExceeded,
  setSyncStatus,
  setSessionElapsed,
  resetSessionElapsed,
  setMiniMode,
  setAlwaysOnTop,
  setClickThrough,
} = uiSlice.actions;
export default uiSlice.reducer;
