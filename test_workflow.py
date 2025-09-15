#!/usr/bin/env python3
"""
Castle Fine Art - Workflow Testing Script
Tests the complete event workflow with sample data
"""

import json
import csv
import os
import requests
import time
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:5001"
SAMPLE_CSV = "sample_guest_list.csv"
TEST_EVENT_NAME = f"test_event_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

def test_backend_connection():
    """Test if backend server is running"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/events/test/progress", timeout=5)
        print("✅ Backend server is running")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend server not available: {e}")
        print("   Please start the backend with: python workflow_coordinator.py")
        return False

def load_sample_data():
    """Load sample CSV data"""
    if not os.path.exists(SAMPLE_CSV):
        print(f"❌ Sample CSV file not found: {SAMPLE_CSV}")
        return None

    csv_data = []
    with open(SAMPLE_CSV, 'r') as f:
        reader = csv.DictReader(f)
        csv_data = list(reader)

    print(f"✅ Loaded {len(csv_data)} guest records from {SAMPLE_CSV}")
    return csv_data

def create_test_event(csv_data):
    """Create test event in backend"""
    event_data = {
        "name": "Castle Fine Art Test Event",
        "date": "2024-12-15",
        "time": "18:00",
        "location": "Castle Fine Art, The Mailbox, Birmingham"
    }

    payload = {
        "event_name": TEST_EVENT_NAME,
        "csv_data": csv_data,
        "event_data": event_data
    }

    try:
        response = requests.post(f"{BACKEND_URL}/api/events", json=payload, timeout=30)
        result = response.json()

        if result.get("success"):
            print(f"✅ Created test event: {TEST_EVENT_NAME}")
            print(f"   Guests: {result.get('guest_count')}")
            return True
        else:
            print(f"❌ Failed to create event: {result.get('error')}")
            return False

    except Exception as e:
        print(f"❌ Error creating event: {e}")
        return False

def test_apple_wallet_generation():
    """Test Apple Wallet pass generation"""
    try:
        print("🔄 Starting Apple Wallet generation...")
        response = requests.post(f"{BACKEND_URL}/api/events/{TEST_EVENT_NAME}/apple-wallet", timeout=10)
        result = response.json()

        if not result.get("success"):
            print(f"❌ Failed to start Apple Wallet generation: {result.get('message')}")
            return False

        # Monitor progress
        print("   Monitoring progress...")
        for _ in range(60):  # Wait up to 60 seconds
            time.sleep(1)
            progress_response = requests.get(f"{BACKEND_URL}/api/events/{TEST_EVENT_NAME}/progress")
            progress = progress_response.json()

            if progress.get("step") == "apple_wallet":
                print(f"   Progress: {progress.get('progress', 0)}% - {progress.get('status', 'Unknown')}")

                if progress.get("completed"):
                    print(f"✅ Apple Wallet generation completed: {progress.get('pass_count')} passes")
                    return True

                if progress.get("error"):
                    print(f"❌ Apple Wallet generation failed: {progress.get('error')}")
                    return False

        print("⏱️ Apple Wallet generation timed out")
        return False

    except Exception as e:
        print(f"❌ Error testing Apple Wallet: {e}")
        return False

def test_google_wallet_generation():
    """Test Google Wallet pass generation"""
    try:
        print("🔄 Starting Google Wallet generation...")
        response = requests.post(f"{BACKEND_URL}/api/events/{TEST_EVENT_NAME}/google-wallet", timeout=10)
        result = response.json()

        if not result.get("success"):
            print(f"❌ Failed to start Google Wallet generation: {result.get('message')}")
            return False

        # Monitor progress
        print("   Monitoring progress...")
        for _ in range(60):  # Wait up to 60 seconds
            time.sleep(1)
            progress_response = requests.get(f"{BACKEND_URL}/api/events/{TEST_EVENT_NAME}/progress")
            progress = progress_response.json()

            if progress.get("step") == "google_wallet":
                print(f"   Progress: {progress.get('progress', 0)}% - {progress.get('status', 'Unknown')}")

                if progress.get("completed"):
                    print(f"✅ Google Wallet generation completed: {progress.get('pass_count')} passes")
                    return True

                if progress.get("error"):
                    print(f"❌ Google Wallet generation failed: {progress.get('error')}")
                    return False

        print("⏱️ Google Wallet generation timed out")
        return False

    except Exception as e:
        print(f"❌ Error testing Google Wallet: {e}")
        return False

def test_email_generation():
    """Test email generation"""
    try:
        print("🔄 Generating personalized emails...")
        response = requests.post(f"{BACKEND_URL}/api/events/{TEST_EVENT_NAME}/emails/generate", timeout=30)
        result = response.json()

        if result.get("success"):
            email_count = len(result.get("emails", []))
            print(f"✅ Generated {email_count} personalized emails")
            return True
        else:
            print(f"❌ Failed to generate emails: {result.get('error')}")
            return False

    except Exception as e:
        print(f"❌ Error testing email generation: {e}")
        return False

def test_email_sending():
    """Test email sending (simulation)"""
    try:
        print("🔄 Starting email sending...")
        response = requests.post(f"{BACKEND_URL}/api/events/{TEST_EVENT_NAME}/emails/send", timeout=10)
        result = response.json()

        if not result.get("success"):
            print(f"❌ Failed to start email sending: {result.get('message')}")
            return False

        # Monitor progress
        print("   Monitoring progress...")
        for _ in range(30):  # Wait up to 30 seconds
            time.sleep(1)
            progress_response = requests.get(f"{BACKEND_URL}/api/events/{TEST_EVENT_NAME}/progress")
            progress = progress_response.json()

            if progress.get("step") == "emails":
                print(f"   Progress: {progress.get('progress', 0)}% - {progress.get('status', 'Unknown')}")

                if progress.get("completed"):
                    print("✅ Email sending completed")
                    return True

                if progress.get("error"):
                    print(f"❌ Email sending failed: {progress.get('error')}")
                    return False

        print("⏱️ Email sending timed out")
        return False

    except Exception as e:
        print(f"❌ Error testing email sending: {e}")
        return False

def print_test_summary(results):
    """Print test summary"""
    print("\n" + "="*60)
    print("🧪 CASTLE FINE ART WORKFLOW TEST SUMMARY")
    print("="*60)

    test_names = [
        "Backend Connection",
        "Sample Data Loading",
        "Event Creation",
        "Apple Wallet Generation",
        "Google Wallet Generation",
        "Email Generation",
        "Email Sending"
    ]

    total_tests = len(results)
    passed_tests = sum(results)

    for i, (test_name, result) in enumerate(zip(test_names, results)):
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{i+1:2d}. {test_name:<25} {status}")

    print("-"*60)
    print(f"TOTAL: {passed_tests}/{total_tests} tests passed ({passed_tests/total_tests*100:.1f}%)")

    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! The workflow is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

    print("="*60)

def main():
    """Run complete workflow test"""
    print("🧪 CASTLE FINE ART WORKFLOW TEST")
    print("="*60)

    results = []

    # Test 1: Backend connection
    results.append(test_backend_connection())
    if not results[-1]:
        print_test_summary(results)
        return

    # Test 2: Load sample data
    csv_data = load_sample_data()
    results.append(csv_data is not None)
    if not results[-1]:
        print_test_summary(results)
        return

    # Test 3: Create event
    results.append(create_test_event(csv_data))
    if not results[-1]:
        print_test_summary(results)
        return

    # Test 4: Apple Wallet generation
    results.append(test_apple_wallet_generation())

    # Test 5: Google Wallet generation
    results.append(test_google_wallet_generation())

    # Test 6: Email generation
    results.append(test_email_generation())

    # Test 7: Email sending
    results.append(test_email_sending())

    # Print summary
    print_test_summary(results)

if __name__ == "__main__":
    main()