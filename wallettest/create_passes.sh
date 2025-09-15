#!/bin/bash

# Paths
BASE_DIR=~/Documents/wallettest
PASSES_DIR="$BASE_DIR/passtest"
OUTPUT_DIR="$BASE_DIR/pkpasses"
CERT="$BASE_DIR/pass_certificate.p12"
WWDR="$BASE_DIR/wwdr.pem"
CERT_PASSWORD="Marcosis-1"

# Prepare output directory
mkdir -p "$OUTPUT_DIR"

# Convert .p12 to PEM format if not already done
openssl pkcs12 -in "$CERT" -clcerts -nokeys -out "$BASE_DIR/certificate.pem" -passin pass:$CERT_PASSWORD -legacy
openssl pkcs12 -in "$CERT" -nocerts -out "$BASE_DIR/key.pem" -nodes -passin pass:$CERT_PASSWORD -legacy

# Loop through all pass folders
for folder in "$PASSES_DIR"/PASS*; do
    [ -d "$folder" ] || continue

    echo "Processing $(basename "$folder")..."

    cd "$folder" || continue

    # Remove old manifest/signature if they exist
    rm -f manifest.json signature

    # Create manifest.json
    echo "{" > manifest.json
    first=true
    for file in *; do
        if [[ "$file" != "manifest.json" && "$file" != "signature" && -f "$file" ]]; then
            hash=$(shasum -a 1 "$file" | awk '{print $1}')
            if [ "$first" = true ]; then
                first=false
            else
                echo "," >> manifest.json
            fi
            echo "  \"$file\": \"$hash\"" >> manifest.json
        fi
    done
    echo "}" >> manifest.json

    # Sign the manifest.json
    openssl smime -binary -sign \
        -certfile "$WWDR" \
        -signer "$BASE_DIR/certificate.pem" \
        -inkey "$BASE_DIR/key.pem" \
        -in manifest.json \
        -out signature \
        -outform DER

    # Small delay to ensure signature is written before zipping
    sleep 1

    # Create the .pkpass file
    zip -r "$OUTPUT_DIR/$(basename "$folder").pkpass" . -x "*.DS_Store"

    cd "$BASE_DIR"
done

echo "✅ All .pkpass files are in $OUTPUT_DIR"
