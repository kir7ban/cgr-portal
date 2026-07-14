# Native App Configuration Guide

Detailed configuration for iOS and Android native platforms for CGR Portal.

## iOS Configuration

### Project Structure

After running `npm run cap:add:ios`, the iOS project structure is:

```
ios/
├── App/
│   ├── App.xcodeproj/           # Xcode project
│   ├── App.xcworkspace/         # Workspace (open this, not .xcodeproj)
│   ├── App/
│   │   ├── Info.plist           # App configuration
│   │   ├── AppDelegate.swift    # App entry point
│   │   └── SceneDelegate.swift  # Scene configuration
│   └── Podfile                  # CocoaPods dependencies
└── Capacitor/                    # Capacitor native bridge
```

### Info.plist Configuration

Required entries in `ios/App/App/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- App Display -->
  <key>CFBundleName</key>
  <string>CGR Portal</string>
  <key>CFBundleDisplayName</key>
  <string>CGR Portal</string>
  <key>CFBundleIdentifier</key>
  <string>com.bosch.cgr.portal</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>

  <!-- Deployment -->
  <key>MinimumOSVersion</key>
  <string>14.0</string>
  <key>UIRequiredDeviceCapabilities</key>
  <array>
    <string>armv7</string>
  </array>

  <!-- Network & Security -->
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
      <key>bosch.internal</key>
      <dict>
        <key>NSIncludesSubdomains</key>
        <true/>
        <key>NSExceptionAllowsInsecureHTTPLoads</key>
        <false/>
        <key>NSExceptionRequiresForwardSecrecy</key>
        <true/>
      </dict>
    </dict>
  </dict>

  <!-- Camera Permissions -->
  <key>NSCameraUsageDescription</key>
  <string>CGR Portal needs camera access to capture photos for sharing</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>CGR Portal needs photo library access to share images</string>
  <key>NSPhotoLibraryAddOnlyUsageDescription</key>
  <string>CGR Portal needs permission to save photos to your library</string>

  <!-- Location (for content targeting) -->
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>CGR Portal uses your location to show relevant content</string>
  <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
  <string>CGR Portal uses your location to show relevant content</string>

  <!-- Microphone (future feature) -->
  <key>NSMicrophoneUsageDescription</key>
  <string>CGR Portal may request microphone access for voice features</string>

  <!-- App Appearance -->
  <key>UILaunchStoryboardName</key>
  <string>LaunchScreen</string>
  <key>UIMainStoryboardFile</key>
  <string></string>
  <key>UIApplicationSceneManifest</key>
  <dict>
    <key>UIApplicationSupportsMultipleScenes</key>
    <false/>
    <key>UISceneConfigurations</key>
    <dict>
      <key>UIWindowSceneSessionRoleApplication</key>
      <array>
        <dict>
          <key>UISceneConfigurationName</key>
          <string>Default Configuration</string>
          <key>UISceneDelegateClassName</key>
          <string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
        </dict>
      </array>
    </dict>
  </dict>

  <!-- URL Schemes (for deep linking) -->
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>com.bosch.cgr.portal</string>
      </array>
      <key>CFBundleURLName</key>
      <string>CGR Portal Deep Link</string>
    </dict>
  </array>

  <!-- Background Modes -->
  <key>UIBackgroundModes</key>
  <array>
    <string>remote-notification</string>
    <string>fetch</string>
  </array>

  <!-- Status Bar -->
  <key>UIStatusBarStyle</key>
  <string>UIStatusBarStyleDarkContent</string>
  <key>UIViewControllerBasedStatusBarAppearance</key>
  <false/>

  <!-- Orientation -->
  <key>UISupportedInterfaceOrientations</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
  </array>
  <key>UISupportedInterfaceOrientations~ipad</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </array>
</dict>
</plist>
```

### Xcode Build Settings

#### Signing & Capabilities Tab

1. **Team ID:** Set to your Apple Developer Team ID
2. **Bundle Identifier:** com.bosch.cgr.portal
3. **Development Team:** Select Bosch team
4. **Provisioning Profile:** Select or auto-generate

#### Capabilities to Enable

- [x] Push Notifications
- [x] Network Extension (for VPN support)
- [x] Sign in with Apple (if using SSO)
- [x] App Groups (for shared data)
- [x] Wallet (optional, for loyalty/badges)

