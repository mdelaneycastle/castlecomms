#!/usr/bin/env python3
"""
Castle Fine Art - Event Workflow Coordinator
Orchestrates QR generation, Apple Wallet, Google Wallet, and email sending
"""

from flask import Flask, request, jsonify, send_file, send_from_directory
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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # repo root
WALLETTEST_DIR = os.path.join(BASE_DIR, "wallettest")  # inside repo
EVENTS_DIR = os.path.join(BASE_DIR, "events")          # inside repo
QR_EXPORTS_DIR = os.path.join(WALLETTEST_DIR, "qr_exports")
GOOGLE_WALLET_DIR = os.path.join(WALLETTEST_DIR, "google_wallet")

# Progress tracking with file persistence
PROGRESS_FILE = os.path.join(BASE_DIR, "progress_data.json")

def load_progress_data():
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}

def save_progress_data(data):
    try:
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except:
        pass

progress_data = load_progress_data()

class EventCoordinator:
    def __init__(self, event_name):
        self.event_name = event_name
        self.event_dir = os.path.join(EVENTS_DIR, event_name)
        self.ensure_directories()

    def ensure_directories(self):
        directories = [
            self.event_dir,
            os.path.join(self.event_dir, "csv"),
            os.path.join(self.event_dir, "qr_codes"),
            os.path.join(self.event_dir, "apple_passes"),
            os.path.join(self.event_dir, "google_passes"),
            os.path.join(self.event_dir, "emails"),
            QR_EXPORTS_DIR
        ]
        for directory in directories:
            os.makedirs(directory, exist_ok=True)

    def save_csv_data(self, csv_data):
        csv_path = os.path.join(self.event_dir, "csv", "guest_list.csv")
        with open(csv_path, 'w', newline='', encoding='utf-8') as file:
            if csv_data:
                writer = csv.DictWriter(file, fieldnames=csv_data[0].keys())
                writer.writeheader()
                writer.writerows(csv_data)
        return csv_path

    def extract_qr_codes(self, qr_zip_path):
        try:
            for file in glob.glob(os.path.join(QR_EXPORTS_DIR, "*.png")):
                os.remove(file)
            with zipfile.ZipFile(qr_zip_path, 'r') as zip_ref:
                zip_ref.extractall(QR_EXPORTS_DIR)
            for root, dirs, files in os.walk(QR_EXPORTS_DIR):
                for file in files:
                    if file.endswith('.png') and root != QR_EXPORTS_DIR:
                        shutil.move(os.path.join(root, file), os.path.join(QR_EXPORTS_DIR, file))
            for root, dirs, files in os.walk(QR_EXPORTS_DIR, topdown=False):
                for dir in dirs:
                    dir_path = os.path.join(root, dir)
                    if not os.listdir(dir_path):
                        os.rmdir(dir_path)
            qr_event_dir = os.path.join(self.event_dir, "qr_codes")
            for file in glob.glob(os.path.join(QR_EXPORTS_DIR, "*.png")):
                shutil.copy2(file, qr_event_dir)
            qr_count = len(glob.glob(os.path.join(QR_EXPORTS_DIR, "*.png")))
            return {"success": True, "qr_count": qr_count}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def generate_apple_wallet_passes(self, csv_path, event_name=None):
        """Run Apple Wallet generation with live debug logs"""
        try:
            self.update_generate_passes_csv_path(csv_path)

            def run_subprocess(cmd, cwd, step_name):
                import select
                import time
                
                process = subprocess.Popen(
                    cmd,
                    cwd=cwd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )
                logs = []
                start_time = time.time()
                
                try:
                    while True:
                        # Check if process is still running
                        poll_result = process.poll()
                        if poll_result is not None:
                            break
                            
                        # Check for timeout (10 minutes)
                        if time.time() - start_time > 600:
                            print(f"[{step_name}] Process timed out after 10 minutes")
                            process.kill()
                            if event_name:
                                progress_data[event_name]["status"] = f"{step_name} timed out after 10 minutes"
                                save_progress_data(progress_data)
                            return 1, f"{step_name} timed out after 10 minutes"
                        
                        # Read available output
                        line = process.stdout.readline()
                        if line:
                            line = line.strip()
                            logs.append(line)
                            print(f"[{step_name}] {line}")
                            if event_name:
                                progress_data[event_name]["status"] = f"{step_name}: {line}"
                                save_progress_data(progress_data)
                                
                                # Extract progress from create_passes.sh output
                                if step_name == "create_passes.sh" and "Processing PASS" in line and "/" in line:
                                    try:
                                        # Extract current/total from "Processing PASS001... (1/50)"
                                        parts = line.split("(")[1].split(")")[0].split("/")
                                        current = int(parts[0])
                                        total = int(parts[1])
                                        # Map progress from 50% to 90% based on pass processing
                                        base_progress = 50
                                        max_progress = 90
                                        progress_range = max_progress - base_progress
                                        pass_progress = int(base_progress + (current / total) * progress_range)
                                        progress_data[event_name]["progress"] = pass_progress
                                        save_progress_data(progress_data)
                                    except (IndexError, ValueError):
                                        pass  # Ignore parsing errors
                        
                        time.sleep(0.1)  # Small delay to prevent busy waiting
                    
                    # Get any remaining output
                    remaining_stdout, stderr_output = process.communicate()
                    if remaining_stdout:
                        for line in remaining_stdout.splitlines():
                            line = line.strip()
                            if line:
                                logs.append(line)
                                print(f"[{step_name}] {line}")
                                if event_name:
                                    progress_data[event_name]["status"] = f"{step_name}: {line}"
                                    save_progress_data(progress_data)
                    
                    # Process stderr
                    if stderr_output:
                        print(f"[{step_name} ERROR] {stderr_output}")
                        if event_name:
                            progress_data[event_name]["status"] = f"{step_name} ERROR: {stderr_output}"
                            save_progress_data(progress_data)
                        logs.append(stderr_output)
                        
                    return process.returncode, "\n".join(logs)
                    
                except Exception as e:
                    print(f"[{step_name}] Error during execution: {e}")
                    process.kill()
                    if event_name:
                        progress_data[event_name]["status"] = f"{step_name} error: {e}"
                        save_progress_data(progress_data)
                    return 1, f"{step_name} error: {e}"

            # Step 1
            if event_name:
                progress_data[event_name]["status"] = "Starting generate_passes.py..."
                progress_data[event_name]["progress"] = 10
                save_progress_data(progress_data)
            code1, logs1 = run_subprocess(
                ["python3", os.path.join(WALLETTEST_DIR, "generate_passes.py")],
                cwd=WALLETTEST_DIR,
                step_name="generate_passes.py"
            )
            if code1 != 0:
                return {"success": False, "error": f"generate_passes.py failed:\n{logs1}"}

            # Step 2
            if event_name:
                progress_data[event_name]["status"] = "Starting create_passes.sh..."
                progress_data[event_name]["progress"] = 50
                save_progress_data(progress_data)
            code2, logs2 = run_subprocess(
                ["bash", os.path.join(WALLETTEST_DIR, "create_passes.sh")],
                cwd=WALLETTEST_DIR,
                step_name="create_passes.sh"
            )
            if code2 != 0:
                return {"success": False, "error": f"create_passes.sh failed:\n{logs2}"}
                
            # Step 3 - Copying files
            if event_name:
                progress_data[event_name]["status"] = "Copying passes to event directory..."
                progress_data[event_name]["progress"] = 90
                save_progress_data(progress_data)

            pkpass_dir = os.path.join(WALLETTEST_DIR, "pkpasses")
            event_apple_dir = os.path.join(self.event_dir, "apple_passes")
            os.makedirs(event_apple_dir, exist_ok=True)  # ensure it exists

            if os.path.exists(pkpass_dir):
                for file in glob.glob(os.path.join(pkpass_dir, "*.pkpass")):
                    try:
                        shutil.copy2(file, event_apple_dir)
                        print(f"[Apple Wallet] Copied {os.path.basename(file)} → {event_apple_dir}")
                    except Exception as e:
                        print(f"[Apple Wallet ERROR] Failed copying {file}: {e}")

            pass_count = len(glob.glob(os.path.join(event_apple_dir, "*.pkpass")))
            print(f"[Apple Wallet] Final pass count: {pass_count}")
            return {"success": True, "pass_count": pass_count}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_generate_passes_csv_path(self, csv_path):
        script = os.path.join(WALLETTEST_DIR, "generate_passes.py")
        with open(script, 'r') as f:
            content = f.read()
        backup = script + ".backup"
        shutil.copy2(script, backup)
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('csv_path = '):
                lines[i] = f'csv_path = "{csv_path}"'
                break
        with open(script, 'w') as f:
            f.write('\n'.join(lines))

    def restore_generate_passes_script(self):
        script = os.path.join(WALLETTEST_DIR, "generate_passes.py")
        backup = script + ".backup"
        if os.path.exists(backup):
            shutil.copy2(backup, script)
            os.remove(backup)

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

                # Update Apple Wallet download link
                from urllib.parse import quote
                encoded_event_name = quote(self.event_name)
                apple_download_url = f"http://localhost:5001/api/events/{encoded_event_name}/apple-pass/{row['pass_id']}"
                personalized_email = personalized_email.replace('APPLE_WALLET_DOWNLOAD_LINK', apple_download_url)
                
                # Update Google Wallet URL
                google_url = google_passes.get(row['name'], '#')
                if google_url != '#':
                    # Find and replace the entire href attribute for Google Wallet button
                    import re
                    google_pattern = r'href="https://pay\.google\.com/gp/v/save/[^"]*"'
                    personalized_email = re.sub(google_pattern, f'href="{google_url}"', personalized_email)

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
    def generate_async():
        progress_data[event_name] = {"step": "apple_wallet", "progress": 0, "status": "Starting..."}
        save_progress_data(progress_data)
        try:
            coordinator = EventCoordinator(event_name)
            csv_path = os.path.join(coordinator.event_dir, "csv", "guest_list.csv")
            progress_data[event_name]["progress"] = 25
            progress_data[event_name]["status"] = "Running generate_passes.py..."
            save_progress_data(progress_data)
            result = coordinator.generate_apple_wallet_passes(csv_path, event_name=event_name)
            progress_data[event_name]["progress"] = 100
            if result["success"]:
                progress_data[event_name]["status"] = f"Generated {result['pass_count']} passes"
                progress_data[event_name]["completed"] = True
                progress_data[event_name]["pass_count"] = result['pass_count']
                save_progress_data(progress_data)
            else:
                progress_data[event_name]["status"] = f"Error: {result['error']}"
                progress_data[event_name]["error"] = result['error']
                save_progress_data(progress_data)
            coordinator.restore_generate_passes_script()
        except Exception as e:
            progress_data[event_name]["status"] = f"Error: {str(e)}"
            progress_data[event_name]["error"] = str(e)
            save_progress_data(progress_data)
    thread = threading.Thread(target=generate_async)
    thread.start()
    return jsonify({"success": True, "message": "Apple Wallet generation started"})


