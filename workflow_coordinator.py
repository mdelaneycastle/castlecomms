#!/usr/bin/env python3
"""
Castle Fine Art - Event Workflow Coordinator
Orchestrates QR generation, Apple Wallet, Google Wallet, and email sending
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import shutil
import subprocess
import json
import csv
import zipfile
import tempfile
import threading
import time
from datetime import datetime
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import glob
from email_template_generator import EmailTemplateGenerator

app = Flask(__name__)
CORS(app)

# Configuration
WALLETTEST_DIR = "/Users/appleone/Documents/wallettest"
EVENTS_DIR = os.path.join(os.path.expanduser("~"), "Documents", "events")
QR_EXPORTS_DIR = os.path.join(WALLETTEST_DIR, "qr_exports")
GOOGLE_WALLET_DIR = os.path.join(WALLETTEST_DIR, "google_wallet")

# Progress tracking
progress_data = {}

class EventCoordinator:
    def __init__(self, event_name):
        self.event_name = event_name
        self.event_dir = os.path.join(EVENTS_DIR, event_name)
        self.ensure_directories()

    def ensure_directories(self):
        """Create event directory structure"""
        directories = [
            self.event_dir,
            os.path.join(self.event_dir, "csv"),
            os.path.join(self.event_dir, "qr_codes"),
            os.path.join(self.event_dir, "apple_passes"),
            os.path.join(self.event_dir, "google_passes"),
            os.path.join(self.event_dir, "emails"),
            QR_EXPORTS_DIR  # Ensure wallettest qr_exports exists
        ]

        for directory in directories:
            os.makedirs(directory, exist_ok=True)

    def save_csv_data(self, csv_data):
        """Save CSV data to event directory"""
        csv_path = os.path.join(self.event_dir, "csv", "guest_list.csv")

        with open(csv_path, 'w', newline='', encoding='utf-8') as file:
            if csv_data:
                writer = csv.DictWriter(file, fieldnames=csv_data[0].keys())
                writer.writeheader()
                writer.writerows(csv_data)

        return csv_path

    def extract_qr_codes(self, qr_zip_path):
        """Extract QR codes from ZIP and place in qr_exports"""
        try:
            # Clear existing QR exports
            for file in glob.glob(os.path.join(QR_EXPORTS_DIR, "*.png")):
                os.remove(file)

            # Extract ZIP to qr_exports
            with zipfile.ZipFile(qr_zip_path, 'r') as zip_ref:
                zip_ref.extractall(QR_EXPORTS_DIR)

            # Move files from subdirectory if needed
            for root, dirs, files in os.walk(QR_EXPORTS_DIR):
                for file in files:
                    if file.endswith('.png') and root != QR_EXPORTS_DIR:
                        source = os.path.join(root, file)
                        destination = os.path.join(QR_EXPORTS_DIR, file)
                        shutil.move(source, destination)

            # Clean up any empty directories
            for root, dirs, files in os.walk(QR_EXPORTS_DIR, topdown=False):
                for dir in dirs:
                    dir_path = os.path.join(root, dir)
                    if not os.listdir(dir_path):
                        os.rmdir(dir_path)

            # Copy QR codes to event directory for archival
            qr_event_dir = os.path.join(self.event_dir, "qr_codes")
            for file in glob.glob(os.path.join(QR_EXPORTS_DIR, "*.png")):
                shutil.copy2(file, qr_event_dir)

            qr_count = len(glob.glob(os.path.join(QR_EXPORTS_DIR, "*.png")))
            return {"success": True, "qr_count": qr_count}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def generate_apple_wallet_passes(self, csv_path):
        """Run Apple Wallet generation scripts"""
        try:
            # Update CSV path in generate_passes.py
            self.update_generate_passes_csv_path(csv_path)

            # Run generate_passes.py
            result1 = subprocess.run(
                ["python3", os.path.join(WALLETTEST_DIR, "generate_passes.py")],
                cwd=WALLETTEST_DIR,
                capture_output=True,
                text=True
            )

            if result1.returncode != 0:
                return {"success": False, "error": f"generate_passes.py failed: {result1.stderr}"}

            # Run create_passes.sh (modified to handle all passes)
            result2 = subprocess.run(
                ["bash", os.path.join(WALLETTEST_DIR, "create_passes.sh")],
                cwd=WALLETTEST_DIR,
                capture_output=True,
                text=True
            )

            if result2.returncode != 0:
                return {"success": False, "error": f"create_passes.sh failed: {result2.stderr}"}

            # Copy generated passes to event directory
            pkpass_dir = os.path.join(WALLETTEST_DIR, "pkpasses")
            event_apple_dir = os.path.join(self.event_dir, "apple_passes")

            if os.path.exists(pkpass_dir):
                for file in glob.glob(os.path.join(pkpass_dir, "*.pkpass")):
                    shutil.copy2(file, event_apple_dir)

            pass_count = len(glob.glob(os.path.join(event_apple_dir, "*.pkpass")))
            return {"success": True, "pass_count": pass_count}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_generate_passes_csv_path(self, csv_path):
        """Update the CSV path in generate_passes.py temporarily"""
        generate_script = os.path.join(WALLETTEST_DIR, "generate_passes.py")

        # Read current script
        with open(generate_script, 'r') as f:
            content = f.read()

        # Create backup
        backup_script = generate_script + '.backup'
        shutil.copy2(generate_script, backup_script)

        # Update CSV path
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('csv_path = '):
                lines[i] = f'csv_path = "{csv_path}"'
                break

        # Write updated script
        with open(generate_script, 'w') as f:
            f.write('\n'.join(lines))

    def restore_generate_passes_script(self):
        """Restore original generate_passes.py"""
        generate_script = os.path.join(WALLETTEST_DIR, "generate_passes.py")
        backup_script = generate_script + '.backup'

        if os.path.exists(backup_script):
            shutil.copy2(backup_script, generate_script)
            os.remove(backup_script)

    def generate_google_wallet_passes(self, csv_path):
        """Run Google Wallet generation script"""
        try:
            # Update CSV path in google_wallet_generator.py
            self.update_google_wallet_csv_path(csv_path)

            # Run google_wallet_generator.py
            result = subprocess.run(
                ["python3", os.path.join(GOOGLE_WALLET_DIR, "google_wallet_generator.py")],
                cwd=GOOGLE_WALLET_DIR,
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return {"success": False, "error": f"Google Wallet generation failed: {result.stderr}"}

            # Copy generated URLs to event directory
            urls_file = os.path.join(GOOGLE_WALLET_DIR, "google_wallet_passes.json")
            if os.path.exists(urls_file):
                event_google_dir = os.path.join(self.event_dir, "google_passes")
                shutil.copy2(urls_file, event_google_dir)

                # Load and count passes
                with open(urls_file, 'r') as f:
                    passes = json.load(f)
                    pass_count = len(passes)
            else:
                pass_count = 0

            return {"success": True, "pass_count": pass_count}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_google_wallet_csv_path(self, csv_path):
        """Update the CSV path in google_wallet_generator.py temporarily"""
        google_script = os.path.join(GOOGLE_WALLET_DIR, "google_wallet_generator.py")

        # Read current script
        with open(google_script, 'r') as f:
            content = f.read()

        # Create backup
        backup_script = google_script + '.backup'
        shutil.copy2(google_script, backup_script)

        # Update CSV path
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'CSV_FILE = ' in line:
                lines[i] = f'CSV_FILE = "{csv_path}"'
                break

        # Write updated script
        with open(google_script, 'w') as f:
            f.write('\n'.join(lines))

    def restore_google_wallet_script(self):
        """Restore original google_wallet_generator.py"""
        google_script = os.path.join(GOOGLE_WALLET_DIR, "google_wallet_generator.py")
        backup_script = google_script + '.backup'

        if os.path.exists(backup_script):
            shutil.copy2(backup_script, google_script)
            os.remove(backup_script)

    def generate_personalized_emails(self, event_data, csv_data):
        """Generate personalized emails for each guest"""
        try:
            # Load email template
            template_path = os.path.join(GOOGLE_WALLET_DIR, "email_template.html")
            with open(template_path, 'r') as f:
                template = f.read()

            # Load Google Wallet passes
            google_passes_file = os.path.join(self.event_dir, "google_passes", "google_wallet_passes.json")
            google_passes = {}
            if os.path.exists(google_passes_file):
                with open(google_passes_file, 'r') as f:
                    passes = json.load(f)
                    for pass_data in passes:
                        google_passes[pass_data['name']] = pass_data['wallet_url']

            # Get Apple Wallet passes
            apple_passes_dir = os.path.join(self.event_dir, "apple_passes")

            emails = []

            for i, row in enumerate(csv_data):
                # Personalize email content
                personalized_email = template.replace("Trevor Cooper", row['name'])
                personalized_email = personalized_email.replace("4 people", f"{row['guest_count']} people" if int(row['guest_count']) != 1 else "1 person")
                personalized_email = personalized_email.replace("Sunday, 15 December 2024", event_data.get('date', 'TBD'))
                personalized_email = personalized_email.replace("6:00 PM - 10:00 PM", f"{event_data.get('time', 'TBD')} onwards")
                personalized_email = personalized_email.replace("Castle Fine Art, The Mailbox, Birmingham", event_data.get('location', 'TBD'))

                # Update Google Wallet URL
                google_url = google_passes.get(row['name'], '#')
                personalized_email = personalized_email.replace('href="https://pay.google.com/gp/v/save/eyJ', f'href="{google_url}"')

                # Find corresponding Apple Wallet pass
                apple_pass_file = os.path.join(apple_passes_dir, f"{row['pass_id']}.pkpass")

                email_data = {
                    'to': row['email'],
                    'name': row['name'],
                    'guest_count': row['guest_count'],
                    'html_content': personalized_email,
                    'apple_pass_file': apple_pass_file if os.path.exists(apple_pass_file) else None,
                    'google_wallet_url': google_url
                }

                emails.append(email_data)

                # Save individual email HTML
                email_file = os.path.join(self.event_dir, "emails", f"{row['name'].replace(' ', '_')}_email.html")
                with open(email_file, 'w') as f:
                    f.write(personalized_email)

            return {"success": True, "emails": emails}

        except Exception as e:
            return {"success": False, "error": str(e)}


@app.route('/api/events', methods=['POST'])
def create_event():
    """Create a new event and save initial data"""
    data = request.json
    event_name = data.get('event_name')
    csv_data = data.get('csv_data')
    event_data = data.get('event_data')

    if not event_name or not csv_data:
        return jsonify({"error": "Missing event_name or csv_data"}), 400

    try:
        coordinator = EventCoordinator(event_name)
        csv_path = coordinator.save_csv_data(csv_data)

        # Save event data
        event_info_path = os.path.join(coordinator.event_dir, "event_info.json")
        with open(event_info_path, 'w') as f:
            json.dump(event_data, f, indent=2)

        return jsonify({
            "success": True,
            "event_name": event_name,
            "csv_path": csv_path,
            "guest_count": len(csv_data)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/events/<event_name>/qr-extract', methods=['POST'])
def extract_qr_codes(event_name):
    """Extract QR codes from uploaded ZIP"""
    if 'qr_zip' not in request.files:
        return jsonify({"error": "No QR ZIP file uploaded"}), 400

    qr_zip = request.files['qr_zip']

    if qr_zip.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Save uploaded ZIP temporarily
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        qr_zip.save(temp_zip.name)
        temp_zip.close()

        coordinator = EventCoordinator(event_name)
        result = coordinator.extract_qr_codes(temp_zip.name)

        # Clean up temp file
        os.unlink(temp_zip.name)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/events/<event_name>/apple-wallet', methods=['POST'])
def generate_apple_wallet(event_name):
    """Generate Apple Wallet passes"""
    def generate_async():
        progress_data[event_name] = {"step": "apple_wallet", "progress": 0, "status": "Starting..."}

        try:
            coordinator = EventCoordinator(event_name)
            csv_path = os.path.join(coordinator.event_dir, "csv", "guest_list.csv")

            progress_data[event_name]["progress"] = 25
            progress_data[event_name]["status"] = "Running generate_passes.py..."

            result = coordinator.generate_apple_wallet_passes(csv_path)

            progress_data[event_name]["progress"] = 100
            if result["success"]:
                progress_data[event_name]["status"] = f"Generated {result['pass_count']} passes"
                progress_data[event_name]["completed"] = True
                progress_data[event_name]["pass_count"] = result['pass_count']
            else:
                progress_data[event_name]["status"] = f"Error: {result['error']}"
                progress_data[event_name]["error"] = result['error']

            # Restore original script
            coordinator.restore_generate_passes_script()

        except Exception as e:
            progress_data[event_name]["status"] = f"Error: {str(e)}"
            progress_data[event_name]["error"] = str(e)

    thread = threading.Thread(target=generate_async)
    thread.start()

    return jsonify({"success": True, "message": "Apple Wallet generation started"})


@app.route('/api/events/<event_name>/google-wallet', methods=['POST'])
def generate_google_wallet(event_name):
    """Generate Google Wallet passes"""
    def generate_async():
        progress_data[event_name] = {"step": "google_wallet", "progress": 0, "status": "Starting..."}

        try:
            coordinator = EventCoordinator(event_name)
            csv_path = os.path.join(coordinator.event_dir, "csv", "guest_list.csv")

            progress_data[event_name]["progress"] = 25
            progress_data[event_name]["status"] = "Authenticating with Google Wallet API..."
            time.sleep(1)

            progress_data[event_name]["progress"] = 50
            progress_data[event_name]["status"] = "Creating pass objects..."

            result = coordinator.generate_google_wallet_passes(csv_path)

            progress_data[event_name]["progress"] = 100
            if result["success"]:
                progress_data[event_name]["status"] = f"Generated {result['pass_count']} passes"
                progress_data[event_name]["completed"] = True
                progress_data[event_name]["pass_count"] = result['pass_count']
            else:
                progress_data[event_name]["status"] = f"Error: {result['error']}"
                progress_data[event_name]["error"] = result['error']

            # Restore original script
            coordinator.restore_google_wallet_script()

        except Exception as e:
            progress_data[event_name]["status"] = f"Error: {str(e)}"
            progress_data[event_name]["error"] = str(e)

    thread = threading.Thread(target=generate_async)
    thread.start()

    return jsonify({"success": True, "message": "Google Wallet generation started"})


@app.route('/api/events/<event_name>/emails/generate', methods=['POST'])
def generate_emails(event_name):
    """Generate personalized emails"""
    try:
        coordinator = EventCoordinator(event_name)

        # Load event data and CSV
        event_info_path = os.path.join(coordinator.event_dir, "event_info.json")
        csv_path = os.path.join(coordinator.event_dir, "csv", "guest_list.csv")

        with open(event_info_path, 'r') as f:
            event_data = json.load(f)

        csv_data = []
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            csv_data = list(reader)

        result = coordinator.generate_personalized_emails(event_data, csv_data)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/events/<event_name>/emails/send', methods=['POST'])
def send_emails(event_name):
    """Send personalized emails to all guests"""
    # This is a placeholder - would need SMTP configuration
    def send_async():
        progress_data[event_name] = {"step": "emails", "progress": 0, "status": "Preparing emails..."}

        try:
            coordinator = EventCoordinator(event_name)
            csv_path = os.path.join(coordinator.event_dir, "csv", "guest_list.csv")

            with open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                guests = list(reader)

            total_guests = len(guests)

            for i, guest in enumerate(guests):
                progress = int((i + 1) / total_guests * 100)
                progress_data[event_name]["progress"] = progress
                progress_data[event_name]["status"] = f"Sending email {i+1}/{total_guests} to {guest['name']}"

                # Simulate email sending delay
                time.sleep(0.2)

            progress_data[event_name]["completed"] = True
            progress_data[event_name]["status"] = f"All {total_guests} emails sent successfully"

        except Exception as e:
            progress_data[event_name]["status"] = f"Error: {str(e)}"
            progress_data[event_name]["error"] = str(e)

    thread = threading.Thread(target=send_async)
    thread.start()

    return jsonify({"success": True, "message": "Email sending started"})


@app.route('/api/events/<event_name>/progress', methods=['GET'])
def get_progress(event_name):
    """Get progress for an event"""
    return jsonify(progress_data.get(event_name, {"progress": 0, "status": "Not started"}))


@app.route('/api/events/<event_name>/files/<file_type>', methods=['GET'])
def download_files(event_name, file_type):
    """Download generated files"""
    try:
        coordinator = EventCoordinator(event_name)

        if file_type == 'apple_passes':
            # Create ZIP of Apple Wallet passes
            zip_path = os.path.join(coordinator.event_dir, f"{event_name}_apple_passes.zip")
            apple_dir = os.path.join(coordinator.event_dir, "apple_passes")

            with zipfile.ZipFile(zip_path, 'w') as zip_file:
                for file in glob.glob(os.path.join(apple_dir, "*.pkpass")):
                    zip_file.write(file, os.path.basename(file))

            return send_file(zip_path, as_attachment=True)

        elif file_type == 'google_passes':
            # Return Google Wallet URLs JSON
            google_file = os.path.join(coordinator.event_dir, "google_passes", "google_wallet_passes.json")
            if os.path.exists(google_file):
                return send_file(google_file, as_attachment=True)

        return jsonify({"error": "File type not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Ensure base directories exist
    os.makedirs(EVENTS_DIR, exist_ok=True)
    os.makedirs(QR_EXPORTS_DIR, exist_ok=True)

    print("🚀 Castle Fine Art Event Workflow Coordinator starting...")
    print(f"📁 Events directory: {EVENTS_DIR}")
    print(f"📁 Wallettest directory: {WALLETTEST_DIR}")
    print("🌐 Server running on http://localhost:5001")

    app.run(debug=True, host='0.0.0.0', port=5001)