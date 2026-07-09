import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { createContext, deleteContext, listContexts, updateContext } from "../services/apiClient";

const initialState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchContextsThunk = createAsyncThunk("contexts/fetch", async () => {
  const data = await listContexts();
  return Array.isArray(data) ? data : [];
});

export const createContextThunk = createAsyncThunk("contexts/create", createContext);

export const updateContextThunk = createAsyncThunk("contexts/update", async ({ id, payload }) => updateContext(id, payload));

export const deleteContextThunk = createAsyncThunk("contexts/delete", async (id) => {
  await deleteContext(id);
  return id;
});

const contextsSlice = createSlice({
  name: "contexts",
  initialState,
  reducers: {
    clearContexts: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContextsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchContextsThunk.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchContextsThunk.rejected, (state, action) => { state.loading = false; state.error = action.error.message || "failed to load contexts"; })
      .addCase(createContextThunk.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateContextThunk.fulfilled, (state, action) => { state.items = state.items.map((c) => (c.id === action.payload.id ? action.payload : c)); })
      .addCase(deleteContextThunk.fulfilled, (state, action) => { state.items = state.items.filter((c) => c.id !== action.payload); });
  },
});

export const { clearContexts } = contextsSlice.actions;
export default contextsSlice.reducer;
