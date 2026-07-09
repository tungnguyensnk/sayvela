import { configureStore } from "@reduxjs/toolkit";
import audioReducer from "./audioSlice";
import contextsReducer from "./contextsSlice";
import preferencesReducer from "./preferencesSlice";
import sessionsReducer from "./sessionsSlice";
import uiReducer from "./uiSlice";

export const store = configureStore({
  reducer: {
    audio: audioReducer,
    contexts: contextsReducer,
    preferences: preferencesReducer,
    sessions: sessionsReducer,
    ui: uiReducer,
  },
});
