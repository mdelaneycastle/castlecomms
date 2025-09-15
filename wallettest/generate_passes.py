import csv
import os
import json
import shutil
from datetime import datetime, timedelta

# Paths
csv_path = "/Users/appleone/Documents/wallettest/google_wallet/sample_guest_list.csv"
output_base = os.path.expanduser("~/Documents/wallettest/passtest")
strip_image_path = os.path.expanduser("~/Documents/wallettest/strip.png")
background_image_path = os.path.expanduser("~/Documents/wallettest/screenshot_background.png")
qr_folder = os.path.expanduser("~/Documents/wallettest/qr_exports")

# Format date as e.g., 12 Sep 2025
event_date_human = (datetime.now() + timedelta(days=1)).strftime('%d %b %Y')

# Pass template (generic layout) — backgroundColor as fallback for background image
base_pass_json = {
    "formatVersion": 1,
    "passTypeIdentifier": "pass.com.castlefineart.guest",
    "serialNumber": "",
    "teamIdentifier": "R3NC84JPSH",
    "organizationName": "Castle Fine Art",
    "description": "Event Entry Pass", 
    "backgroundColor": "rgb(255, 0, 255)",  # Magenta fallback
    "foregroundColor": "rgb(255, 255, 255)",
    "labelColor": "rgb(255, 255, 255)",
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

        # Copy strip image if it exists
        if os.path.exists(strip_image_path):
            shutil.copy(strip_image_path, os.path.join(pass_folder, "strip.png"))

        # ✅ Copy background image if it exists
        if os.path.exists(background_image_path):
            shutil.copy(background_image_path, os.path.join(pass_folder, "background.png"))
        
        # Copy icon image if it exists
        icon_image_path = os.path.expanduser("~/Documents/wallettest/icon.png")
        if os.path.exists(icon_image_path):
            shutil.copy(icon_image_path, os.path.join(pass_folder, "icon.png"))
        
        # Copy logo image if it exists  
        logo_image_path = os.path.expanduser("~/Documents/wallettest/logo.png")
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

        # Write pass.json
        with open(os.path.join(pass_folder, "pass.json"), "w") as f:
            json.dump(pass_json, f, indent=4)

print("\n🎟️ All passes generated with correct QR data, fields, optional strip, and background image.")
