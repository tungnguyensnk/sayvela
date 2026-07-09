import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { setPreference } from "../store/preferencesSlice";

export function usePreferenceActions(updateSetting) {
  const dispatch = useDispatch();

  const setAndSave = useCallback((key) => (value) => {
    dispatch(setPreference({ key, value }));
    updateSetting?.({ [key]: value });
  }, [dispatch, updateSetting]);

  return { setAndSave };
}
