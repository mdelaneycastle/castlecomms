#!/usr/bin/env python3
"""
Castle Fine Art - Event Email Processor
Processes HTML email templates, fixes Apple Wallet links, and creates .eml files with attachments
"""

import os
import csv
import json
import glob
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
import configparser

class EventEmailProcessor:
    def __init__(self, event_dir, config_file="email_config.ini"):
        self.event_dir = event_dir
        self.config = configparser.ConfigParser()
        self.config_file = config_file
        self.load_config()
        
        # Event directory structure
        self.emails_dir = os.path.join(event_dir, "emails")
        self.apple_passes_dir = os.path.join(event_dir, "apple_passes") 
        self.csv_path = os.path.join(event_dir, "csv", "guest_list.csv")
        self.google_passes_path = os.path.join(event_dir, "google_passes", "google_wallet_passes.json")
        self.event_info_path = os.path.join(event_dir, "event_info.json")
        
        # Output directory for processed emails
        self.output_dir = os.path.join(event_dir, "processed_emails")
        os.makedirs(self.output_dir, exist_ok=True)

    def load_config(self):
        """Load email configuration"""
        if os.path.exists(self.config_file):
            self.config.read(self.config_file)
        else:
            # Create basic config
            self.config['EMAIL'] = {
                'from_email': 'events@castlefineart.com',
                'from_name': 'Castle Fine Art Events',
                'reply_to': 'events@castlefineart.com',
                'subject_template': 'Your Castle Fine Art Private View Invitation'
            }

    def load_event_data(self):
        """Load event and guest data"""
        # Load event info
        with open(self.event_info_path, 'r') as f:
            event_data = json.load(f)
        
        # Load CSV guest data
        guests = []
        with open(self.csv_path, 'r') as f:
            reader = csv.DictReader(f)
            guests = list(reader)
        
        # Load Google Wallet passes
        google_passes = {}
        if os.path.exists(self.google_passes_path):
            with open(self.google_passes_path, 'r') as f:
                passes = json.load(f)
                for pass_data in passes:
                    google_passes[pass_data['name']] = pass_data['wallet_url']
        
        return event_data, guests, google_passes

    def fix_apple_wallet_section(self, html_content, guest_name, has_apple_pass=True):
        """Fix the Apple Wallet section in email HTML"""
        
        if has_apple_pass:
            # Replace the broken download link with attachment notice
            apple_section = '''
                <!-- Apple Wallet Button -->
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px; text-align: center;">
                    <div style="background: #000; color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px; display: inline-block;">
                        📱 Apple Wallet Pass (see attachment)
                    </div>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                        The .pkpass file is attached to this email. Open it to add to your Apple Wallet.
                    </p>
                </div>'''
        else:
            # No Apple Wallet pass available
            apple_section = '''
                <!-- Apple Wallet Button -->
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 10px; text-align: center;">
                    <div style="background: #666; color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px; display: inline-block;">
                        📱 Apple Wallet Pass (not available)
                    </div>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                        Apple Wallet pass not found for this event.
                    </p>
                </div>'''

        # Replace the Apple Wallet button section
        pattern = r'<!-- Apple Wallet Button -->.*?</a>'
        html_content = re.sub(pattern, apple_section, html_content, flags=re.DOTALL)
        
        # Also remove any remaining APPLE_WALLET_DOWNLOAD_LINK references
        html_content = html_content.replace('APPLE_WALLET_DOWNLOAD_LINK', '#')
        
        return html_content

    def create_eml_message(self, guest_data, event_data, html_content, google_wallet_url, apple_pass_path=None):
        """Create complete .eml message with optional Apple Wallet attachment"""
        
        # Email configuration
        from_email = self.config.get('EMAIL', 'from_email')
        from_name = self.config.get('EMAIL', 'from_name')
        reply_to = self.config.get('EMAIL', 'reply_to')
        subject_template = self.config.get('EMAIL', 'subject_template')
        
        # Create subject
        event_name = event_data.get('name', event_data.get('title', 'Private View'))
        subject = f"{subject_template} - {event_name}"
        
        # Create multipart message
        msg = MIMEMultipart('mixed')
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = f"{guest_data['name']} <{guest_data['email']}>"
        msg['Reply-To'] = reply_to
        msg['Date'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S %z')
        
        # Create HTML part
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
        
        # Add Apple Wallet pass attachment if available
        if apple_pass_path and os.path.exists(apple_pass_path):
            try:
                with open(apple_pass_path, 'rb') as f:
                    attachment = MIMEBase('application', 'vnd.apple.pkpass')
                    attachment.set_payload(f.read())
                
                encoders.encode_base64(attachment)
                
                # Create a descriptive filename
                filename = f"{guest_data['name'].replace(' ', '_')}_AppleWallet.pkpass"
                attachment.add_header(
                    'Content-Disposition', 
                    f'attachment; filename="{filename}"'
                )
                attachment.add_header(
                    'Content-Description',
                    'Apple Wallet Pass'
                )
                
                msg.attach(attachment)
                
            except Exception as e:
                print(f"⚠️  Failed to attach Apple Wallet pass for {guest_data['name']}: {e}")
        
        return msg

    def process_guest_email(self, guest_data, event_data, google_passes):
        """Process a single guest's email"""
        
        # Find the HTML email template
        name_file = guest_data['name'].replace(' ', '_')
        html_file = os.path.join(self.emails_dir, f"{name_file}_email.html")
        
        if not os.path.exists(html_file):
            return {"success": False, "error": f"Email template not found: {html_file}"}
        
        try:
            # Load HTML content
            with open(html_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Find Apple Wallet pass
            apple_pass_path = os.path.join(self.apple_passes_dir, f"{guest_data['pass_id']}.pkpass")
            has_apple_pass = os.path.exists(apple_pass_path)
            
            # Fix Apple Wallet section
            html_content = self.fix_apple_wallet_section(
                html_content, 
                guest_data['name'], 
                has_apple_pass
            )
            
            # Get Google Wallet URL
            google_wallet_url = google_passes.get(guest_data['name'], '#')
            
            # Create .eml message
            eml_message = self.create_eml_message(
                guest_data,
                event_data, 
                html_content,
                google_wallet_url,
                apple_pass_path if has_apple_pass else None
            )
            
            # Save .eml file
            eml_filename = f"{name_file}_email.eml"
            eml_path = os.path.join(self.output_dir, eml_filename)
            
            with open(eml_path, 'w', encoding='utf-8') as f:
                f.write(eml_message.as_string())
            
            return {
                "success": True,
                "eml_path": eml_path,
                "has_apple_pass": has_apple_pass,
                "guest_name": guest_data['name']
            }
            
        except Exception as e:
            return {"success": False, "error": f"Processing failed: {str(e)}"}

    def process_all_emails(self, create_test=True):
        """Process all guest emails in the event"""
        
        print(f"🔄 Processing emails for event: {os.path.basename(self.event_dir)}")
        
        # Load data
        event_data, guests, google_passes = self.load_event_data()
        
        results = {
            "total": len(guests),
            "processed": 0,
            "failed": 0,
            "with_apple_pass": 0,
            "errors": []
        }
        
        # Process each guest
        for i, guest in enumerate(guests):
            print(f"📧 Processing {i+1}/{len(guests)}: {guest['name']}")
            
            result = self.process_guest_email(guest, event_data, google_passes)
            
            if result['success']:
                results['processed'] += 1
                if result.get('has_apple_pass'):
                    results['with_apple_pass'] += 1
                print(f"✅ Created: {os.path.basename(result['eml_path'])}")
            else:
                results['failed'] += 1
                results['errors'].append(f"{guest['name']}: {result['error']}")
                print(f"❌ Failed: {guest['name']} - {result['error']}")
        
        # Create test email if requested
        if create_test and guests:
            test_guest = guests[0].copy()
            test_guest['email'] = 'test@example.com'  # Replace with actual test email
            test_guest['name'] = f"TEST - {test_guest['name']}"
            
            print(f"\n📧 Creating test email...")
            test_result = self.process_guest_email(test_guest, event_data, google_passes)
            
            if test_result['success']:
                # Rename test file
                test_path = os.path.join(self.output_dir, "TEST_EMAIL.eml")
                os.rename(test_result['eml_path'], test_path)
                print(f"✅ Test email created: TEST_EMAIL.eml")
            else:
                print(f"❌ Test email failed: {test_result['error']}")
        
        return results

    def preview_email(self, guest_name_or_index=0):
        """Preview a single email (save as HTML for browser viewing)"""
        
        event_data, guests, google_passes = self.load_event_data()
        
        if isinstance(guest_name_or_index, int):
            if guest_name_or_index >= len(guests):
                print(f"❌ Index {guest_name_or_index} out of range (0-{len(guests)-1})")
                return None
            guest = guests[guest_name_or_index]
        else:
            # Find by name
            guest = None
            for g in guests:
                if g['name'].lower() == guest_name_or_index.lower():
                    guest = g
                    break
            if not guest:
                print(f"❌ Guest not found: {guest_name_or_index}")
                return None
        
        # Process the email
        result = self.process_guest_email(guest, event_data, google_passes)
        
        if result['success']:
            # Create HTML preview
            name_file = guest['name'].replace(' ', '_')
            preview_path = os.path.join(self.output_dir, f"PREVIEW_{name_file}.html")
            
            # Extract HTML from the .eml file
            with open(result['eml_path'], 'r', encoding='utf-8') as f:
                eml_content = f.read()
            
            # Simple extraction of HTML part (could be more robust)
            html_start = eml_content.find('Content-Type: text/html')
            if html_start > -1:
                html_section = eml_content[html_start:]
                html_start = html_section.find('\n\n') + 2
                html_content = html_section[html_start:]
                
                # Save preview HTML
                with open(preview_path, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                
                print(f"✅ Preview created: {preview_path}")
                return preview_path
            else:
                print("❌ Could not extract HTML content")
                return None
        else:
            print(f"❌ Preview failed: {result['error']}")
            return None

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Process Castle Fine Art event emails')
    parser.add_argument('event_dir', help='Event directory path')
    parser.add_argument('--preview', help='Preview email for guest (name or index)')
    parser.add_argument('--no-test', action='store_true', help='Skip creating test email')
    parser.add_argument('--config', default='email_config.ini', help='Email config file')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.event_dir):
        print(f"❌ Event directory not found: {args.event_dir}")
        return 1
    
    processor = EventEmailProcessor(args.event_dir, args.config)
    
    if args.preview:
        # Preview mode
        try:
            guest_index = int(args.preview)
            preview_path = processor.preview_email(guest_index)
        except ValueError:
            preview_path = processor.preview_email(args.preview)
        
        if preview_path:
            print(f"\n👀 Open this file in a browser to preview: {preview_path}")
    else:
        # Process all emails
        results = processor.process_all_emails(create_test=not args.no_test)
        
        print(f"\n📊 Processing Summary:")
        print(f"   Total guests: {results['total']}")
        print(f"   Successfully processed: {results['processed']}")
        print(f"   Failed: {results['failed']}")
        print(f"   With Apple Wallet passes: {results['with_apple_pass']}")
        print(f"\n📁 Output directory: {processor.output_dir}")
        
        if results['errors']:
            print(f"\n❌ Errors:")
            for error in results['errors']:
                print(f"   {error}")
        
        if results['processed'] > 0:
            print(f"\n✅ Ready to send! Use: python3 send_all_templates.py \"{processor.output_dir}\"")
    
    return 0

if __name__ == '__main__':
    exit(main())