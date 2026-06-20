import os
from sqlmodel import SQLModel
from dotenv import load_dotenv
from shared.providers.factory import get_db_provider

# Look for .env in the parent directory since we are running from Backend-v2.5
load_dotenv(".env")

# Resolve active provider and retrieve its engine
db_provider = get_db_provider()
engine = db_provider.engine

def create_db_and_tables():
    """Call this on startup to create tables if they don't exist"""
    db_provider.create_all_tables()
    
    # Dynamic migration: add new optional columns if they don't exist
    from sqlalchemy import text
    with db_provider.get_session() as session:
        for column_name in ["profession", "why_love", "usecase"]:
            try:
                session.execute(text(f"ALTER TABLE userfeedback ADD COLUMN {column_name} VARCHAR;"))
                session.commit()
                print(f"[Migration] Added column '{column_name}' to userfeedback table.")
            except Exception:
                session.rollback()


def get_session():
    """Dependency for FastAPI or context manager for scripts"""
    with db_provider.get_session() as session:
        yield session

