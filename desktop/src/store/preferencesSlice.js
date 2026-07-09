import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_PREFERENCES, mergePreferences } from "../config/defaultPreferences";

const initialState = DEFAULT_PREFERENCES;

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    hydratePreferences: (state, action) => mergePreferences(action.payload),
    setPreference: (state, action) => { state[action.payload.key] = action.payload.value; },
  },
});

export const { hydratePreferences, setPreference } = preferencesSlice.actions;
export default preferencesSlice.reducer;
