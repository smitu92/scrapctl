import os
import sys
import time
import requests
from dotenv import load_dotenv

# Load environment variables
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Add the Backend folder to system path
sys.path.append(BACKEND_DIR)

from shared.providers.factory import get_db_provider, get_storage_provider
from shared.models import ScrapSession, ScrapTask, ScrapFile
from sqlmodel import select, Session

def check_db_and_storage(session_id: str):
    db_provider = get_db_provider()
    storage_provider = get_storage_provider()
    
    print("\n" + "="*60)
    print(f"[Validation] Checking DB & Storage for session: {session_id}")
    print("="*60)
    
    # 1. Check Database Entries
    with Session(db_provider.engine) as session:
        # Check Session
        db_sess = session.exec(select(ScrapSession).where(ScrapSession.id == session_id)).first()
        if db_sess:
            print(f"[DB] Found ScrapSession entry: ID={db_sess.id}, status={db_sess.status}")
        else:
            print("[DB] ERROR: No ScrapSession entry found in DB!")
            return False
            
        # Check Tasks
        db_tasks = session.exec(select(ScrapTask).where(ScrapTask.session_id == session_id)).all()
        print(f"[DB] Found {len(db_tasks)} ScrapTask entries:")
        for t in db_tasks:
            print(f"  - Task: {t.task_key} | Worker: {t.worker_id} | Status: {t.status} | Latency: {t.latency_seconds}s")
            
    # 2. Check Storage Provider Uploads
    storage_type = os.getenv("STORAGE_PROVIDER", "local")
    print(f"[Storage] Current Storage Provider: {storage_type}")
    
    if storage_type == "local":
        storage_dir = os.path.abspath(os.path.join(BACKEND_DIR, "output", "storage"))
        bucket = os.getenv("STORAGE_BUCKET_NAME", "ScrapCTL")
        session_dir = os.path.join(storage_dir, bucket, session_id)
        if os.path.exists(session_dir):
            files = os.listdir(session_dir)
            print(f"[Storage-Local] SUCCESS: Found storage folder for session with {len(files)} files:")
            for f in files:
                fpath = os.path.join(session_dir, f)
                print(f"  - File: {f} ({os.path.getsize(fpath)} bytes)")
        else:
            print(f"[Storage-Local] ERROR: Storage directory not found at {session_dir}")
            
    elif storage_type == "db":
        with Session(db_provider.engine) as session:
            db_files = session.exec(select(ScrapFile).where(ScrapFile.session_id == session_id)).all()
            if db_files:
                print(f"[Storage-DB] SUCCESS: Found {len(db_files)} files saved in ScrapFile table:")
                for df in db_files:
                    print(f"  - File: {df.filename} ({len(df.content)} bytes)")
            else:
                print("[Storage-DB] ERROR: No files found in ScrapFile table!")
                
    elif storage_type == "vercel":
        print("[Storage-Vercel] Files are uploaded to Vercel Blob. Verification should be checked in Vercel list response.")
        
    return True

def main():
    api_url = "http://localhost:4321/api/task/execute"
    payload = {
        "target": "croma",
        "task_type": "ListDownCategories",
        "input_type": "raw_list",
        "input_data": [],
        "params": {
            "limit": 2,
            "workers": 1,
            "max_retries": 1
        },
        "use_proxies": False
    }
    
    print(f"[API] Sending POST request to {api_url}...")
    try:
        response = requests.post(api_url, json=payload, timeout=15)
        if response.status_code == 200:
            res_data = response.json()
            session_id = res_data.get("session_id")
            state = res_data.get("state")
            print(f"[API] Success! Response: session_id={session_id}, state={state}")
            
            # Wait for background thread to run scraping job and log entries (usually 5-10s)
            print("[Wait] Waiting 10 seconds for background scraping job to execute and write to DB/Storage...")
            time.sleep(10)
            
            # Check outcomes
            check_db_and_storage(session_id)
        else:
            print(f"[API] Error: Server returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[API] Request failed: {e}")

if __name__ == "__main__":
    main()
