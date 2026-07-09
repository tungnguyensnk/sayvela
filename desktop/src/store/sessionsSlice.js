import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { deleteSession, listSessions } from "../services/apiClient";

const initialState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchSessionsThunk = createAsyncThunk("sessions/fetch", async () => {
  const data = await listSessions(1, 50);
  return data?.items ?? [];
});

export const deleteSessionThunk = createAsyncThunk("sessions/delete", async (id) => {
  await deleteSession(id);
  return id;
});

const sessionsSlice = createSlice({
  name: "sessions",
  initialState,
  reducers: {
    clearSessions: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessionsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSessionsThunk.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchSessionsThunk.rejected, (state, action) => { state.loading = false; state.error = action.error.message || "failed to load sessions"; })
      .addCase(deleteSessionThunk.fulfilled, (state, action) => { state.items = state.items.filter((s) => s.id !== action.payload); });
  },
});

export const { clearSessions } = sessionsSlice.actions;
export default sessionsSlice.reducer;
