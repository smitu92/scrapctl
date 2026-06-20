import os
from sqlmodel import SQLModel, create_engine, Session
from shared.providers.base import DatabaseProvider

class SQLModelDatabaseProvider(DatabaseProvider):
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        if not self.db_url:
            # Fallback to local SQLite if not configured
            self.db_url = "sqlite:///scrapctl.db"
            print(f"[Database] No DATABASE_URL found. Falling back to default local SQLite: {self.db_url}")

        # Check if using SQLite to configure check_same_thread=False for multi-threading
        is_sqlite = self.db_url.startswith("sqlite")
        connect_args = {}
        if is_sqlite:
            connect_args["check_same_thread"] = False
            
        print(f"[Database] Initializing SQLModel engine on: {self.db_url}")
        self.engine = create_engine(self.db_url, connect_args=connect_args, echo=False)

    def create_all_tables(self) -> None:
        print("[Database] Creating tables via SQLModel...")
        SQLModel.metadata.create_all(self.engine)

    def get_session(self):
        return Session(self.engine)
