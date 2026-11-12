import { Capacitor, registerPlugin } from "@capacitor/core";

type DeviceSettingsPlugin = {
  openAppSettings(): Promise<void>;
};

const DeviceSettings = registerPlugin<DeviceSettingsPlugin>("DeviceSettings");

/**
 * Opens the Android application details page so a user can re-enable
 * camera/microphone permissions after choosing "Don't ask again".
 */
export async function openMoradosAppSettings() {
  if (!Capacitor.isNativePlatform()) return false;
  await DeviceSettings.openAppSettings();
  return true;
}
