#!/bin/bash

# Paths
qr_folder=~/Documents/qr_exports
pass_folder_base=~/Documents/passtest

# Start counter
i=1

# Loop through all PNGs in QR folder (in sorted order)
for qr_path in "$qr_folder"/*.png; do
    # Format pass ID
    pass_id=$(printf "PASS%03d" $i)
    target_dir="$pass_folder_base/$pass_id"

    if [ -d "$target_dir" ]; then
        cp "$qr_path" "$target_dir/qr.png"
        echo "✅ Copied $(basename "$qr_path") → $pass_id/qr.png"
    else
        echo "⚠️ Folder not found for $pass_id"
    fi

    ((i++))
done
