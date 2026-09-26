import { useDispatch, useSelector } from "react-redux";
import { usePreferenceActions } from "../../hooks/usePreferenceActions";
import { setActiveTab } from "../../store/uiSlice";
import { selectActiveContextJson, selectAudioState, selectContexts, selectPreferencesState } from "../../store/selectors";
import { AudioControlPanel } from ".";

export function AudioControlPanelContainer({ loopbackError, micError, camError, onRefreshDevices, updateSetting }) {
  const dispatch = useDispatch();
  const audio = useSelector(selectAudioState);
  const preferences = useSelector(selectPreferencesState);
  const contexts = useSelector(selectContexts);
  const loopbackContext = useSelector(selectActiveContextJson);
  const { setAndSave } = usePreferenceActions(updateSetting);

  const assistKeys = [
    "assistAutoGate",
    "assistSendScreenshot",
    "assistMonitorId",
    "assistHotkey",
    "assistIntervalSec",
    "assistWindowSec",
    "assistMinGapSec",
    "assistIdleExitSec",
  ];
  const assistValues = Object.fromEntries(assistKeys.map((k) => [k, preferences[k]]));
  const assistHandlers = Object.fromEntries(assistKeys.map((k) => [k, setAndSave(k)]));

  return (
    <AudioControlPanel
      assistValues={assistValues}
      assistHandlers={assistHandlers}
      {...audio}
      {...preferences}
      contexts={contexts}
      loopbackContext={loopbackContext}
      onChangeLoopbackDeviceId={setAndSave("loopbackDeviceId")}
      onChangeLoopbackContext={() => dispatch(setActiveTab("contexts"))}
      onChangeLoopbackContextId={setAndSave("loopbackContextId")}
      onChangeMicDeviceId={setAndSave("micDeviceId")}
      onChangeContentProtectionEnabled={setAndSave("contentProtectionEnabled")}
      onChangeAppDisguise={setAndSave("appDisguise")}
      onRefreshDevices={onRefreshDevices}
      onChangeLoopbackInputLangs={setAndSave("loopbackInputLangs")}
      onChangeLoopbackOutputLang={setAndSave("loopbackOutputLang")}
      onChangeMicInputLangs={setAndSave("micInputLangs")}
      onChangeMicOutputLang={setAndSave("micOutputLang")}
      onChangeMicTtsEnabled={setAndSave("micTtsEnabled")}
      onChangeMicTtsProvider={setAndSave("micTtsProvider")}
      onChangeMicTtsVoiceIds={setAndSave("micTtsVoiceIds")}
      onChangeMicTtsSonioxSpeed={setAndSave("micTtsSonioxSpeed")}
      onChangeMicTtsRate={setAndSave("micTtsRate")}
      onChangeMicTtsPitch={setAndSave("micTtsPitch")}
      onChangeMicTtsVolume={setAndSave("micTtsVolume")}
      onChangeMicTtsSonioxVolume={setAndSave("micTtsSonioxVolume")}
      onChangeMicTtsOutputDeviceId={setAndSave("micTtsOutputDeviceId")}
      onChangeMicPassthroughHotkey={setAndSave("micPassthroughHotkey")}
      onChangeCamDelayEnabled={setAndSave("camDelayEnabled")}
      onChangeCamDeviceName={setAndSave("camDeviceName")}
      onChangeCamDelayMs={setAndSave("camDelayMs")}
      onChangeCamScalePercent={setAndSave("camScalePercent")}
      onChangeCamFps={setAndSave("camFps")}
      loopbackError={loopbackError}
      micError={micError}
      camError={camError}
    />
  );
}
