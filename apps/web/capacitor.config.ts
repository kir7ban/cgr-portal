import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bosch.cgr.portal',
  appName: 'CGR Portal',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
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
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
  },
};

export default config;