@app.route('/api/events/<event_name>/google-wallet', methods=['POST'])
def generate_google_wallet(event_name):
    """Generate Google Wallet passes"""
    def generate_async():
        progress_data[event_name] = {"step": "google_wallet", "progress": 0, "status": "Starting..."}
        save_progress_data(progress_data)

        try:
            coordinator = EventCoordinator(event_name)
            csv_path = os.path.join(coordinator.event_dir, "csv", "guest_list.csv")

            progress_data[event_name]["progress"] = 25
            progress_data[event_name]["status"] = "Authenticating with Google Wallet API..."
            save_progress_data(progress_data)
            time.sleep(1)

            progress_data[event_name]["progress"] = 50
            progress_data[event_name]["status"] = "Creating pass objects..."
            save_progress_data(progress_data)

            result = coordinator.generate_google_wallet_passes(csv_path)

            progress_data[event_name]["progress"] = 100
            if result["success"]:
                progress_data[event_name]["status"] = f"Generated {result['pass_count']} passes"
                progress_data[event_name]["completed"] = True
                progress_data[event_name]["pass_count"] = result['pass_count']
                save_progress_data(progress_data)
            else:
                progress_data[event_name]["status"] = f"Error: {result['error']}"
                progress_data[event_name]["error"] = result['error']
                save_progress_data(progress_data)

            # Restore original script
            coordinator.restore_google_wallet_script()

        except Exception as e:
            progress_data[event_name]["status"] = f"Error: {str(e)}"
            progress_data[event_name]["error"] = str(e)
            save_progress_data(progress_data)

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
        save_progress_data(progress_data)

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
                save_progress_data(progress_data)

                # Simulate email sending delay
                time.sleep(0.2)

            progress_data[event_name]["completed"] = True
            progress_data[event_name]["status"] = f"All {total_guests} emails sent successfully"
            save_progress_data(progress_data)

        except Exception as e:
            progress_data[event_name]["status"] = f"Error: {str(e)}"
            progress_data[event_name]["error"] = str(e)
            save_progress_data(progress_data)

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


