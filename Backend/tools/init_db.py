import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env")

# Add the parent directory to python path so we can import shared
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from shared.database import create_db_and_tables

def main():
    db_url = os.getenv("DATABASE_URL")
    db_provider = os.getenv("DB_PROVIDER", "postgres")
    print(f"[InitDB] Starting database migration...")
    print(f"[InitDB] DB_PROVIDER: {db_provider}")
    print(f"[InitDB] DATABASE_URL (redacted): {db_url.split('@')[1] if '@' in db_url else db_url}")
    
    try:
        create_db_and_tables()
        print("[InitDB] SUCCESS: Database schemas successfully initialized/updated!")
    except Exception as e:
        print(f"[InitDB] ERROR: Failed to initialize database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
