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
    // Capacitor 8.6's SystemBars IME insets listener can double-resize
    // the Android WebView when viewport-fit=cover is active. The native
    // Activity uses adjustResize, so leave inset/keyboard resizing to Android.
    SystemBars: {
      insetsHandling: "disable",
      style: "LIGHT",
      hidden: false,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: false,
    },
  },
};

export default config;
