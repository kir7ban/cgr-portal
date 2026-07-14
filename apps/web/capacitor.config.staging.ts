import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Staging configuration for QA and internal testing
 * Connects to staging API endpoints
 * Use: npm run build:staging && npx cap sync -c capacitor.config.staging.ts
 */
const config: CapacitorConfig = {
  appId: 'com.bosch.cgr.portal.staging',
  appName: 'CGR Portal Staging',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://staging-cgr.bosch.internal',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.web'],
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
      title: 'CGR Portal Staging',
      text: 'Check this out on CGR Portal Staging',
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
