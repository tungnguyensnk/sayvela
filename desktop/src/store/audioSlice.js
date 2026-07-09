import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  devices: [],
  devicesError: "",
  running: false,
  loopbackBytes: 0,
  micBytes: 0,
  loopbackCaptureState: null,
  micCaptureState: null,
};

const audioSlice = createSlice({
  name: "audio",
  initialState,
  reducers: {
    setDevices: (state, action) => { state.devices = action.payload; },
    setDevicesError: (state, action) => { state.devicesError = action.payload; },
    setRunning: (state, action) => { state.running = action.payload; },
    resetBytes: (state) => { state.loopbackBytes = 0; state.micBytes = 0; },
    addLoopbackBytes: (state, action) => { state.loopbackBytes += action.payload; },
    addMicBytes: (state, action) => { state.micBytes += action.payload; },
    setLoopbackCaptureState: (state, action) => { state.loopbackCaptureState = action.payload; },
    setMicCaptureState: (state, action) => { state.micCaptureState = action.payload; },
  },
});

export const { setDevices, setDevicesError, setRunning, resetBytes, addLoopbackBytes, addMicBytes, setLoopbackCaptureState, setMicCaptureState } = audioSlice.actions;
export default audioSlice.reducer;
