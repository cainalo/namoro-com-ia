import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.morados.app.capacitor",
  appName: "Morados",
  webDir: "dist-native",
  backgroundColor: "#F7EFDF",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      backgroundColor: "#0F4C5C",
      style: "LIGHT",
    },
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#0F4C5C",
      showSpinner: false,
    },
    // Restore the earlier Capacitor Android keyboard configuration.
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
