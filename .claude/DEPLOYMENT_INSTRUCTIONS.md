# Firebase Functions Deployment Guide

## Complete Production-Ready Gallery System Setup

### Prerequisites
- ✅ Firebase project: `castle-comms`
- ✅ Google Drive folder: `1FGhH16oogIvS3hy_sACyyxfKScfq6v_G`
- ✅ Service account key: `103339227671509166248`

---

## Step 1: Complete Service Account Setup

### 1.1 Get Full Service Account JSON
1. Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=castle-comms)
2. Find your service account: `103339227671509166248-compute@developer.gserviceaccount.com`
3. Click **"Keys"** → **"Add Key"** → **"Create New Key"** → **JSON**
4. Download the full JSON file (will contain private_key, etc.)

### 1.2 Share Drive Folder with Service Account
1. Open your Drive folder: https://drive.google.com/drive/folders/1FGhH16oogIvS3hy_sACyyxfKScfq6v_G
2. Right-click → **Share**
3. Add: `castle-comms@appspot.gserviceaccount.com`
4. Set permission: **"Content manager"**
5. Click **Send**

---

## Step 2: Deploy Firebase Functions

### 2.1 Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2.2 Navigate to Project
```bash
cd "/Users/appleone/Documents/Internal Website/castlecomms-main"
```

### 2.3 Initialize Firebase (if not already done)
```bash
firebase init functions
# Choose: Existing project → castle-comms
# Choose: JavaScript
# Choose: Yes (ESLint)
# Choose: Yes (install dependencies)
```

### 2.4 Store Service Account as Secret
```bash
# Store your service account JSON as a Firebase secret
gcloud secrets create DRIVE_SA_JSON --data-file=path/to/your-service-account.json

# Grant access to Functions
gcloud secrets add-iam-policy-binding DRIVE_SA_JSON \
  --member="serviceAccount:castle-comms@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2.5 Deploy Functions
```bash
firebase deploy --only functions
```

---

## Step 3: Update Frontend URLs

After deployment, update the endpoint URL in `gallery-images.html`:

```javascript
// Line ~376 - Replace with your actual function URL
this.uploadEndpoint = 'https://europe-west2-castle-comms.cloudfunctions.net/uploadToGallery';
```

---

## Step 4: Test the System

1. **Upload Test**: Go to Gallery Images page, upload an image
2. **View Test**: Check if image displays correctly
3. **Best Practice Test**: Star an image, check Best Practice page
4. **Delete Test**: Delete an image (removes from both Firebase and Google Drive)

---

## Step 5: Production Checklist

### Security
- [ ] Service account has minimal permissions (just Drive access)
- [ ] Firebase Database rules are properly configured
- [ ] CORS is set to your domain only
- [ ] Functions are deployed to correct region

### Testing
- [ ] Upload works and saves to Google Drive
- [ ] Images display correctly in gallery
- [ ] Best Practice functionality works
- [ ] Delete removes from both Firebase and Drive
- [ ] Admin-only access is enforced

### Monitoring
- [ ] Check Firebase Functions logs for any errors
- [ ] Monitor Google Drive quota usage
- [ ] Test with different image formats and sizes

---

## Troubleshooting

### Common Issues:

**"Permission denied" on upload:**
- Check service account has access to Drive folder
- Verify DRIVE_SA_JSON secret is properly set

**Images not displaying:**
- Verify Drive folder is shared with service account
- Check that files are set to "Anyone with link can view"

**Function deployment fails:**
- Make sure you're in the right Firebase project
- Check that all dependencies are installed in functions/

**CORS errors:**
- Update CORS origins in functions/index.js to include your domain

---

## Final Result

After successful deployment, you'll have:

- ✅ **Real Google Drive uploads** (no more fake/simulation)
- ✅ **Automatic file management** (upload, display, delete)
- ✅ **Production-ready system** with proper error handling
- ✅ **Complete CRUD operations** for gallery management
- ✅ **Secure backend** with service account authentication

The system will be fully production-ready with real Google Drive integration! 🚀