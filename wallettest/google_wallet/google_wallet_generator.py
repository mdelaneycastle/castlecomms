#!/usr/bin/env python3
"""
Google Wallet Event Ticket Generator
Converts CSV guest data into Google Wallet event tickets
"""

import json
import csv
import base64
import time
import jwt
from datetime import datetime
import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

# Configuration
ISSUER_ID = "3388000000023012606"
SERVICE_ACCOUNT_FILE = "castle-comms-9607f45dd01c.json"
CSV_FILE = "sample_guest_list.csv"

# Google Wallet API endpoints
BASE_URL = "https://walletobjects.googleapis.com/walletobjects/v1"

class GoogleWalletGenerator:
    def __init__(self):
        # Load service account credentials
        self.credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=['https://www.googleapis.com/auth/wallet_object.issuer']
        )
        
        # Refresh credentials
        self.credentials.refresh(Request())
        
        self.event_class_id = f"{ISSUER_ID}.castle_fine_art_generic"
        
    def create_generic_class(self):
        """Create the generic pass class (template)"""
        generic_class = {
            "id": self.event_class_id,
            "classTemplateInfo": {
                "cardTemplateOverride": {
                    "cardRowTemplateInfos": [
                        {
                            "threeItems": {
                                "startItem": {
                                    "firstValue": {
                                        "fields": [
                                            {
                                                "fieldPath": "object.textModulesData['guests']"
                                            }
                                        ]
                                    }
                                },
                                "middleItem": {
                                    "firstValue": {
                                        "fields": [
                                            {
                                                "fieldPath": "object.textModulesData['host_gallery']"
                                            }
                                        ]
                                    }
                                },
                                "endItem": {
                                    "firstValue": {
                                        "fields": [
                                            {
                                                "fieldPath": "object.textModulesData['art_consultant']"
                                            }
                                        ]
                                    }
                                }
                            }
                        },
                        {
                            "oneItem": {
                                "item": {
                                    "firstValue": {
                                        "fields": [
                                            {
                                                "fieldPath": "object.textModulesData['event_start_time']"
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        }
        
        # Make API call to create class
        headers = {
            'Authorization': f'Bearer {self.credentials.token}',
            'Content-Type': 'application/json'
        }
        
        url = f"{BASE_URL}/genericClass"
        response = requests.post(url, headers=headers, json=generic_class)
        
        if response.status_code == 200:
            print("✅ Generic class created successfully")
            return True
        elif response.status_code == 409:
            print("ℹ️ Generic class already exists")
            return True
        else:
            print(f"❌ Failed to create generic class: {response.status_code}")
            print(response.text)
            return False
    
    def create_generic_object(self, guest_data, pass_id):
        """Create individual generic pass object"""
        object_id = f"{ISSUER_ID}.{pass_id}"
        
        generic_object = {
            "id": object_id,
            "classId": self.event_class_id,
            "logo": {
                "sourceUri": {
                    "uri": "https://mdelaneycastle.github.io/castlecomms/images/logoimage.png"
                },
                "contentDescription": {
                    "defaultValue": {
                        "language": "en-US",
                        "value": "Castle Fine Art Logo"
                    }
                }
            },
            "cardTitle": {
                "defaultValue": {
                    "language": "en-US",
                    "value": "CASTLE FINE ART"
                }
            },
            "subheader": {
                "defaultValue": {
                    "language": "en-US",
                    "value": "Client Name"
                }
            },
            "header": {
                "defaultValue": {
                    "language": "en-US",
                    "value": guest_data['name']
                }
            },
            "textModulesData": [
                {
                    "id": "guests",
                    "header": "Guests",
                    "body": str(guest_data['guest_count'])
                },
                {
                    "id": "host_gallery",
                    "header": "Host Gallery",
                    "body": guest_data['host_gallery']
                },
                {
                    "id": "art_consultant",
                    "header": "Art Consultant",
                    "body": guest_data['art_consultant']
                },
                {
                    "id": "event_start_time",
                    "header": "Event Start Time",
                    "body": "18:00"
                }
            ],
            "barcode": {
                "type": "QR_CODE",
                "value": f'{{"name": "{guest_data["name"]}", "guests": {guest_data["guest_count"]}}}'
            },
            "hexBackgroundColor": "#ff00ff",
            "heroImage": {
                "sourceUri": {
                    "uri": "https://mdelaneycastle.github.io/castlecomms/images/strip.png"
                },
                "contentDescription": {
                    "defaultValue": {
                        "language": "en-US",
                        "value": "Castle Fine Art Hero Image"
                    }
                }
            }
        }
        
        return generic_object
    
    def create_jwt_token(self, generic_object):
        """Create signed JWT token for the pass"""
        # Load private key from service account file
        with open(SERVICE_ACCOUNT_FILE, 'r') as f:
            service_account_info = json.load(f)
            private_key = service_account_info['private_key']
        
        payload = {
            "iss": self.credentials.service_account_email,
            "aud": "google",
            "typ": "savetowallet",
            "iat": int(time.time()),
            "payload": {
                "genericObjects": [generic_object]
            }
        }
        
        # Sign JWT with private key
        token = jwt.encode(payload, private_key, algorithm='RS256')
        
        return token
    
    def generate_passes(self):
        """Generate all passes from CSV data"""
        # First create the generic class
        if not self.create_generic_class():
            return
        
        generated_passes = []
        
        with open(CSV_FILE, 'r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            
            for i, row in enumerate(reader, 1):
                pass_id = f"GPASS{i:03d}"
                
                guest_data = {
                    'name': row['name'],
                    'guest_count': row['guest_count'],
                    'email': row['email'],
                    'host_gallery': row['host_gallery'],
                    'art_consultant': row['art_consultant']
                }
                
                # Create generic object
                generic_object = self.create_generic_object(guest_data, pass_id)
                
                # Create JWT token
                jwt_token = self.create_jwt_token(generic_object)
                
                # Create Google Wallet URL
                wallet_url = f"https://pay.google.com/gp/v/save/{jwt_token}"
                
                pass_info = {
                    'pass_id': pass_id,
                    'name': guest_data['name'],
                    'email': guest_data['email'],
                    'guest_count': guest_data['guest_count'],
                    'jwt_token': jwt_token,
                    'wallet_url': wallet_url
                }
                
                generated_passes.append(pass_info)
                print(f"✅ Generated Google Wallet pass for {guest_data['name']} - {pass_id}")
        
        # Save pass URLs to file
        with open('google_wallet_passes.json', 'w') as f:
            json.dump(generated_passes, f, indent=2)
        
        print(f"\n🎟️ Generated {len(generated_passes)} Google Wallet passes")
        print("📄 Pass URLs saved to google_wallet_passes.json")
        
        return generated_passes

if __name__ == "__main__":
    generator = GoogleWalletGenerator()
    passes = generator.generate_passes()
    
    # Print first few URLs for testing
    if passes:
        print("\n🔗 First 3 Google Wallet URLs:")
        for pass_info in passes[:3]:
            print(f"{pass_info['name']}: {pass_info['wallet_url']}")
    else:
        print("❌ No passes were generated")