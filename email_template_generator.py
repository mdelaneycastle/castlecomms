#!/usr/bin/env python3
"""
Castle Fine Art - Email Template Generator
Creates Outlook-compatible .msg template files for review before sending
"""

import os
import json
import csv
import shutil
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import configparser
from datetime import datetime
from email_sender import EmailSender

class EmailTemplateGenerator:
    def __init__(self, config_file="email_config.ini"):
        self.email_sender = EmailSender(config_file)

    def generate_templates(self, event_dir, output_dir=None):
        """Generate email templates for all guests in an event"""

        if output_dir is None:
            output_dir = os.path.join(event_dir, "email_templates")

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        try:
            # Load event data
            event_info_path = os.path.join(event_dir, "event_info.json")
            with open(event_info_path, 'r') as f:
                event_data = json.load(f)

            # Load CSV data
            csv_path = os.path.join(event_dir, "csv", "guest_list.csv")
            with open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                guests = list(reader)

            # Load Google Wallet passes
            google_passes_file = os.path.join(event_dir, "google_passes", "google_wallet_passes.json")
            google_passes = {}
            if os.path.exists(google_passes_file):
                with open(google_passes_file, 'r') as f:
                    passes = json.load(f)
                    for pass_data in passes:
                        google_passes[pass_data['name']] = pass_data['wallet_url']

            # Load email template
            template_path = os.path.join(os.path.dirname(__file__), "wallettest", "google_wallet", "email_template.html")
            if not os.path.exists(template_path):
                template_path = "/Users/appleone/Documents/wallettest/google_wallet/email_template.html"

            with open(template_path, 'r') as f:
                template_html = f.read()

            # Email configuration
            subject_template = self.email_sender.config.get('EMAIL', 'subject_template')
            apple_passes_dir = os.path.join(event_dir, "apple_passes")

            results = {
                "total": len(guests),
                "generated": 0,
                "failed": 0,
                "errors": []
            }

            # Generate templates for each guest
            for i, guest in enumerate(guests):
                try:
                    print(f"📧 Generating template for {guest['name']}...")

                    # Get Google Wallet URL
                    google_url = google_passes.get(guest['name'], '#')

                    # Find Apple Wallet pass
                    apple_pass_file = os.path.join(apple_passes_dir, f"{guest['pass_id']}.pkpass")
                    apple_available = os.path.exists(apple_pass_file)

                    # Personalize email
                    subject = subject_template.format(event_name=event_data.get('name', 'Private View'))
                    personalized_html = self.email_sender.personalize_email_template(
                        template_html, guest, event_data, google_url, apple_available
                    )

                    # Create email message
                    message = self.email_sender.create_email_message(
                        guest['email'],
                        subject,
                        personalized_html,
                        apple_pass_file if apple_available else None
                    )

                    # Save as .eml file (cross-platform email format)
                    safe_name = guest['name'].replace(' ', '_').replace('/', '_')
                    template_filename = f"{guest['pass_id']}_{safe_name}.eml"
                    template_path = os.path.join(output_dir, template_filename)

                    with open(template_path, 'w', encoding='utf-8') as f:
                        f.write(message.as_string())

                    # Also create a preview HTML file
                    preview_filename = f"{guest['pass_id']}_{safe_name}_preview.html"
                    preview_path = os.path.join(output_dir, preview_filename)

                    with open(preview_path, 'w', encoding='utf-8') as f:
                        f.write(f"""<!DOCTYPE html>
<html>
<head>
    <title>Email Preview - {guest['name']}</title>
    <style>body {{ font-family: Arial, sans-serif; margin: 20px; }}</style>
</head>
<body>
    <h2>Email Preview for: {guest['name']}</h2>
    <p><strong>To:</strong> {guest['email']}</p>
    <p><strong>Subject:</strong> {subject}</p>
    <p><strong>Apple Wallet Pass:</strong> {'✅ Attached' if apple_available else '❌ Not Available'}</p>
    <hr>
    {personalized_html}
</body>
</html>""")

                    results['generated'] += 1
                    print(f"✅ Generated template: {template_filename}")

                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append(f"{guest['name']}: {str(e)}")
                    print(f"❌ Failed to generate template for {guest['name']}: {str(e)}")

            # Create summary file
            summary_path = os.path.join(output_dir, "generation_summary.json")
            with open(summary_path, 'w') as f:
                json.dump(results, f, indent=2)

            # Create README with instructions
            readme_path = os.path.join(output_dir, "README.txt")
            with open(readme_path, 'w') as f:
                f.write(f"""Castle Fine Art - Email Templates
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Event: {event_data.get('name', 'Unknown Event')}

Files in this folder:
- *.eml files: Email templates ready to send
- *_preview.html files: Preview what each email will look like
- generation_summary.json: Generation statistics
- send_all_templates.py: Script to send all templates

To review emails:
1. Open the *_preview.html files in your browser to see how each email looks
2. Check that Apple Wallet passes are attached where expected

To send all emails:
1. Review the preview files first
2. Run: python3 send_all_templates.py

Total templates generated: {results['generated']}
Total failures: {results['failed']}
""")

            print(f"\n📊 Template Generation Summary:")
            print(f"   Total: {results['total']}")
            print(f"   Generated: {results['generated']}")
            print(f"   Failed: {results['failed']}")
            print(f"\n📁 Templates saved to: {output_dir}")
            print(f"📖 Open the *_preview.html files to review each email")

            return {"success": True, "results": results, "output_dir": output_dir}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def generate_test_template(self, test_email, event_dir, output_dir=None):
        """Generate a single test email template"""

        if output_dir is None:
            output_dir = os.path.join(event_dir, "email_templates")

        os.makedirs(output_dir, exist_ok=True)

        try:
            # Load event data
            event_info_path = os.path.join(event_dir, "event_info.json")
            with open(event_info_path, 'r') as f:
                event_data = json.load(f)

            # Load first guest as sample
            csv_path = os.path.join(event_dir, "csv", "guest_list.csv")
            with open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                sample_guest = next(reader)

            # Load template
            template_path = "/Users/appleone/Documents/wallettest/google_wallet/email_template.html"
            with open(template_path, 'r') as f:
                template_html = f.read()

            # Create test email with sample data but test recipient
            sample_guest['email'] = test_email  # Override email to test address

            subject = self.email_sender.config.get('EMAIL', 'subject_template').format(
                event_name=event_data.get('name', 'Private View')
            )

            personalized_html = self.email_sender.personalize_email_template(
                template_html, sample_guest, event_data, "https://example.com/google-wallet-test", True
            )

            # Find Apple pass
            apple_passes_dir = os.path.join(event_dir, "apple_passes")
            apple_pass_file = os.path.join(apple_passes_dir, f"{sample_guest['pass_id']}.pkpass")

            message = self.email_sender.create_email_message(
                test_email, subject, personalized_html,
                apple_pass_file if os.path.exists(apple_pass_file) else None
            )

            # Save test template
            template_path = os.path.join(output_dir, "TEST_EMAIL.eml")
            with open(template_path, 'w', encoding='utf-8') as f:
                f.write(message.as_string())

            # Save preview
            preview_path = os.path.join(output_dir, "TEST_EMAIL_preview.html")
            with open(preview_path, 'w', encoding='utf-8') as f:
                f.write(f"""<!DOCTYPE html>
<html>
<head>
    <title>Test Email Preview</title>
    <style>body {{ font-family: Arial, sans-serif; margin: 20px; }}</style>
</head>
<body>
    <h2>Test Email Preview</h2>
    <p><strong>To:</strong> {test_email}</p>
    <p><strong>Subject:</strong> {subject}</p>
    <p><strong>Sample Data:</strong> {sample_guest['name']} ({sample_guest['guest_count']} guests)</p>
    <hr>
    {personalized_html}
</body>
</html>""")

            print(f"✅ Test template generated: {template_path}")
            print(f"🔍 Preview available: {preview_path}")

            return {"success": True, "template_path": template_path, "preview_path": preview_path}

        except Exception as e:
            return {"success": False, "error": str(e)}

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Generate Castle Fine Art email templates')
    parser.add_argument('--event-dir', required=True, help='Event directory path')
    parser.add_argument('--test-email', help='Generate test template for this email address')
    parser.add_argument('--output-dir', help='Output directory for templates')

    args = parser.parse_args()

    generator = EmailTemplateGenerator()

    if args.test_email:
        result = generator.generate_test_template(args.test_email, args.event_dir, args.output_dir)
    else:
        result = generator.generate_templates(args.event_dir, args.output_dir)

    if not result['success']:
        print(f"❌ Failed: {result['error']}")
        exit(1)

if __name__ == '__main__':
    main()