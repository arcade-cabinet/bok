import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bok.builderstome',
  appName: 'Bok',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2c1e16',
    },
    ScreenOrientation: {
      // Defaults work fine — app handles this programmatically via CapacitorBridge
    },
  },
};

export default config;
