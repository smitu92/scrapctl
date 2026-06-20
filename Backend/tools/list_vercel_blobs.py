import os
import requests
from dotenv import load_dotenv

# Load env
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

def main():
    token = os.getenv("scraptctl_READ_WRITE_TOKEN") or os.getenv("BLOB_READ_WRITE_TOKEN")
    if not token:
        print("ERROR: No token found in .env!")
        return

    url = "https://blob.vercel-storage.com"
    headers = {
        "Authorization": f"Bearer {token}",
        "x-api-version": "7"
    }

    print(f"[Vercel] Querying Vercel Blob list endpoint...")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"[Vercel] Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            blobs = data.get("blobs", [])
            print(f"[Vercel] SUCCESS! Found {len(blobs)} files in Vercel Blob:")
            for b in blobs:
                print(f"  - Pathname: {b.get('pathname')} | Size: {b.get('size')} bytes | URL: {b.get('url')}")
        else:
            print(f"[Vercel] Fail! response: {response.text}")
    except Exception as e:
        print(f"[Vercel] Error querying API: {e}")

if __name__ == "__main__":
    main()
