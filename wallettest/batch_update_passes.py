import os
import json

# Config
TEAM_ID = "R3NC84JPSH"
PASS_TYPE_ID = "pass.com.castlefineart.guest"
LOGO_TEXT = "Castle Fine Art"  # Remove this line if you only want the image logo
PASS_DIR = "/Users/appleone/Documents/passtest"  # Adjust if needed

def update_pass_json(path):
    with open(path, 'r') as f:
        data = json.load(f)

    # Set required identifiers
    data['teamIdentifier'] = TEAM_ID
    data['passTypeIdentifier'] = PASS_TYPE_ID
    data['organizationName'] = "Castle Fine Art"
    data['description'] = "Event Guest Pass"

    # Set colors
    data['backgroundColor'] = "rgb(255,0,255)"
    data['foregroundColor'] = "black"
    data['labelColor'] = "black"

    # Optional: show logo text (can remove if using only image)
    data['logoText'] = LOGO_TEXT

    # Extract name and guest count for barcode
    try:
        name_field = next(field for field in data['eventTicket']['primaryFields'] if field['key'] == 'name')
        guest_field = next(field for field in data['eventTicket']['secondaryFields'] if field['key'] == 'guests')

        name = name_field['value']
        guests = guest_field['value']

        data['barcode'] = {
            "message": f"{name} - {guests} guest{'s' if str(guests) != '1' else ''}",
            "format": "PKBarcodeFormatQR",
            "messageEncoding": "iso-8859-1"
        }

    except Exception as e:
        print(f"⚠️ Failed to create barcode in {path}: {e}")

    with open(path, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"✅ Updated: {path}")

# Run on all pass.json files in subfolders
for folder in os.listdir(PASS_DIR):
    full_path = os.path.join(PASS_DIR, folder, 'pass.json')
    if os.path.isfile(full_path):
        update_pass_json(full_path)
