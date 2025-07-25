# Admin User Setup Guide

This guide explains how to set up admin users with Firebase Custom Claims for the Castle Comms internal website.

## Prerequisites

- Firebase Admin SDK access
- Node.js environment with Firebase Admin SDK installed
- Firebase project admin privileges

## Setting Up Custom Claims

### Method 1: Using Firebase Admin SDK (Recommended)

Create a Node.js script to set admin claims:

```javascript
const admin = require('firebase-admin');

// Initialize Admin SDK
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Function to make a user admin
async function makeUserAdmin(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Admin privileges granted to ${email}`);
  } catch (error) {
    console.error('❌ Error setting admin claims:', error);
  }
}

// Function to remove admin privileges
async function removeAdminPrivileges(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: false });
    console.log(`✅ Admin privileges removed from ${email}`);
  } catch (error) {
    console.error('❌ Error removing admin claims:', error);
  }
}

// Usage
makeUserAdmin('admin@castlefineart.com');
```

### Method 2: Using Firebase Cloud Functions

Create a callable function for admin management:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Check if requester is admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be admin');
  }

  const { email, isAdmin } = data;
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: isAdmin });
    return { message: `Admin status updated for ${email}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

## Current Authorization System

The website now uses Firebase Custom Claims instead of hardcoded email checks:

### Features:
- **Secure**: Claims are server-side controlled and tamper-proof
- **Scalable**: Easy to add new permission types
- **Centralized**: All authorization logic in `firebase-init.js`

### Authorization Utilities:

#### `window.authUtils.isAdmin(user)`
- Returns `true` if user has admin privileges
- Checks `auth.token.admin` custom claim

#### `window.authUtils.hasPermission(permission, user)`
- Check for specific permissions
- Falls back to admin if permission not found

#### `window.authUtils.toggleAdminElements(user)`
- Shows/hides elements with `data-admin-only` attribute
- Automatically manages admin link visibility

## Migration from Old System

The following changes were made:

1. **Removed hardcoded email checks**: No more `user.email === "mdelaney@castlefineart.com"`
2. **Added data attributes**: Admin elements use `data-admin-only`
3. **Centralized logic**: All auth checks use `window.authUtils`
4. **Added proper security**: Admin page now blocks non-admin users

## Setting Up Your First Admin User

1. **Create the user** through normal registration
2. **Get their UID** from Firebase Console → Authentication
3. **Run admin script** to set custom claims:

```bash
node setAdminClaims.js
```

4. **User must sign out and back in** for claims to take effect

## Security Benefits

- ✅ Claims are server-side only
- ✅ Cannot be modified by client
- ✅ Automatically included in security rules
- ✅ Refresh with user token
- ✅ Work with Firebase Security Rules

## Troubleshooting

### Admin not showing up?
- User must sign out and back in after claim is set
- Check browser console for errors
- Verify claim was set correctly in Firebase Console

### Permission denied errors?
- Ensure Firebase Security Rules are deployed
- Check that admin claim is set correctly
- Verify user has proper authentication

### Elements not hiding/showing?
- Make sure elements have `data-admin-only` attribute
- Check that `window.authUtils.toggleAdminElements()` is called
- Verify Firebase initialization completed