# GitHub Cloud Storage Setup for Castle Fine Art Events Scanner

To enable multiple users to scan simultaneously with shared data, follow these steps:

## Step 1: Create GitHub Personal Access Token

1. Go to GitHub.com and sign in to your account
2. Click your profile picture → Settings
3. Scroll down and click "Developer settings"
4. Click "Personal access tokens" → "Tokens (classic)"
5. Click "Generate new token (classic)"
6. Give it a name like "Castle Events Scanner"
7. **Important**: Check these permissions:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `public_repo` (Access public repositories)
8. Click "Generate token"
9. **COPY THE TOKEN** - you won't see it again!

## Step 2: Update the Scanner Code

1. Open your `mobile-scanner.html` file
2. Find this line (around line 409):
   ```javascript
   const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE';
   ```
3. Replace `YOUR_GITHUB_TOKEN_HERE` with your actual token:
   ```javascript
   const GITHUB_TOKEN = 'ghp_xxxxxxxxxxxxxxxxxxxx';
   ```

## Step 3: Test the Setup

1. Upload the updated file to your GitHub Pages site
2. Open the scanner on your phone
3. Import a guest list - you should see "✅ Data synced from cloud"
4. Open the scanner on another device - it should load the same data

## How It Works

### **Automatic Syncing:**
- Data saves to GitHub immediately when guests check in
- All devices sync every 30 seconds automatically
- Works offline - syncs when internet returns

### **Shared Data Storage:**
- Creates `event-data.json` in your `castlecomms` repository
- Contains all guest data and check-in status
- Multiple people can scan simultaneously

### **Fallback System:**
- If GitHub is unavailable, uses local storage
- Syncs back to cloud when connection returns
- Never loses data

## Security Notes

⚠️ **Keep your token private** - it gives access to your repositories  
✅ **The data is stored in your private GitHub repo**  
✅ **Token only works for your repositories**  
✅ **You can revoke the token anytime from GitHub settings**

## Multiple Event Management

To run different events:
- Create separate repositories for each event
- Or change the `GITHUB_PATH` in the code to different filenames
- Example: `event-data-christmas.json`, `event-data-summer.json`

Your scanner is now ready for multi-user operation!