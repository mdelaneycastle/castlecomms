#!/usr/bin/env python3
"""
Castle Fine Art - Email Sender
Handles email personalization and sending with Apple Wallet attachments
"""

import smtplib
import json
import os
import csv
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
import time
import configparser

class EmailSender:
    def __init__(self, config_file="email_config.ini"):
        self.config = configparser.ConfigParser()
        self.config_file = config_file
        self.load_config()

    def load_config(self):
        """Load email configuration from file or create default"""
        if os.path.exists(self.config_file):
            self.config.read(self.config_file)
        else:
            self.create_default_config()

    def create_default_config(self):
        """Create default email configuration file"""
        self.config['SMTP'] = {
            'smtp_server': 'smtp.gmail.com',
            'smtp_port': '587',
            'use_tls': 'True',
            'username': 'your_email@gmail.com',
            'password': 'your_app_password'
        }

        self.config['EMAIL'] = {
            'from_email': 'events@castlefineart.com',
            'from_name': 'Castle Fine Art',
            'reply_to': 'events@castlefineart.com',
            'subject_template': 'Your Castle Fine Art Private View Invitation - {event_name}'
        }

        with open(self.config_file, 'w') as configfile:
            self.config.write(configfile)

        print(f"📧 Created default email configuration in {self.config_file}")
        print("⚠️  Please edit this file with your SMTP settings before sending emails")

    def get_smtp_config(self):
        """Get SMTP configuration"""
        return {
            'server': self.config.get('SMTP', 'smtp_server'),
            'port': self.config.getint('SMTP', 'smtp_port'),
            'use_tls': self.config.getboolean('SMTP', 'use_tls'),
            'username': self.config.get('SMTP', 'username'),
            'password': self.config.get('SMTP', 'password')
        }

    def personalize_email_template(self, template_html, guest_data, event_data, google_wallet_url, apple_pass_available=False):
        """Personalize email template with guest and event data"""

        # Basic replacements
        personalized = template_html.replace("Trevor Cooper", guest_data['name'])

        # Guest count with proper pluralization
        guest_count = int(guest_data['guest_count'])
        guest_text = f"{guest_count} people" if guest_count != 1 else "1 person"
        personalized = personalized.replace("4 people", guest_text)

        # Event details
        personalized = personalized.replace("Sunday, 15 December 2024",
                                          self.format_date(event_data.get('date', 'TBD')))
        personalized = personalized.replace("6:00 PM - 10:00 PM",
                                          f"{event_data.get('time', 'TBD')} onwards")
        personalized = personalized.replace("Castle Fine Art, The Mailbox, Birmingham",
                                          event_data.get('location', 'TBD'))

        # Update Google Wallet URL - find and replace the existing long URL
        import re
        google_url_pattern = r'href="https://pay\.google\.com/gp/v/save/[^"]*"'
        personalized = re.sub(google_url_pattern, f'href="{google_wallet_url}"', personalized)

        # Add Apple Wallet section if available
        if apple_pass_available:
            apple_section = '''
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <h3 style="color: #333;">Apple Wallet</h3>
                <p>Your Apple Wallet pass is attached to this email. Simply open the attachment to add it to your Apple Wallet.</p>
            </div>
            '''
            # Insert before the closing div
            personalized = personalized.replace('</div>\n</body>', apple_section + '</div>\n</body>')

        # Add host gallery and art consultant info if available
        if guest_data.get('host_gallery') or guest_data.get('art_consultant'):
            host_info = '<div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">'
            host_info += '<h4 style="margin: 0 0 10px 0; color: #333;">Your Event Details</h4>'

            if guest_data.get('host_gallery'):
                host_info += f'<p><strong>Host Gallery:</strong> {guest_data["host_gallery"]}</p>'

            if guest_data.get('art_consultant'):
                host_info += f'<p><strong>Art Consultant:</strong> {guest_data["art_consultant"]}</p>'

            host_info += '</div>'

            # Insert after the guest info section
            personalized = personalized.replace('</div>\n\n        <div class="event-details">',
                                              '</div>\n\n' + host_info + '\n        <div class="event-details">')

        return personalized

    def format_date(self, date_str):
        """Format date string for email display"""
        try:
            if date_str and date_str != 'TBD':
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                return date_obj.strftime('%A, %d %B %Y')
        except:
            pass
        return date_str

    def create_email_message(self, to_email, subject, html_content, apple_pass_file=None):
        """Create email message with optional Apple Wallet attachment"""

        smtp_config = self.get_smtp_config()
        from_email = self.config.get('EMAIL', 'from_email')
        from_name = self.config.get('EMAIL', 'from_name')
        reply_to = self.config.get('EMAIL', 'reply_to')

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        msg['Reply-To'] = reply_to

        # Add HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)

        # Add Apple Wallet pass attachment if provided
        if apple_pass_file and os.path.exists(apple_pass_file):
            try:
                with open(apple_pass_file, "rb") as attachment:
                    part = MIMEBase('application', 'vnd.apple.pkpass')
                    part.set_payload(attachment.read())

                encoders.encode_base64(part)

                filename = os.path.basename(apple_pass_file)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {filename}',
                )

                msg.attach(part)
                print(f"📱 Attached Apple Wallet pass: {filename}")
            except Exception as e:
                print(f"⚠️  Failed to attach Apple Wallet pass: {e}")

        return msg

    def send_email(self, message):
        """Send email message via SMTP"""
        smtp_config = self.get_smtp_config()

        try:
            server = smtplib.SMTP(smtp_config['server'], smtp_config['port'])

            if smtp_config['use_tls']:
                server.starttls()

            server.login(smtp_config['username'], smtp_config['password'])

            text = message.as_string()
            server.sendmail(message['From'], message['To'], text)
            server.quit()

            return {"success": True}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_test_email(self, test_email, event_data, sample_guest_data, google_wallet_url, template_html):
        """Send a test email"""

        subject = self.config.get('EMAIL', 'subject_template').format(
            event_name=event_data.get('name', 'Private View')
        )

        # Personalize template
        personalized_html = self.personalize_email_template(
            template_html, sample_guest_data, event_data, google_wallet_url, True
        )

        # Create and send message
        message = self.create_email_message(test_email, subject, personalized_html)
        result = self.send_email(message)

        if result['success']:
            print(f"✅ Test email sent successfully to {test_email}")
        else:
            print(f"❌ Failed to send test email: {result['error']}")

        return result

    def send_bulk_emails(self, event_dir, progress_callback=None):
        """Send personalized emails to all guests in an event"""

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
            with open(template_path, 'r') as f:
                template_html = f.read()

            # Email configuration
            subject_template = self.config.get('EMAIL', 'subject_template')
            apple_passes_dir = os.path.join(event_dir, "apple_passes")

            results = {
                "total": len(guests),
                "sent": 0,
                "failed": 0,
                "errors": []
            }

            # Send emails
            for i, guest in enumerate(guests):
                try:
                    if progress_callback:
                        progress_callback(i, len(guests), f"Sending to {guest['name']}")

                    # Get Google Wallet URL
                    google_url = google_passes.get(guest['name'], '#')

                    # Find Apple Wallet pass
                    apple_pass_file = os.path.join(apple_passes_dir, f"{guest['pass_id']}.pkpass")
                    apple_available = os.path.exists(apple_pass_file)

                    # Personalize email
                    subject = subject_template.format(event_name=event_data.get('name', 'Private View'))
                    personalized_html = self.personalize_email_template(
                        template_html, guest, event_data, google_url, apple_available
                    )

                    # Create and send message
                    message = self.create_email_message(
                        guest['email'],
                        subject,
                        personalized_html,
                        apple_pass_file if apple_available else None
                    )

                    send_result = self.send_email(message)

                    if send_result['success']:
                        results['sent'] += 1
                        print(f"✅ Email sent to {guest['name']} ({guest['email']})")
                    else:
                        results['failed'] += 1
                        results['errors'].append(f"{guest['name']}: {send_result['error']}")
                        print(f"❌ Failed to send to {guest['name']}: {send_result['error']}")

                    # Small delay to avoid overwhelming SMTP server
                    time.sleep(1)

                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append(f"{guest['name']}: {str(e)}")
                    print(f"❌ Error sending to {guest['name']}: {str(e)}")

            if progress_callback:
                progress_callback(len(guests), len(guests), "Complete")

            return {"success": True, "results": results}

        except Exception as e:
            return {"success": False, "error": str(e)}

