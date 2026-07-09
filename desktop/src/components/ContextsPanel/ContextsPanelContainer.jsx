import { useDispatch, useSelector } from "react-redux";
import { usePreferenceActions } from "../../hooks/usePreferenceActions";
import { createContextThunk, deleteContextThunk, updateContextThunk } from "../../store/contextsSlice";
import { selectPreferencesState } from "../../store/selectors";
import { ContextsPanel } from ".";

export function ContextsPanelContainer({ updateSetting }) {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.contexts);
  const { loopbackContextId } = useSelector(selectPreferencesState);
  const { setAndSave } = usePreferenceActions(updateSetting);
  const selectContext = setAndSave("loopbackContextId");

  const remove = async (id) => {
    await dispatch(deleteContextThunk(id)).unwrap();
    if (loopbackContextId === id) selectContext(null);
  };

  return (
    <ContextsPanel
      contexts={items}
      loading={loading}
      onAdd={(payload) => dispatch(createContextThunk(payload)).unwrap()}
      onEdit={(id, payload) => dispatch(updateContextThunk({ id, payload })).unwrap()}
      onRemove={remove}
      selectedId={loopbackContextId}
      onSelect={selectContext}
    />
  );
}
