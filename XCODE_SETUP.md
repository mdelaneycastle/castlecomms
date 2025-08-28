# Create Castle Comms iOS App in Xcode

## Step 1: Create New Xcode Project

1. **Open Xcode**
2. **Create a new Xcode project**
3. **Choose**: iOS → App
4. **Product Name**: `Castle Comms`
5. **Bundle Identifier**: `com.castlefineart.comms`
6. **Language**: Swift
7. **Interface**: SwiftUI
8. **Use Core Data**: NO
9. **Click Create**

## Step 2: Add Firebase

1. **File** → **Add Package Dependencies**
2. **Enter URL**: `https://github.com/firebase/firebase-ios-sdk`
3. **Add Package**
4. **Select these products**:
   - FirebaseCore
   - FirebaseMessaging
5. **Click Add Package**

## Step 3: Replace App Code

1. **Delete** the default `ContentView.swift`
2. **Replace** `CastleCommsApp.swift` with the code from `CastleCommsNotifications.swift`

## Step 4: Add Firebase Configuration

1. **Download** `GoogleService-Info.plist` from Firebase Console
2. **Drag it** into your Xcode project
3. **Make sure** "Add to target" is checked

## Step 5: Enable Push Notifications

1. **Select your project** in Xcode
2. **Signing & Capabilities** tab
3. **Click + Capability**
4. **Add "Push Notifications"**
5. **Add "Background Modes"**
6. **Check "Remote notifications"**

## Step 6: Build and Test

1. **Connect your iPhone**
2. **Select your device** as the destination
3. **Click the Play button** to build and run
4. **App will install** and show FCM token
5. **Copy the token** and add it to Firebase Console

## Step 7: Create Archive for Distribution

1. **Product** → **Archive**
2. **Distribute App** → **Ad Hoc** (for internal distribution)
3. **Export** → Save the `.ipa` file
4. **Send .ipa to your team** for installation

## No Servers Required!

- ✅ Just Xcode and your Mac
- ✅ Direct connection to Firebase
- ✅ No development servers
- ✅ No command line tools
- ✅ Pure native iOS app