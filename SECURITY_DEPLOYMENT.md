# Firebase Security Rules Deployment Guide

This document explains how to deploy the Firebase Security Rules for the Castle Comms internal website.

## Prerequisites

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase in project: `firebase init`

## Security Rules Files

### Database Rules (`database.rules.json`)
- **Location**: Root of project directory
- **Purpose**: Secures Firebase Realtime Database
- **Key Features**:
  - Users can only read/write their own data
  - Admin users have full access (requires custom claims)
  - Posts are readable by all authenticated users
  - Comments require authentication to write
  - File metadata is protected

### Storage Rules (`storage.rules`)
- **Location**: Root of project directory  
- **Purpose**: Secures Firebase Storage
- **Key Features**:
  - Profile images: Users can only upload their own (5MB limit)
  - Post attachments: All authenticated users can upload (10MB limit)
  - Shared files: 50MB limit, admin deletion rights
  - Admin-only section for sensitive files

## Deployment Commands

### Deploy Database Rules
```bash
firebase deploy --only database
```

### Deploy Storage Rules
```bash
firebase deploy --only storage
```

### Deploy All Rules
```bash
firebase deploy --only database,storage
```

## Custom Claims Setup

The security rules rely on custom claims for admin users. Set these up using Firebase Admin SDK:

```javascript
// In Firebase Cloud Functions or Admin SDK
admin.auth().setCustomUserClaims(uid, { admin: true });
```

## Important Security Notes

1. **Authentication Required**: All operations require user authentication
2. **Admin Access**: Admin users are identified by `auth.token.admin == true`
3. **File Size Limits**: 
   - Profile images: 5MB
   - Post attachments: 10MB  
   - Shared files: 50MB
4. **Content Type Restrictions**: Images and videos only for media uploads
5. **User Isolation**: Users can only access their own data unless admin

## Testing Security Rules

Use Firebase Emulator Suite for local testing:

```bash
firebase emulators:start --only database,storage
```

## Monitoring

Monitor rule violations in Firebase Console:
- Go to Database → Rules → Simulator
- Check Storage → Rules for access logs
- Review Authentication logs for suspicious activity