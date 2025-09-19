#!/usr/bin/env python3
"""
Quick script to regenerate email templates with the updated template including Apple Wallet links
"""

import requests
import json

# Configuration
API_BASE_URL = 'http://localhost:5001'
EVENT_NAME = 'Boy George_2025-09-16T11-53-54-771Z'  # Update this to the current event name

def regenerate_templates():
    try:
        print(f"🔄 Regenerating email templates for event: {EVENT_NAME}")
        
        # Call the generate emails endpoint
        response = requests.post(f'{API_BASE_URL}/api/events/{EVENT_NAME}/emails/generate')
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ Successfully regenerated email templates")
                print(f"📧 Generated {len(result.get('emails', []))} email templates")
            else:
                print(f"❌ Failed to regenerate templates: {result.get('error', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    regenerate_templates()