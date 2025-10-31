"""
Test ultra simple con requests
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

qdrant_url = os.getenv('QDRANT_URL')
api_key = os.getenv('QDRANT_API_KEY')

print(f"URL: {qdrant_url}")
print("Haciendo request...")

headers = {'api-key': api_key}
response = requests.get(f"{qdrant_url}/", headers=headers)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
