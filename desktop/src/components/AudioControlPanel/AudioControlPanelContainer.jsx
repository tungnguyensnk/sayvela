import { useDispatch, useSelector } from "react-redux";
import { usePreferenceActions } from "../../hooks/usePreferenceActions";
import { setActiveTab } from "../../store/uiSlice";
import { selectActiveContextJson, selectAudioState, selectContexts, selectPreferencesState } from "../../store/selectors";
import { AudioControlPanel } from ".";

export function AudioControlPanelContainer({ loopbackError, micError, onRefreshDevices, updateSetting }) {
  const dispatch = useDispatch();
  const audio = useSelector(selectAudioState);
  const preferences = useSelector(selectPreferencesState);
  const contexts = useSelector(selectContexts);
  const loopbackContext = useSelector(selectActiveContextJson);
  const { setAndSave } = usePreferenceActions(updateSetting);

  return (
    <AudioControlPanel
      {...audio}
      {...preferences}
      contexts={contexts}
      loopbackContext={loopbackContext}
      onChangeLoopbackDeviceId={setAndSave("loopbackDeviceId")}
      onChangeLoopbackContext={() => dispatch(setActiveTab("contexts"))}
      onChangeLoopbackContextId={setAndSave("loopbackContextId")}
      onChangeMicDeviceId={setAndSave("micDeviceId")}
      onChangeContentProtectionEnabled={setAndSave("contentProtectionEnabled")}
      onRefreshDevices={onRefreshDevices}
      onChangeLoopbackInputLangs={setAndSave("loopbackInputLangs")}
      onChangeLoopbackOutputLang={setAndSave("loopbackOutputLang")}
      onChangeMicInputLangs={setAndSave("micInputLangs")}
      onChangeMicOutputLang={setAndSave("micOutputLang")}
      onChangeMicTtsEnabled={setAndSave("micTtsEnabled")}
      onChangeMicTtsVoiceId={setAndSave("micTtsVoiceId")}
      onChangeMicTtsRate={setAndSave("micTtsRate")}
      onChangeMicTtsPitch={setAndSave("micTtsPitch")}
      onChangeMicTtsVolume={setAndSave("micTtsVolume")}
      onChangeMicTtsOutputDeviceId={setAndSave("micTtsOutputDeviceId")}
      loopbackError={loopbackError}
      micError={micError}
    />
  );
}
