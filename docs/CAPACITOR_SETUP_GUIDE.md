# Capacitor Setup Guide for CGR Portal

This guide covers iOS/Android setup and configuration for the CGR Portal mobile app using Capacitor.

## Overview

CGR Portal uses Capacitor to wrap the React web application for native iOS and Android distribution. The mobile app is consumption-only (read-only) for employees, with full content creation and governance restricted to web browsers.

**Architecture Decision:** [ADR 0001 - Web-First (React + Capacitor)](./adr/0001-web-first-capacitor-over-react-native.md)

## Prerequisites

### System Requirements

#### macOS (for iOS development)
- Xcode 15.0 or later
- Xcode Command Line Tools
- CocoaPods 1.13.0+
- Node.js 18.0+
- Capacitor CLI 6.0.0+

#### Windows/Mac (for Android development)
- Android Studio (latest)
- JDK 11 or 17
- Node.js 18.0+
- Capacitor CLI 6.0.0+

### Bosch-Specific Requirements
- Azure credentials for app distribution
- Signing certificates for iOS App Store and Google Play Store
- Bosch internal network access for API endpoints

## Installation & Initialization

### 1. Install Capacitor CLI and Dependencies

```bash
cd apps/web
npm install
npm install @capacitor/cli @capacitor/core
```

### 2. Initialize Capacitor Project

```bash
npx cap init
```

Follow the prompts:
- **App name:** CGR Portal
- **App Package ID:** com.bosch.cgr.portal
- **Web asset directory:** dist

The `capacitor.config.ts` file is already configured at `apps/web/capacitor.config.ts`.

### 3. Add iOS and Android Platforms

#### iOS Setup
```bash
npm run cap:add:ios
```

This creates the `ios` directory with the native Xcode project.

**Post-installation steps:**
1. Open the iOS project:
   ```bash
   npm run cap:open:ios
   ```
2. In Xcode, select the CGRPortal target
3. Go to **Signing & Capabilities**
4. Set Team ID and Bundle Identifier to match Apple Developer account
5. Configure capabilities:
   - Push Notifications
   - Network Extension (for offline support)
   - Camera (if photo upload is enabled)

#### Android Setup
```bash
npm run cap:add:android
```

This creates the `android` directory with the native Android project.

**Post-installation steps:**
1. Open the Android project:
   ```bash
   npm run cap:open:android
   ```
2. In Android Studio, go to **File > Project Structure**
3. Set the correct SDK versions:
   - Minimum SDK: 24 (Android 7.0)
   - Target SDK: 34 (Android 14)
   - Compile SDK: 34
4. Configure signing:
   - Go to **Build > Generate Signed Bundle / APK**
   - Set up keystore for production releases

## Configuration Details

### capacitor.config.ts

Key configurations for both platforms:

```typescript
{
  appId: 'com.bosch.cgr.portal',           // Unique app identifier
  appName: 'CGR Portal',                   // Display name
  webDir: 'dist',                          // Built web app output
  server: {
    androidScheme: 'https',                // Android uses HTTPS
  },
  plugins: {
    // Native plugins required for features
  }
}
```

### Plugin Configuration

The following Capacitor plugins are configured for core functionality:

#### SplashScreen
- Controls app launch splash screen
- Duration: 0 (dismissed by app code)

#### Push Notifications
- Enables badge, sound, and alert notifications
- Required for engagement features

#### Camera
- Supports photo capture and library access
- Scoped to photos and videos

#### Filesystem
- Stores offline cache in Documents folder
- Enables read-only consumption offline

#### Network
- Monitors connectivity status
- Enables offline mode detection

#### Share
- Native share sheet for sending posts
- Pre-fills title and text

### iOS-Specific Settings

```typescript
ios: {
  contentInset: 'automatic',    // Safe area handling
  scrollEnabled: true,          // Allows scrolling
}
```

**Required Capabilities:**
- Push Notifications
- Network (VPN configuration)
- Camera (if enabled)

**Info.plist Entries:**
```xml
<key>NSCameraUsageDescription</key>
<string>CGR Portal needs camera access to share photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>CGR Portal needs photo library access</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>CGR Portal uses location for content targeting</string>
```

### Android-Specific Settings

```typescript
android: {
  buildOptions: {
    keystorePath: undefined,           // Production: set to keystore path
    keystorePassword: undefined,       // Production: set password
    keystoreAlias: undefined,          // Production: set alias
    keystoreAliasPassword: undefined,  // Production: set alias password
    releaseType: 'APK',                // Use APK for Google Play
  },
}
```

**AndroidManifest.xml Permissions:**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Development Workflow

### Build for Web (Required before sync)

```bash
npm run build
```

This generates the `dist` folder that Capacitor wraps.

### Sync Web Assets to Native

After each web build or code change:

```bash
npm run cap:sync
```

This copies the latest web build to the native projects.

### Development on iOS

1. Build and sync:
   ```bash
   npm run build && npm run cap:sync
   ```

2. Open in Xcode:
   ```bash
   npm run cap:open:ios
   ```

3. Select device/simulator and click Run (⌘R)

