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
    // Use the Capacitor 8 native insets owner for Android 15/16. Do not
    // disable this: the SystemBars plugin must coordinate WebView and IME.
    // native mode avoids injecting CSS variables and keeps the native WebView
    // responsible for safe-area layout on modern Chromium.
    SystemBars: {
      insetsHandling: "native",
      style: "LIGHT",
      hidden: false,
    },
  },
};

export default config;
