import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.royola.chat',
  appName: 'Royola',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      // Đẩy giao diện lên khi bàn phím xuất hiện thay vì resize
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
  android: {
    // Cho phép WebRTC hoạt động trong WebView
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: "#0f172a",
  },
  server: {
    androidScheme: 'https',
    hostname: 'app',
    cleartext: false,
  },
};

export default config;