@app.route('/api/events/<event_name>/apple-pass/<pass_id>', methods=['GET'])
def download_apple_pass(event_name, pass_id):
    """Download individual Apple Wallet pass"""
    try:
        coordinator = EventCoordinator(event_name)
        apple_dir = os.path.join(coordinator.event_dir, "apple_passes")
        pass_file = os.path.join(apple_dir, f"{pass_id}.pkpass")
        
        if os.path.exists(pass_file):
            return send_file(pass_file, 
                           as_attachment=True, 
                           download_name=f"{pass_id}.pkpass",
                           mimetype='application/vnd.apple.pkpass')
        else:
            return jsonify({"error": "Pass not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/')
def index():
    """Serve the event workflow HTML interface"""
    return send_from_directory(BASE_DIR, 'event-workflow.html')


@app.route('/api/customize', methods=['POST'])
def customize_pass_route():
    """Handle pass customization form submission"""
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from apple_pass_customizer import customize_pass
        return customize_pass()
    except ImportError as e:
        print(f"Import error: {e}")
        return jsonify({"error": f"Pass customizer not available: {str(e)}"}), 500
    except Exception as e:
        print(f"Error in customize: {e}")
        return jsonify({"error": f"Customization failed: {str(e)}"}), 500


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files like JS, CSS, etc."""
    return send_from_directory(BASE_DIR, filename)


if __name__ == '__main__':
    # Ensure base directories exist
    os.makedirs(EVENTS_DIR, exist_ok=True)
    os.makedirs(QR_EXPORTS_DIR, exist_ok=True)

    print("🚀 Castle Fine Art Event Workflow Coordinator starting...")
    print(f"📁 Events directory: {EVENTS_DIR}")
    print(f"📁 Wallettest directory: {WALLETTEST_DIR}")
    print("🌐 Server running on http://localhost:5001")

    app.run(debug=False, host='0.0.0.0', port=5001)
