export const selectAudioState = (state) => state.audio;
export const selectPreferencesState = (state) => state.preferences;
export const selectActiveTab = (state) => state.ui.activeTab;
export const selectContexts = (state) => state.contexts.items;
export const selectSessions = (state) => state.sessions.items;

export const selectActiveContextJson = (state) => {
  const id = state.preferences.loopbackContextId;
  if (!id) return undefined;
  return state.contexts.items.find((c) => c.id === id)?.contextJson ?? undefined;
};

export const selectActiveContextName = (state) => {
  const id = state.preferences.loopbackContextId;
  if (!id) return undefined;
  return state.contexts.items.find((c) => c.id === id)?.name ?? undefined;
};
