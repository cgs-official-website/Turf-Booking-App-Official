# Android APK Build Instructions

Since this is a bare React Native CLI project (without Expo), you can generate a `.apk` file for Android devices directly via Gradle.

## Requirements
- Java Development Kit (JDK 17 or higher)
- Android Studio (or Android SDK command-line tools)
- `ANDROID_HOME` environment variable set to your Android SDK path.

## Build Steps
1. Open a terminal inside the `TurfUserApp` directory.
2. Run the build command:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   *(On Windows Command Prompt, use `gradlew assembleDebug` instead of `./gradlew`)*

3. **Locate your APK**: Once the build finishes successfully, you will find your generated `.apk` file at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

4. Transfer this file to your Android phone, enable "Install from unknown sources", and install it.

> [!NOTE]
> For a production release build, you would run `./gradlew assembleRelease` instead, which requires setting up signing keys in `android/app/build.gradle`.
