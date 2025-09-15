#!/usr/bin/env python3
"""
Castle Fine Art - Send All Email Templates
Sends all the pre-generated email templates
"""

import os
import glob
import email
import time
from email_sender import EmailSender

def send_all_templates(templates_dir):
    """Send all .eml template files in the directory"""

    # Find all .eml files
    eml_files = glob.glob(os.path.join(templates_dir, "*.eml"))
    eml_files = [f for f in eml_files if not f.endswith("TEST_EMAIL.eml")]  # Skip test email

    if not eml_files:
        print("❌ No email templates found in directory")
        return

    print(f"📧 Found {len(eml_files)} email templates to send")

    # Confirm before sending
    print("\n⚠️  You are about to send emails to real recipients!")
    print("   Make sure you've reviewed the preview files first.")
    confirm = input("   Continue? (yes/no): ").lower().strip()

    if confirm != 'yes':
        print("❌ Send cancelled")
        return

    sender = EmailSender()

    sent = 0
    failed = 0
    errors = []

    for eml_file in eml_files:
        try:
            print(f"\n📤 Sending: {os.path.basename(eml_file)}")

            # Load the .eml file
            with open(eml_file, 'r', encoding='utf-8') as f:
                msg_content = f.read()

            # Parse the email message
            message = email.message_from_string(msg_content)

            # Send using the email sender
            result = sender.send_email(message)

            if result['success']:
                sent += 1
                recipient = message.get('To', 'Unknown')
                print(f"✅ Sent to {recipient}")
            else:
                failed += 1
                recipient = message.get('To', 'Unknown')
                errors.append(f"{recipient}: {result['error']}")
                print(f"❌ Failed to send to {recipient}: {result['error']}")

            # Small delay to avoid overwhelming SMTP
            time.sleep(1)

        except Exception as e:
            failed += 1
            errors.append(f"{os.path.basename(eml_file)}: {str(e)}")
            print(f"❌ Error processing {os.path.basename(eml_file)}: {str(e)}")

    print(f"\n📊 Send Summary:")
    print(f"   Total: {len(eml_files)}")
    print(f"   Sent: {sent}")
    print(f"   Failed: {failed}")

    if errors:
        print(f"\n❌ Errors:")
        for error in errors:
            print(f"   {error}")

def send_test_email(templates_dir):
    """Send only the test email template"""

    test_file = os.path.join(templates_dir, "TEST_EMAIL.eml")

    if not os.path.exists(test_file):
        print("❌ TEST_EMAIL.eml not found")
        return

    print("📧 Sending test email...")

    sender = EmailSender()

    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            msg_content = f.read()

        message = email.message_from_string(msg_content)
        result = sender.send_email(message)

        if result['success']:
            recipient = message.get('To', 'Unknown')
            print(f"✅ Test email sent to {recipient}")
        else:
            print(f"❌ Test email failed: {result['error']}")

    except Exception as e:
        print(f"❌ Error sending test email: {str(e)}")

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Send pre-generated email templates')
    parser.add_argument('templates_dir', help='Directory containing .eml template files')
    parser.add_argument('--test-only', action='store_true', help='Send only the test email')

    args = parser.parse_args()

    if not os.path.exists(args.templates_dir):
        print(f"❌ Directory not found: {args.templates_dir}")
        return

    if args.test_only:
        send_test_email(args.templates_dir)
    else:
        send_all_templates(args.templates_dir)

if __name__ == '__main__':
    main()