# Quick Admin Setup Guide

Follow these steps to make `test@castlefineart.com` an admin user:

## Step 1: Install Dependencies

```bash
cd "/Users/appleone/Documents/Internal Website/castlecomms-main"
npm install
```

## Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/castle-comms/settings/serviceaccounts/adminsdk)
2. Click **"Generate new private key"**
3. Download the JSON file
4. Rename it to `serviceAccountKey.json`
5. Place it in your project directory

## Step 3: Make test@castlefineart.com an Admin

```bash
node setup-admin.js make-admin test@castlefineart.com
```

You should see:
```
✅ Admin privileges granted to test@castlefineart.com
🔄 User must sign out and back in for changes to take effect
```

## Step 4: Test Admin Access

1. Have the test@castlefineart.com user **sign out** of the website
2. **Sign back in**
3. The Admin link should now appear in the sidebar

## Troubleshooting

### Check if admin privileges are set:
```bash
node setup-admin.js check test@castlefineart.com
```

### If admin link still doesn't show:
1. Check browser console for errors
2. Make sure user signed out and back in
3. Verify Firebase Security Rules are deployed (we did this)

### To remove admin privileges:
```bash
node setup-admin.js remove-admin test@castlefineart.com
```

## Security Note

- Keep `serviceAccountKey.json` secure and never commit it to git
- Only run this script from a secure environment
- The script is only needed for initial admin setup

Once admin users are set up, they can use the website's admin panel to manage other users.