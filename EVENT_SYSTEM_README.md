# Castle Fine Art - Unified Event Management System

A complete workflow system that streamlines the process of managing Castle Fine Art events from guest list to digital wallet passes and email invitations.

## 🎯 System Overview

This system connects all your existing tools into one smooth workflow:

1. **Event Setup** - Configure event details and upload guest lists
2. **QR Generation** - Generate QR codes compatible with your mobile scanner
3. **Apple Wallet** - Create `.pkpass` files using your existing scripts
4. **Google Wallet** - Generate Google Wallet passes via API
5. **Email Campaign** - Send personalized invitations with both wallet options

## 📁 System Components

### Core Files
- **`event-workflow.html`** - Main web interface (step-by-step workflow)
- **`workflow_coordinator.py`** - Backend API server (orchestrates everything)
- **`qr-bridge.js`** - JavaScript bridge for QR code integration
- **`email_sender.py`** - Email personalization and sending system
- **`test_workflow.py`** - Testing script for the complete workflow

### Modified Existing Files
- **`qrcreator.html`** - Updated with proper JSON format for your scanner
- **`wallettest/create_passes.sh`** - Modified to handle unlimited passes (removed 5-pass limit)

### Unchanged Working Scripts
- **`wallettest/generate_passes.py`** - Creates Apple Wallet pass structure
- **`wallettest/google_wallet/google_wallet_generator.py`** - Creates Google Wallet passes
- **`mobile-scanner.html`** - Your mobile scanner (no changes needed)

## 🚀 Quick Start Guide

### 1. Install Dependencies

```bash
# Python dependencies
pip install flask flask-cors requests configparser

# Ensure you have the required certificates and keys
# - wallettest/pass_certificate.p12
# - wallettest/wwdr.pem
# - wallettest/google_wallet/castle-comms-9607f45dd01c.json
```

### 2. Start the Backend

```bash
cd "/Users/appleone/Documents/Internal Website/castlecomms-main"
python workflow_coordinator.py
```

The backend will start on `http://localhost:5000`

### 3. Open the Event Workflow

Open `event-workflow.html` in your web browser. The interface will guide you through each step:

1. **Event Setup**: Enter event details and upload your CSV
2. **QR Generation**: Generate QR codes (automatically compatible with your scanner)
3. **Apple Wallet**: Create `.pkpass` files
4. **Google Wallet**: Generate Google Wallet URLs
5. **Email Campaign**: Send personalized invitations

### 4. CSV Format Required

Your CSV must include these columns:
- `name` - Guest name
- `email` - Guest email
- `guest_count` - Number of guests
- `pass_id` - Unique pass ID (e.g., PASS001)
- `host_gallery` - Assigned gallery
- `art_consultant` - Assigned consultant

## 🧪 Testing the System

Run the automated test to verify everything works:

```bash
python test_workflow.py
```

This will test the complete workflow with your sample data.

## 📧 Email Configuration

### 1. Set Up SMTP

The first time you run the email system, it will create `email_config.ini`:

```ini
[SMTP]
smtp_server = smtp.gmail.com
smtp_port = 587
use_tls = True
username = your_email@gmail.com
password = your_app_password

[EMAIL]
from_email = events@castlefineart.com
from_name = Castle Fine Art
reply_to = events@castlefineart.com
subject_template = Your Castle Fine Art Private View Invitation - {event_name}
```

### 2. Gmail Setup (Recommended)

1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" specifically for this system
3. Use the app password in the `email_config.ini` file

### 3. Send Test Email

```bash
python email_sender.py --event-dir ~/Documents/events/your_event --test-email test@example.com
```

## 🔧 How It Works

### File Organization

The system creates organized folders for each event:

```
~/Documents/events/
└── your_event_name/
    ├── csv/
    │   └── guest_list.csv
    ├── qr_codes/           # Generated QR codes
    ├── apple_passes/       # .pkpass files
    ├── google_passes/      # Google Wallet URLs
    ├── emails/            # Personalized email HTML
    └── event_info.json    # Event configuration
```

### QR Code Integration

1. Your existing `qrcreator.html` generates QR codes with the correct JSON format:
   ```json
   {"id":"unique_id","name":"Guest Name","guests":2}
   ```

2. The system extracts QR codes from the ZIP download and places them in `wallettest/qr_exports/`

3. Your existing scripts (`generate_passes.py` and `create_passes.sh`) process them into wallet passes

### Mobile Scanner Compatibility

The QR codes generated are fully compatible with your existing `mobile-scanner.html` because:
- They use the same JSON format your scanner expects
- They include the ID field for primary matching
- They maintain name/guest count for fallback matching

## 📱 Wallet Integration

### Apple Wallet
- Uses your existing certificate and signing process
- Creates individual `.pkpass` files for each guest
- Includes all event details and QR codes

### Google Wallet
- Uses your Google Wallet API credentials
- Creates secure URLs that add passes directly to Google Wallet
- Compatible with all Android devices

### Email Delivery
- Each email includes both Apple and Google Wallet options
- Apple passes are attached as `.pkpass` files
- Google passes are clickable "Add to Google Wallet" buttons

## 🎨 Customization

### Event Templates
Save common event configurations to reuse for future events.

### Email Templates
Modify `wallettest/google_wallet/email_template.html` to customize:
- Branding and colors
- Event information layout
- Instructions for guests

### QR Code Settings
Adjust QR code size, colors, and format in the workflow interface.

## 🔍 Troubleshooting

### Backend Not Starting
- Check that Flask is installed: `pip install flask flask-cors`
- Verify the port 5000 is not in use
- Check file permissions for the wallettest directory

### QR Generation Failing
- Ensure `qrcreator.html` is in the same directory
- Check that JSZip is loading properly
- Verify CSV data format is correct

### Apple Wallet Issues
- Verify certificates exist and are valid
- Check that `openssl` is available in PATH
- Ensure `create_passes.sh` has execute permissions

### Google Wallet Issues
- Verify `castle-comms-9607f45dd01c.json` exists and is valid
- Check Google Wallet API credentials
- Ensure internet connection for API calls

### Email Issues
- Verify SMTP configuration in `email_config.ini`
- Test with a single email first
- Check that app passwords are used for Gmail

## 🎉 Success!

You now have a complete, professional event management system that:

✅ **Streamlines your workflow** from hours to minutes
✅ **Handles multiple events** simultaneously
✅ **Maintains compatibility** with your existing mobile scanner
✅ **Provides dual wallet options** for maximum guest compatibility
✅ **Automates email sending** with personalized invitations
✅ **Organizes all files** automatically per event

## 📞 Support

For questions or issues:
1. Check the browser console for JavaScript errors
2. Check the Python backend logs for API errors
3. Run `python test_workflow.py` to diagnose issues
4. Verify all dependencies and certificates are in place

---

**🏰 Castle Fine Art Event Management System v1.0**
*Making event management as elegant as the art you showcase.*