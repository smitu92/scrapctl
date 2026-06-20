import os
import sys
from dotenv import load_dotenv

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
sys.path.append(BACKEND_DIR)

from shared.providers.factory import get_db_provider
from shared.models import ScrapSession, ScrapTask, ScrapFile
from sqlmodel import select, Session

def main():
    db = get_db_provider()
    with Session(db.engine) as session:
        print("="*60)
        print("DATABASE PERSISTENCE CHECK")
        print("="*60)
        
        print("\n[DB] ALL SCRAP SESSIONS:")
        sess_list = session.exec(select(ScrapSession)).all()
        if not sess_list:
            print("  No sessions found.")
        for s in sess_list:
            print(f"  - Session ID: {s.id} | Status: {s.status} | Updated: {s.updated_at}")
            
        print("\n[DB] ALL SCRAP TASKS:")
        tasks = session.exec(select(ScrapTask)).all()
        if not tasks:
            print("  No tasks found.")
        for t in tasks:
            print(f"  - Task Key: {t.task_key} | Session: {t.session_id} | Status: {t.status} | Latency: {t.latency_seconds}s")
            
        print("\n[DB] ALL UPLOADED FILES:")
        files = session.exec(select(ScrapFile)).all()
        if not files:
            print("  No uploaded files found.")
        for f in files:
            print(f"  - File: {f.filename} | Session: {f.session_id} | Size: {len(f.content)} bytes")

if __name__ == "__main__":
    main()
