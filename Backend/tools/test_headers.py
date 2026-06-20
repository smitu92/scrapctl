import os
import requests
from dotenv import load_dotenv

# Load env
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

def test_headers():
    token = os.getenv("scraptctl_READ_WRITE_TOKEN") or os.getenv("BLOB_READ_WRITE_TOKEN")
    if not token:
        print("ERROR: No token found in .env!")
        return

    url = "https://blob.vercel-storage.com/test_folder/test_header_file.json"
    content = '{"test": "header"}'
    
    # Try different combinations of headers
    test_cases = [
        {
            "name": "No access header (pure default)",
            "headers": {
                "Authorization": f"Bearer {token}",
                "x-api-version": "7",
                "x-content-type": "application/json",
                "x-add-random-suffix": "0"
            }
        },
        {
            "name": "access: private header",
            "headers": {
                "Authorization": f"Bearer {token}",
                "x-api-version": "7",
                "x-content-type": "application/json",
                "x-add-random-suffix": "0",
                "access": "private"
            }
        },
        {
            "name": "x-access: private header",
            "headers": {
                "Authorization": f"Bearer {token}",
                "x-api-version": "7",
                "x-content-type": "application/json",
                "x-add-random-suffix": "0",
                "x-access": "private"
            }
        },
        {
            "name": "x-visibility: private header",
            "headers": {
                "Authorization": f"Bearer {token}",
                "x-api-version": "7",
                "x-content-type": "application/json",
                "x-add-random-suffix": "0",
                "x-visibility": "private"
            }
        },
        {
            "name": "access=private query parameter",
            "url": "https://blob.vercel-storage.com/test_folder/test_header_file.json?access=private",
            "headers": {
                "Authorization": f"Bearer {token}",
                "x-api-version": "7",
                "x-content-type": "application/json",
                "x-add-random-suffix": "0"
            }
        }
    ]

    for case in test_cases:
        print(f"\nTesting: {case['name']}")
        case_url = case.get("url", url)
        try:
            response = requests.put(case_url, data=content, headers=case['headers'], timeout=10)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_headers()
