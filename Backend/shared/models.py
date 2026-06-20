from sqlmodel import SQLModel, Field, Column
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import JSON


class ScrapSession(SQLModel, table=True):
    """Tracks a full scraping run or batch"""
    id: str = Field(primary_key=True) # session_id
    status: str = "RUNNING"            # RUNNING | COMPLETED | FAILED
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ScrapTask(SQLModel, table=True):
    """Tracks individual tasks within a session (e.g., scraping a specific product)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="scrapsession.id", index=True)
    
    task_key: str       # str(t)
    worker_id: Optional[str] = None
    status: str        # SUCCESS | SOFT_FAIL | HARD_FAIL
    
    # Metadata
    attempts: int = 1
    latency_seconds: float = 0.0
    proxy_used: Optional[str] = None
    
    # Data
    # Using SQLAlchemy JSON type to store dicts directly in Supabase/Postgres
    result_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # Error details
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    
    timestamp: datetime = Field(default_factory=datetime.now)


class Proxy(SQLModel, table=True):
    """Stores proxies (both default and user-added)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    ip: str
    port: str
    username: Optional[str] = None
    password: Optional[str] = None
    status: str = "PENDING"  # PENDING | ACTIVE | DEAD | INVALID
    latency: Optional[float] = None
    last_checked: Optional[datetime] = None
    is_default: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.now)


class UserProxyTest(SQLModel, table=True):
    """Tracks when a specific user (by browser_id) last tested the proxies"""
    id: Optional[int] = Field(default=None, primary_key=True)
    browser_id: str = Field(index=True, unique=True)
    last_tested_at: datetime = Field(default_factory=datetime.now)


class ScrapFile(SQLModel, table=True):
    """Stores logs and output results as binary blobs in the database"""
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    filename: str
    content: bytes
    created_at: datetime = Field(default_factory=datetime.now)


class UserFeedback(SQLModel, table=True):
    """Stores feedback and preferences from landing page visitors"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: Optional[str] = Field(default=None, index=True)
    focus_on_url_scraping: bool = Field(default=True)
    open_source_project: bool = Field(default=True)
    profession: Optional[str] = Field(default=None)
    why_love: Optional[str] = Field(default=None)
    usecase: Optional[str] = Field(default=None)
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