#### Build Settings

Navigate to Build Settings and set:

```
PRODUCT_BUNDLE_IDENTIFIER: com.bosch.cgr.portal
PRODUCT_NAME: CGR Portal
TARGETED_DEVICE_FAMILY: 1,2
IPHONEOS_DEPLOYMENT_TARGET: 14.0
SWIFT_VERSION: 5.9
SWIFT_OPTIMIZATION_LEVEL: -Owholemodule
```

### Podfile Configuration

The `ios/App/Podfile` manages CocoaPods dependencies. Update as needed:

```ruby
target 'App' do
  pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
  
  # Add Capacitor plugins
  pod 'CapacitorCamera', :path => '../../node_modules/@capacitor/camera'
  pod 'CapacitorFilesystem', :path => '../../node_modules/@capacitor/filesystem'
  pod 'CapacitorGeolocation', :path => '../../node_modules/@capacitor/geolocation'
  pod 'CapacitorNetwork', :path => '../../node_modules/@capacitor/network'
  pod 'CapacitorPushNotifications', :path => '../../node_modules/@capacitor/push-notifications'
  pod 'CapacitorShare', :path => '../../node_modules/@capacitor/share'
  pod 'CapacitorSplashScreen', :path => '../../node_modules/@capacitor/splash-screen'
  
  # Post-install hook
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      flutter_additional_ios_build_settings(target)
      target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
          '$(inherited)',
          'PERMISSION_CAMERA=1',
        ]
      end
    end
  end
end
```

To install/update dependencies:

```bash
cd ios/App
pod install
pod update
cd ../../
```

### AppDelegate.swift Customization

Customize `ios/App/App/AppDelegate.swift` for Bosch-specific logic:

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Configure app appearance
    if #available(iOS 13.0, *) {
      window?.overrideUserInterfaceStyle = .light
    }
    
    // Configure network settings
    setupNetworkConfiguration()
    
    // Initialize Bosch-specific services
    initializeBoschServices()
    
    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    NotificationCenter.default.post(
      name: Notification.Name(CAPNotifications.DidRegisterForRemoteNotifications.rawValue),
      object: deviceToken
    )
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    NotificationCenter.default.post(
      name: Notification.Name(CAPNotifications.DidFailToRegisterForRemoteNotifications.rawValue),
      object: error
    )
  }

  // MARK: - Bosch Configuration

  private func setupNetworkConfiguration() {
    // Configure TLS settings for Bosch network
    let config = URLSessionConfiguration.default
    config.waitsForConnectivity = true
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 60
  }

  private func initializeBoschServices() {
    // Initialize Bosch SSO, logging, or other services
    print("CGR Portal v\(bundleVersion) initialized")
  }

  var bundleVersion: String {
    Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
  }
}
```

## Android Configuration

### Project Structure

After running `npm run cap:add:android`, the Android project structure is:

```
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml    # App configuration
│   │   │   ├── java/com/bosch/cgr/portal/
│   │   │   │   └── MainActivity.kt     # App entry point
│   │   │   └── res/
│   │   │       ├── values/
│   │   │       │   ├── colors.xml
│   │   │       │   ├── strings.xml
│   │   │       │   └── styles.xml
│   │   │       ├── drawable/           # App icons
│   │   │       └── layout/
│   │   ├── test/
│   │   └── androidTest/
│   └── build.gradle                    # Dependencies
├── build.gradle                        # Root build config
└── settings.gradle                     # Project structure
```

### AndroidManifest.xml Configuration

Update `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

  <!-- App Identification -->
  <application
    android:name="com.getcapacitor.CapacitorApplication"
    android:allowBackup="true"
    android:appComponentFactory="androidx.core.app.CoreComponentFactory"
    android:debuggable="false"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:label="@string/app_name"
    android:theme="@style/AppTheme"
    android:usesCleartextTraffic="false">

    <!-- Main Activity -->
    <activity
      android:name="com.bosch.cgr.portal.MainActivity"
      android:label="@string/app_name"
      android:theme="@style/AppTheme"
      android:launchMode="singleTop"
      android:alwaysRetainTaskState="true"
      android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale"
      android:exported="true">

      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>

      <!-- Deep Linking -->
      <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" android:host="cgr.bosch.com" />
        <data android:scheme="com.bosch.cgr.portal" />
      </intent-filter>
    </activity>

    <!-- Capacitor Services -->
    <service
      android:name="com.getcapacitor.CapacitorInstanceManager"
      android:enabled="true"
      android:exported="false" />

    <!-- Firebase Cloud Messaging -->
    <service
      android:name="com.getcapacitor.plugin.notification.CapacitorNotificationService"
      android:enabled="true"
      android:exported="false">
      <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
      </intent-filter>
    </service>

  </application>

  <!-- Permissions -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.READ_CONTACTS" />
  <uses-permission android:name="android.permission.VIBRATE" />

  <!-- Optional Permissions (for runtime requests) -->
  <uses-permission
    android:name="android.permission.CAMERA"
    android:maxSdkVersion="32" />

  <!-- Feature Declarations -->
  <uses-feature android:name="android.hardware.camera" android:required="false" />
  <uses-feature android:name="android.hardware.location" android:required="false" />

