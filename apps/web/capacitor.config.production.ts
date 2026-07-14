import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Production configuration for App Store and Google Play Store
 * Connects to production API endpoints
 * Use: npm run build && npx cap sync -c capacitor.config.production.ts
 */
const config: CapacitorConfig = {
  appId: 'com.bosch.cgr.portal',
  appName: 'CGR Portal',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://cgr.bosch.com',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      autoHide: true,
      fadeOutDuration: 300,
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
      title: 'CGR Portal',
      text: 'Check this out on CGR Portal',
    },
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  android: {
    buildOptions: {
      releaseType: 'AAB', // Bundle format for Google Play Store
      keystorePath: process.env.ANDROID_KEYSTORE_PATH,
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
      keystoreAlias: process.env.ANDROID_KEYSTORE_ALIAS,
      keystoreAliasPassword: process.env.ANDROID_KEYSTORE_ALIAS_PASSWORD,
    },
  },
};

export default config;
