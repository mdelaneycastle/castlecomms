#!/bin/bash
set -euo pipefail

# --- Configuration ---
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PASSES_DIR="${PASSES_DIR:-$BASE_DIR/passtest}"      # where each pass folder lives
OUTPUT_DIR="${OUTPUT_DIR:-$BASE_DIR/pkpasses}"      # where .pkpass files will be written

CERT_P12="${CERT_P12:-$BASE_DIR/pass_certificate.p12}"
WWDR_PEM="${WWDR_PEM:-$BASE_DIR/wwdr.pem}"
CERT_PASSWORD="${CERT_PASSWORD:-change-me}"

CERT_PEM="$BASE_DIR/pass_cert.pem"
KEY_PEM="$BASE_DIR/pass_key.pem"

mkdir -p "$OUTPUT_DIR"

# --- Prepare cert/key (idempotent) ---
if [[ ! -f "$CERT_PEM" || ! -f "$KEY_PEM" ]]; then
  if [[ ! -f "$CERT_P12" ]]; then
    echo "❌ Missing $CERT_P12"; exit 1
  fi
  echo "🔐 Converting P12 -> PEM/key ..."
  # leaf cert
  openssl pkcs12 -in "$CERT_P12" -clcerts -nokeys -out "$CERT_PEM" -passin "pass:$CERT_PASSWORD"
  # private key (unencrypted, for non-interactive signing)
  openssl pkcs12 -in "$CERT_P12" -nocerts -nodes -out "$BASE_DIR/_tmp_key.pem" -passin "pass:$CERT_PASSWORD"
  # strip bag headers
  openssl rsa -in "$BASE_DIR/_tmp_key.pem" -out "$KEY_PEM" >/dev/null 2>&1
  rm -f "$BASE_DIR/_tmp_key.pem"
fi

if [[ ! -f "$WWDR_PEM" ]]; then
  echo "❌ Missing Apple WWDR PEM: $WWDR_PEM"; exit 1
fi

# --- Helper: build manifest with a stabilization loop ---
build_and_sign() {
  local folder="$1"
  pushd "$folder" >/dev/null

  # loop until the set of files (excluding manifest.json & signature) is stable
  local max_iter=5
  local iter=1
  while (( iter <= max_iter )); do
    # enumerate current files to include (portable across macOS/Linux)
    before_list="$(ls -1A | grep -v -E '^(manifest\.json|signature)$' | LC_ALL=C sort || true)"

    # write manifest with sha1 for every file
    python3 - "$folder" <<'PY'
import hashlib, json, os, sys
folder = sys.argv[1]
names = sorted([n for n in os.listdir(folder) 
                if os.path.isfile(os.path.join(folder,n)) 
                and n not in ('manifest.json','signature')])
manifest = {}
for n in names:
    with open(os.path.join(folder,n),'rb') as f:
        manifest[n] = hashlib.sha1(f.read()).hexdigest()
with open(os.path.join(folder,'manifest.json'),'w') as fp:
    json.dump(manifest, fp, separators=(',',':'))
PY

    # sign the manifest
    openssl smime -binary -sign \
      -signer "$CERT_PEM" \
      -inkey "$KEY_PEM" \
      -certfile "$WWDR_PEM" \
      -in manifest.json -out signature -outform DER >/dev/null 2>&1

    # re-enumerate after signing; if anything changed (e.g., background.png arrived late), loop
    after_list="$(ls -1A | grep -v -E '^(manifest\.json|signature)$' | LC_ALL=C sort || true)"
    if [[ "$before_list" == "$after_list" ]]; then
      # also verify there are no files not listed in manifest and sha1s match
      status="$(python3 - <<'PY'
import json, hashlib, os
with open('manifest.json','r') as fp:
    m = json.load(fp)
files = sorted([n for n in os.listdir('.') if os.path.isfile(n) and n not in ('manifest.json','signature')])
extra = [n for n in files if n not in m]
missing = [n for n in m if n not in files]
bad = []
for n in files:
    h = hashlib.sha1(open(n,'rb').read()).hexdigest()
    if m.get(n) != h:
        bad.append(n)
print("OK" if not(extra or missing or bad) else "UNSTABLE")
PY
)"
      if [[ "$status" == "OK" ]]; then
        break
      fi
    fi
    ((iter++))
    sleep 0.2
  done

  if (( iter > max_iter )); then
    echo "❌ Could not reach a stable manifest for $(basename "$folder")"
    popd >/dev/null
    return 1
  fi

  # zip to pkpass (root files only, strip mac attrs)
  rm -f "$OUTPUT_DIR/$(basename "$folder").pkpass"
  zip -r -X "$OUTPUT_DIR/$(basename "$folder").pkpass" . -x "*.DS_Store" >/dev/null
  popd >/dev/null
  echo "✅ Packed $(basename "$folder").pkpass"
}

# --- Iterate all pass folders ---
shopt -s nullglob
for folder in "$PASSES_DIR"/*/; do
  # must contain at least pass.json
  if [[ ! -f "$folder/pass.json" ]]; then
    echo "⏭️  Skipping $(basename "$folder") (no pass.json)"
    continue
  fi
  build_and_sign "$folder"
done

echo "🎉 All done. Files in: $OUTPUT_DIR"