4. For live reload during development, update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://your-machine-ip:3001',  // Vite dev server
   }
   ```

### Development on Android

1. Build and sync:
   ```bash
   npm run build && npm run cap:sync
   ```

2. Open in Android Studio:
   ```bash
   npm run cap:open:android
   ```

3. Select device/emulator and click Run (Shift+F10)

### Live Development with Hot Reload

For rapid iteration during development:

1. Start the Vite dev server:
   ```bash
   npm run dev
   ```

2. Update `capacitor.config.ts` to point to the dev server:
   ```typescript
   server: {
     url: 'http://192.168.x.x:3001',
   }
   ```

3. Run on device with Capacitor:
   ```bash
   npm run cap:run:ios
   # or
   npm run cap:run:android
   ```

4. Revert `capacitor.config.ts` before committing to version control

## Build & Release

### iOS App Store

1. **Build for Production:**
   ```bash
   npm run build
   npm run cap:sync
   npm run cap:open:ios
   ```

2. **In Xcode:**
   - Select "Generic iOS Device" (not simulator)
   - Product > Build (`⌘B`)
   - Product > Archive (`⌘⇧B`)
   - Organizer window opens, click "Distribute App"
   - Follow App Store Connect submission flow

3. **Version & Build Numbers:**
   - Update in Xcode: `Info.plist` > `CFBundleShortVersionString` (version)
   - Build number auto-increments or set manually

### Google Play Store

1. **Generate Signed APK/Bundle:**
   ```bash
   npm run build
   npm run cap:sync
   npm run cap:open:android
   ```

2. **In Android Studio:**
   - Build > Generate Signed Bundle / APK
   - Select Bundle (AAB format recommended for Play Store)
   - Choose keystore (production signing key)
   - Select release build variant
   - Click Finish

3. **Upload to Play Console:**
   - Go to Google Play Console
   - Create new release
   - Upload AAB file
   - Fill metadata (description, screenshots, etc.)
   - Submit for review

### Version Management

Keep web and native versions in sync:

```typescript
// capacitor.config.ts
const version = '0.1.0';

const config: CapacitorConfig = {
  appId: 'com.bosch.cgr.portal',
  appName: 'CGR Portal',
  // ... rest of config
};
```

Update in parallel:
- `apps/web/package.json`: version
- iOS: Xcode `Info.plist` > `CFBundleShortVersionString`
- Android: `build.gradle` > `versionName` and `versionCode`

## Offline Support

### Service Worker Configuration

Capacitor supports service workers for offline functionality:

1. Create `public/service-worker.ts`:
   ```typescript
   declare const self: ServiceWorkerGlobalScope;

   self.addEventListener('install', (event) => {
     event.waitUntil(self.skipWaiting());
   });

   self.addEventListener('activate', (event) => {
     event.waitUntil(self.clients.claim());
   });

   self.addEventListener('fetch', (event) => {
     // Implement offline caching strategy
   });
   ```

2. Register in your app root:
   ```typescript
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/service-worker.js');
   }
   ```

### Offline Data Persistence

Use Capacitor's Filesystem plugin to cache API responses:

```typescript
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const cachePost = async (postId: string, data: Post) => {
  await Filesystem.writeFile({
    path: `posts/${postId}.json`,
    data: JSON.stringify(data),
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });
};

export const getCachedPost = async (postId: string): Promise<Post | null> => {
  try {
    const result = await Filesystem.readFile({
      path: `posts/${postId}.json`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(result.data as string);
  } catch (error) {
    return null;
  }
};
```

## Plugin Reference

### Common Use Cases

#### Network Status Detection

```typescript
import { Network } from '@capacitor/network';

const checkStatus = async () => {
  const status = await Network.getStatus();
  console.log('Connected:', status.connected);
  console.log('Type:', status.connectionType);
};

Network.addListener('networkStatusChange', (status) => {
  if (!status.connected) {
    // Show offline UI
  }
});
```

#### Share Content

```typescript
import { Share } from '@capacitor/share';

const sharePost = async (postTitle: string) => {
  await Share.share({
    title: 'Check this out on CGR Portal',
    text: postTitle,
    dialogTitle: 'Share Post',
  });
};
```

#### Camera Access

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const capturePhoto = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
  });
  return image.webPath;
};
```

#### Device Information

```typescript
import { Device } from '@capacitor/device';

const getDeviceInfo = async () => {
  const info = await Device.getInfo();
  console.log('Platform:', info.platform);
  console.log('OS Version:', info.osVersion);
  console.log('App Version:', info.appVersion);
};
```

## Troubleshooting

### Common Issues

#### White Screen on Launch
- **Cause:** Web build missing or incorrect webDir
- **Solution:** Run `npm run build && npm run cap:sync`

#### Plugins Not Working
- **Cause:** Native platform not updated
- **Solution:** Remove and re-add platform: `cap remove ios && cap add ios`

#### Android: Gradle Build Fails
- **Cause:** SDK version mismatch
- **Solution:** Update in `android/build.gradle`:
  ```gradle
  compileSdkVersion = 34
  minSdkVersion = 24
  targetSdkVersion = 34
  ```

#### iOS: Signing Certificate Issues
- **Cause:** Team ID or Bundle ID mismatch
- **Solution:** In Xcode, select target and go to Signing & Capabilities, update Team ID

#### Push Notifications Not Working
- **Cause:** Certificates not configured
- **Solution:** 
  - iOS: Add certificate to Signing & Capabilities > Push Notifications
  - Android: Configure Firebase Cloud Messaging in Google Play Console

### Debug Logs

#### iOS
```bash
# View live logs
npm run cap:run:ios

# Or in Xcode: View > Navigators > Show Debug Navigator
```

#### Android
```bash
# View logcat
adb logcat | grep "CGR"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Mobile Apps

on: [push, pull_request]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm run cap:sync
      - run: npm run cap:build:ios
```

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Store Guidelines](https://play.google.com/about/developer-content-policy/)
- [Bosch Internal Deployment Guide](./DEPLOYMENT.md)
- [Project ADR: Web-First Architecture](./adr/0001-web-first-capacitor-over-react-native.md)

## Support

For issues or questions:
1. Check the [Capacitor community forum](https://capacitor.ionicframework.com/community)
2. Review CI/CD logs in GitHub Actions
3. Contact Bosch IT for certificate/signing issues
4. File issues in the [CGR Portal GitHub repository](https://github.com/bosch/cgr-portal)
