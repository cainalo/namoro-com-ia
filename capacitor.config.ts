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
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#0F4C5C",
      showSpinner: false,
    },
    Keyboard: {
      resize: "native",
    },
    SystemBars: {
      style: "DARK",
      hidden: true,
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
