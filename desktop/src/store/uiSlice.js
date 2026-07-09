import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeTab: null,
  quotaExceeded: false,
  syncStatus: null,
  sessionElapsed: 0,
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
  },
});

export const { setActiveTab, setQuotaExceeded, setSyncStatus, setSessionElapsed, resetSessionElapsed } = uiSlice.actions;
export default uiSlice.reducer;
