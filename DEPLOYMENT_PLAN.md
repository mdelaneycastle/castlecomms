# Events Management System - GitHub Deployment Plan

## Overview
Plan to deploy the Events Management System to GitHub/cloud platforms to eliminate local server requirements and enable global access with user-selectable file download locations.

## Current State Analysis

### ✅ What's Working
- Frontend: Modern HTML/CSS/JS with Tailwind and Castle styling
- GitHub repo with Firebase hosting already configured
- GitHub Actions workflow: `.github/workflows/firebase-hosting-merge.yml`
- Events workflow UI redesigned to match Castle Comms styling

### ❌ Current Dependencies
- Python scripts for Apple/Google Wallet generation
- Local server requirements (localhost:5001 calls in code)
- Backend API endpoints:
  - `http://localhost:5001/api/events`
  - `http://localhost:5001/api/events/${eventName}/qr-extract`

### 📁 Python Backend Files
- `apple_pass_customizer.py` - Apple Wallet pass generation
- `workflow_coordinator.py` - Main workflow coordination
- `email_template_generator.py` - Email template creation (keep for downloads)
- `email_sender.py` - Email sending (remove - not needed)
- Other supporting scripts

## Deployment Strategy Options

### Option 1: Firebase Functions (Recommended)
**Why:** Already have Firebase hosting + GitHub Actions configured

**Benefits:**
- Extend existing workflow
- Node.js/Python support available
- Integrated with current setup
- Pay-per-use pricing

**API Endpoints Needed:**
- `/api/events` - Event management
- `/api/generate-apple-passes` - Apple Wallet pass creation
- `/api/generate-google-passes` - Google Wallet pass creation
- `/api/generate-email-templates` - Download templates (no sending)

### Option 2: Multi-Platform Approach
- **Frontend:** GitHub Pages/Firebase Hosting
- **Backend:** Vercel/Netlify Functions (better Python support)
- **Hybrid:** Mix platforms based on best fit

## Technical Research Findings

### GitHub Actions & Serverless (2025)
- GitHub Actions support automated serverless deployment
- Serverless Framework provides GitHub Action wrappers
- Modern workflow templates available for static sites + functions
- Client-side apps fully supported on GitHub Pages

### Apple Wallet & Google Wallet Generation
- **Challenge:** Apple Wallet requires certificate signing (can't be purely client-side)
- **Solution:** Server-side generation with client-side downloads
- **Libraries Available:**
  - `passkit-generator` (Node.js) - Most popular
  - `pass-js` (Node.js alternative)
  - Google Wallet has REST API for URL generation

### Platform Comparison (2025)
- **Vercel:** Great for Next.js, 10-second function timeout limitation
- **Netlify:** Generous free tier, good for static sites + functions
- **Firebase Functions:** Integrated ecosystem, longer execution times
- **All support:** Git-based deployment, serverless functions, global CDN

## Implementation Plan

### Phase 1: Backend Migration
1. Convert Python scripts to serverless functions
2. Set up Firebase Functions project (or choose alternative)
3. Migrate Apple Pass generation logic
4. Migrate Google Wallet generation logic
5. Create email template download endpoints

### Phase 2: Frontend Updates
1. Replace localhost URLs with cloud function endpoints
2. Add environment configuration (dev/prod)
3. Implement user file location selection UI
4. Add progress tracking for operations
5. Enable direct browser downloads

### Phase 3: Deployment Setup
1. Update GitHub Actions workflow
2. Add secrets for Apple Developer certificates
3. Add Google Wallet API credentials
4. Test deployment pipeline

### Phase 4: User Experience
1. No server commands required
2. Global accessibility
3. User-selectable download locations
4. Real-time progress updates
5. Bulk operations support

## Key Requirements Addressed

### ✅ No Server Commands
- Everything runs in browser + cloud functions
- No localhost dependencies
- No manual server startup

### ✅ Global Access
- Accessible from anywhere with internet
- Cloud-hosted backend
- CDN-delivered frontend

### ✅ User File Choice
- Browser-based file downloads
- User selects download locations
- Support for bulk operations

### ✅ Email Templates Only
- Generate email templates for download
- No actual email sending required
- Users can use templates in their own systems

## Next Steps (For Next Week)

1. **Decision:** Choose deployment platform (Firebase vs alternatives)
2. **Setup:** Configure serverless functions project
3. **Migration:** Convert Python backend to cloud functions
4. **Testing:** Update frontend API calls and test integration
5. **UI Enhancement:** Add file location selection interface

## Notes
- Email sending functionality will be removed (only template generation needed)
- Focus on pass generation and template downloads
- Leverage existing GitHub Actions workflow where possible
- Maintain Castle Comms styling and user experience

## Resources & Links
- Current Firebase config: `castle-comms` project
- GitHub Actions: Already configured for Firebase hosting
- Apple Developer: Certificate management needed for pass signing
- Google Wallet: API credentials required for pass generation

---
*Saved: September 19, 2025*
*Next Review: Next week*