</manifest>
```

### build.gradle Configuration

Update `android/app/build.gradle`:

```gradle
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
apply plugin: 'com.google.gms.google-services'

android {
  compileSdkVersion 34
  defaultConfig {
    applicationId "com.bosch.cgr.portal"
    minSdkVersion 24
    targetSdkVersion 34
    versionCode 1
    versionName "0.1.0"
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
  }

  buildTypes {
    debug {
      applicationIdSuffix ".debug"
      debuggable true
      signingConfig signingConfigs.debug
    }
    staging {
      applicationIdSuffix ".staging"
      debuggable false
      signingConfig signingConfigs.release
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
    release {
      debuggable false
      signingConfig signingConfigs.release
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
  }

  flavorDimensions "environment"
  productFlavors {
    dev {
      dimension "environment"
      applicationIdSuffix ".dev"
      versionNameSuffix "-dev"
    }
    staging {
      dimension "environment"
      applicationIdSuffix ".staging"
      versionNameSuffix "-staging"
    }
    prod {
      dimension "environment"
    }
  }

  signingConfigs {
    debug {
      storeFile file('debug.keystore')
      storePassword 'android'
      keyAlias 'androiddebugkey'
      keyPassword 'android'
    }
    release {
      storeFile file(System.getenv('ANDROID_KEYSTORE_PATH') ?: 'keystore.jks')
      storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
      keyAlias System.getenv('ANDROID_KEYSTORE_ALIAS')
      keyPassword System.getenv('ANDROID_KEYSTORE_ALIAS_PASSWORD')
    }
  }

  compileOptions {
    sourceCompatibility JavaVersion.VERSION_11
    targetCompatibility JavaVersion.VERSION_11
  }

  kotlinOptions {
    jvmTarget = '11'
  }
}

dependencies {
  implementation fileTree(dir: 'libs', include: ['*.jar'])
  implementation 'androidx.appcompat:appcompat:1.7.0'
  implementation 'androidx.coordinatorlayout:coordinatorlayout:1.2.0'
  implementation 'androidx.core:core-splashscreen:1.0.1'
  implementation 'com.google.android.material:material:1.9.0'
  implementation 'com.google.firebase:firebase-analytics:21.3.0'
  implementation 'com.google.firebase:firebase-messaging:23.2.1'
  implementation 'com.getcapacitor:android:6.0.0'
  implementation 'com.getcapacitor.plugins:camera:6.0.0'
  implementation 'com.getcapacitor.plugins:filesystem:6.0.0'
  implementation 'com.getcapacitor.plugins:geolocation:6.0.0'
  implementation 'com.getcapacitor.plugins:network:6.0.0'
  implementation 'com.getcapacitor.plugins:push-notifications:6.0.0'
  implementation 'com.getcapacitor.plugins:share:6.0.0'
  implementation 'com.getcapacitor.plugins:splash-screen:6.0.0'
  testImplementation 'junit:junit:4.13.2'
  androidTestImplementation 'androidx.test.ext:junit:1.1.5'
  androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
}
```

### MainActivity.kt Configuration

Customize `android/app/src/main/java/com/bosch/cgr/portal/MainActivity.kt`:

```kotlin
package com.bosch.cgr.portal

import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.getcapacitor.Plugin
import com.getcapacitor.CapacitorException
import com.getcapacitor.capacitor.CookieStorageManager
import java.util.*

class MainActivity : BridgeActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Initialize Bosch-specific configuration
    setupNetworkConfiguration()
    setupAnalytics()
    
    // Register deep link handling
    handleDeepLink(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    handleDeepLink(intent)
  }

  private fun setupNetworkConfiguration() {
    // Configure app-level network settings
    val bridge = this.bridge ?: return
    
    // Ensure HTTPS is used
    bridge.config.server?.set("androidScheme", "https")
    
    // Set appropriate timeout values
    bridge.webView?.settings?.apply {
      databaseEnabled = false
      domStorageEnabled = true
      mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
    }
  }

  private fun setupAnalytics() {
    // Initialize analytics or logging services
    println("CGR Portal initialized on Android ${Build.VERSION.RELEASE}")
  }

  private fun handleDeepLink(intent: Intent) {
    val data = intent.data
    if (data != null) {
      val action = data.toString()
      // Parse and handle deep links
      bridge?.eval(
        "window.location.href = '$action'",
        null
      )
    }
  }
}
```

### String Resources

Update `android/app/src/main/res/values/strings.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="app_name">CGR Portal</string>
  <string name="title_activity_main">CGR Portal</string>
  <string name="package_name">com.bosch.cgr.portal</string>
  <string name="custom_url_scheme">com.bosch.cgr.portal</string>

  <!-- Permissions -->
  <string name="permission_camera">Camera permission needed to capture photos</string>
  <string name="permission_location">Location permission needed to show relevant content</string>
  <string name="permission_storage">Storage permission needed to access photos</string>

  <!-- Error Messages -->
  <string name="error_network">Network connection required</string>
  <string name="error_permission">Permission denied</string>
</resources>
```

## Common Configuration Tasks

### Updating Version Numbers

Keep versions synchronized across platforms:

1. **Web:**
   ```json
   // apps/web/package.json
   "version": "0.1.0"
   ```

2. **Capacitor:**
   ```typescript
   // apps/web/capacitor.config.ts
   appVersion: '0.1.0'
   ```

3. **iOS:**
   - Xcode: Info.plist > CFBundleShortVersionString
   - Build number: CFBundleVersion

4. **Android:**
   ```gradle
   // android/app/build.gradle
   versionCode 1
   versionName "0.1.0"
   ```

### Configuring Development Team

#### iOS
```bash
# In Xcode:
# 1. Select CGRPortal target
# 2. Go to Signing & Capabilities
# 3. Set Team ID to Bosch Development Team
# 4. Ensure Bundle Identifier matches: com.bosch.cgr.portal
```

#### Android
```bash
# Set in environment
export ANDROID_KEYSTORE_PATH=/path/to/keystore.jks
export ANDROID_KEYSTORE_PASSWORD=your_password
export ANDROID_KEYSTORE_ALIAS=your_alias
export ANDROID_KEYSTORE_ALIAS_PASSWORD=alias_password
```

### Setting Up Deep Links

Enable navigation to specific app sections via URLs:

**iOS:**
- Already configured in Info.plist with URL schemes
- Handled in SceneDelegate or AppDelegate

**Android:**
- Already configured in AndroidManifest.xml
- Handled in MainActivity.kt

## Security Considerations

### Network Security

1. **iOS:**
   - Uses HTTPS by default (ATS enabled)
   - Whitelist Bosch domains in Info.plist

2. **Android:**
   - Set `android:usesCleartextTraffic="false"`
   - Create network security policy in `android/app/src/main/res/xml/network_security_config.xml`:
   ```xml
   <network-security-config>
     <domain-config cleartextTrafficPermitted="false">
       <domain includeSubdomains="true">bosch.internal</domain>
     </domain-config>
   </network-security-config>
   ```

### Permission Management

Request permissions at runtime (Android 6+, iOS 10+):

```typescript
// In React component
import { Camera } from '@capacitor/camera';

const requestCameraPermission = async () => {
  try {
    const permission = await Camera.requestPermissions();
    if (permission.camera === 'granted') {
      // Proceed with camera
    }
  } catch (error) {
    console.error('Camera permission denied:', error);
  }
};
```

## References

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
