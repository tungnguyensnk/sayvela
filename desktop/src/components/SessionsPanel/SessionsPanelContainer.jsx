import { useDispatch, useSelector } from "react-redux";
import { deleteSessionThunk, fetchSessionsThunk } from "../../store/sessionsSlice";
import { SessionsPanel } from ".";

export function SessionsPanelContainer() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.sessions);

  return (
    <SessionsPanel
      sessions={items}
      loading={loading}
      error={error}
      onDelete={(id) => dispatch(deleteSessionThunk(id)).unwrap()}
      onRefresh={() => dispatch(fetchSessionsThunk())}
    />
  );
}
