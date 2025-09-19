import os
import csv
import json
import shutil
from datetime import datetime, timedelta
import sys

# Add parent directory to path to import customizer
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from apple_pass_customizer import load_current_config, apply_customizations_to_pass, copy_custom_assets_to_pass
    CUSTOMIZER_AVAILABLE = True
    print("🎨 Pass customization features enabled")
except ImportError:
    CUSTOMIZER_AVAILABLE = False
    print("⚠️ Pass customization not available - using default settings")

# Base directory = project folder where this script lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Paths
csv_path = "/Users/marcdelaney/Documents/GitHub/castlecomms/events/Boy George_2025-09-16T11-47-14-497Z/csv/guest_list.csv"
output_base = os.path.join(BASE_DIR, "passtest")
strip_image_path = os.path.join(BASE_DIR, "strip.png")
background_image_path = os.path.join(BASE_DIR, "screenshot_background.png")
qr_folder = os.path.join(BASE_DIR, "qr_exports")

# Format date as e.g., 12 Sep 2025
event_date_human = (datetime.now() + timedelta(days=1)).strftime('%d %b %Y')

# Load customization settings if available
if CUSTOMIZER_AVAILABLE:
    custom_config = load_current_config()
    print(f"🎨 Loaded custom config: {custom_config.get('backgroundColor', 'default')}")
    print(f"🎨 Full config: {custom_config}")
else:
    custom_config = {}
    print("⚠️ Customizer not available, using defaults")

# Pass template (generic layout) with customization support
bgcolor = custom_config.get("backgroundColor") or "rgb(0, 0, 0)"
print(f"🎨 DEBUG: Using backgroundColor: {bgcolor} (from config: {custom_config.get('backgroundColor')})")

base_pass_json = {
    "formatVersion": 1,
    "passTypeIdentifier": "pass.com.castlefineart.guest",
    "serialNumber": "",
    "teamIdentifier": "R3NC84JPSH",
    "organizationName": "Castle Fine Art",
    "description": "Event Entry Pass",
    "backgroundColor": bgcolor,
    "foregroundColor": custom_config.get("foregroundColor", "rgb(255, 255, 255)"),
    "labelColor": custom_config.get("labelColor", "rgb(255, 255, 255)"),
    "storeCard": {
        "primaryFields": [],
        "secondaryFields": [],
        "auxiliaryFields": []
    }
}

# Load and sort QR images
qr_images = sorted([
    f for f in os.listdir(qr_folder)
    if f.lower().endswith('.png')
])

# Ensure output directory exists
os.makedirs(output_base, exist_ok=True)

with open(csv_path, newline='', encoding='utf-8-sig') as csvfile:
    reader = csv.DictReader(csvfile)
    for idx, row in enumerate(reader):
        name = row['name'].strip()
        email = row['email'].strip()
        guest_count = row['guest_count'].strip()
        pass_id = row['pass_id'].strip()
        host_gallery = row['host_gallery'].strip()
        art_consultant = row['art_consultant'].strip()

        pass_folder = os.path.join(output_base, pass_id)
        os.makedirs(pass_folder, exist_ok=True)

        # Use matching QR image (by order)
        if idx < len(qr_images):
            qr_source = os.path.join(qr_folder, qr_images[idx])
            qr_target = os.path.join(pass_folder, "qr.png")
            if not os.path.exists(qr_target):
                shutil.copy(qr_source, qr_target)
                print(f"✅ QR imported for {pass_id} → {qr_images[idx]}")
            else:
                print(f"🟡 QR already exists for {pass_id}, skipping import")
        else:
            print(f"❌ No QR available for {pass_id}, skipped")
            continue

        # Copy custom assets if customizer is available, otherwise use defaults
        if CUSTOMIZER_AVAILABLE:
            copy_custom_assets_to_pass(pass_folder, custom_config)
        else:
            # Fallback to default behavior
            if os.path.exists(strip_image_path):
                shutil.copy(strip_image_path, os.path.join(pass_folder, "strip.png"))
            
            # Only copy background if not using customizer (customizer handles this)
            # if os.path.exists(background_image_path):
            #     shutil.copy(background_image_path, os.path.join(pass_folder, "background.png"))
            
            icon_image_path = os.path.expanduser("~/Documents/GitHub/castlecomms/wallettest/icon.png")
            if os.path.exists(icon_image_path):
                shutil.copy(icon_image_path, os.path.join(pass_folder, "icon.png"))
                # Also copy as icon@2x.png (required by Apple Wallet)
                shutil.copy(icon_image_path, os.path.join(pass_folder, "icon@2x.png"))
            
            logo_image_path = os.path.expanduser("~/Documents/GitHub/castlecomms/wallettest/logo.png")
            if os.path.exists(logo_image_path):
                shutil.copy(logo_image_path, os.path.join(pass_folder, "logo.png"))

        # Build dynamic pass.json
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        serial_number = f"{pass_id}-{timestamp}"

        # QR code content
        qr_data = json.dumps({
            "name": name,
            "guests": int(guest_count)
        })

        pass_json = json.loads(json.dumps(base_pass_json))  # Deep copy
        pass_json["serialNumber"] = serial_number
        
        # Colors are already applied in base_pass_json, no need to reapply
        pass_json["barcode"] = {
            "message": qr_data,
            "format": "PKBarcodeFormatQR",
            "messageEncoding": "iso-8859-1"
        }

        # Add expirationDate and relevantDate in proper ISO format
        event_datetime = datetime.now() + timedelta(days=1)
        pass_json["expirationDate"] = event_datetime.strftime('%Y-%m-%dT%H:%M:%SZ')
        pass_json["relevantDate"] = event_datetime.strftime('%Y-%m-%dT%H:%M:%SZ')

        # Fill in visible fields - use space to maintain spacing without visible text
        pass_json["storeCard"]["primaryFields"] = [
            {"key": "spacer", "label": "", "value": " "}
        ]
        pass_json["storeCard"]["secondaryFields"] = [
            {"key": "name", "label": "Name", "value": name},
            {"key": "guests", "label": "Guests", "value": guest_count}
        ]
        pass_json["storeCard"]["auxiliaryFields"] = [
            {"key": "host_gallery", "label": "Host Gallery", "value": host_gallery},
            {"key": "art_consultant", "label": "Art Consultant", "value": art_consultant},
            {"key": "date", "label": "Date", "value": event_date_human},
            {"key": "location", "label": "Event Location", "value": "Castle Fine Art, The Mailbox"}
        ]

        # Debug: check final colors before writing
        print(f"📝 Writing {pass_id} with backgroundColor: {pass_json.get('backgroundColor')}")
        
        # Write pass.json
        with open(os.path.join(pass_folder, "pass.json"), "w") as f:
            json.dump(pass_json, f, indent=4)

print("\n🎟️ All passes generated with correct QR data, fields, optional strip, and background image.")
