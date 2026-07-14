import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Development configuration for local testing and QA
 * Use: npm run build:dev && npx cap sync
 */
const config: CapacitorConfig = {
  appId: 'com.bosch.cgr.portal.dev',
  appName: 'CGR Portal Dev',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    url: 'http://192.168.x.x:3001', // Replace with your machine IP for live reload
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      permissions: ['photos', 'videos'],
    },
    Filesystem: {
      directory: 'Documents',
    },
    Network: {
      permissions: ['internet', 'network'],
    },
    Share: {
      title: 'CGR Portal Dev',
      text: 'Check this out on CGR Portal Dev',
    },
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
};

export default config;
