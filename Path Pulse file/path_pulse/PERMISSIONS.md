# Path-Pulse — Required permissions

After you run `flutter create .` (or if you already have `android/` and `ios/`), add these so the map and expedition tracking work.

## Android

In **android/app/src/main/AndroidManifest.xml**, inside `<manifest>`, add:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## iOS

In **ios/Runner/Info.plist**, inside `<dict>`, add:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Path-Pulse needs location to record your route and show the tactical map.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Path-Pulse uses location to track your expedition and draw the laser trace.</string>
```

Then run:

```bash
flutter pub get
flutter run
```
