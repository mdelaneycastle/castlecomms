#!/usr/bin/env python3
"""
Quick email configuration test
"""

from email_sender import EmailSender
import sys

def test_email_config():
    try:
        sender = EmailSender()
        print("✅ Email configuration loaded successfully")

        # Check if password is still placeholder
        smtp_config = sender.get_smtp_config()
        if smtp_config['password'] == 'YOUR_OUTLOOK_PASSWORD_HERE':
            print("⚠️  Please replace 'YOUR_OUTLOOK_PASSWORD_HERE' with your actual password in email_config.ini")
            return False

        print(f"📧 SMTP Server: {smtp_config['server']}:{smtp_config['port']}")
        print(f"📧 Username: {smtp_config['username']}")
        print(f"📧 From Name: {sender.config.get('EMAIL', 'from_name')}")

        return True

    except Exception as e:
        print(f"❌ Email configuration error: {e}")
        return False

def send_test_email():
    test_email = input("Enter your personal email address for testing: ").strip()
    if not test_email:
        print("❌ No email address provided")
        return

    try:
        sender = EmailSender()

        # Sample data for test
        sample_event = {
            'name': 'Test Private View',
            'date': '2024-12-15',
            'time': '18:00',
            'location': 'Castle Fine Art Test Location'
        }

        sample_guest = {
            'name': 'Test Guest',
            'email': test_email,
            'guest_count': '2',
            'host_gallery': 'Test Gallery',
            'art_consultant': 'Test Consultant'
        }

        # Load email template
        template_path = "wallettest/google_wallet/email_template.html"
        try:
            with open(template_path, 'r') as f:
                template_html = f.read()
        except FileNotFoundError:
            print(f"❌ Email template not found at {template_path}")
            return

        print(f"📧 Sending test email to {test_email}...")

        result = sender.send_test_email(
            test_email,
            sample_event,
            sample_guest,
            "https://example.com/google-wallet-test",
            template_html
        )

        if result['success']:
            print("✅ Test email sent successfully!")
            print("📱 Check your inbox (and spam folder)")
        else:
            print(f"❌ Test email failed: {result['error']}")

    except Exception as e:
        print(f"❌ Error sending test email: {e}")

if __name__ == "__main__":
    print("🧪 Castle Fine Art Email Configuration Test")
    print("="*50)

    if test_email_config():
        print("\n🎯 Configuration looks good! Ready to send test email.")
        send_test = input("\nWould you like to send a test email? (y/n): ").lower().strip()

        if send_test == 'y':
            send_test_email()
        else:
            print("✅ Email system is configured and ready to use!")
    else:
        print("\n❌ Please fix the configuration issues above before testing.")