def main():
    """CLI interface for email sending"""
    import argparse

    parser = argparse.ArgumentParser(description='Send Castle Fine Art event emails')
    parser.add_argument('--event-dir', required=True, help='Event directory path')
    parser.add_argument('--test-email', help='Send test email to this address')
    parser.add_argument('--config', default='email_config.ini', help='Email config file')

    args = parser.parse_args()

    sender = EmailSender(args.config)

    if args.test_email:
        # Send test email
        event_info_path = os.path.join(args.event_dir, "event_info.json")
        csv_path = os.path.join(args.event_dir, "csv", "guest_list.csv")

        with open(event_info_path, 'r') as f:
            event_data = json.load(f)

        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            sample_guest = next(reader)

        template_path = os.path.join(os.path.dirname(__file__), "wallettest", "google_wallet", "email_template.html")
        with open(template_path, 'r') as f:
            template_html = f.read()

        result = sender.send_test_email(args.test_email, event_data, sample_guest, "https://example.com", template_html)

        if not result['success']:
            print(f"Test email failed: {result['error']}")
    else:
        # Send bulk emails
        def progress_callback(current, total, status):
            percentage = int((current / total) * 100)
            print(f"📧 Progress: {percentage}% ({current}/{total}) - {status}")

        result = sender.send_bulk_emails(args.event_dir, progress_callback)

        if result['success']:
            results = result['results']
            print(f"\n📊 Email Summary:")
            print(f"   Total: {results['total']}")
            print(f"   Sent: {results['sent']}")
            print(f"   Failed: {results['failed']}")

            if results['errors']:
                print(f"\n❌ Errors:")
                for error in results['errors']:
                    print(f"   {error}")
        else:
            print(f"Bulk email failed: {result['error']}")

if __name__ == '__main__':
    main()