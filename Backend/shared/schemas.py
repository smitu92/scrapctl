from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
from datetime import datetime


class JobMetadata(BaseModel):
    attempt: int = 1
    max_attempts: int = 3
    latency_seconds: float = 0.0
    proxy_used: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ErrorDetails(BaseModel):
    error_type: str  # "SOFT_FAIL" | "HARD_FAIL"
    message: str


class TaskEvent(BaseModel):
    session_id: str
    task_id: str       # str(t) — works for both "cat_id" and "(cat_id, page)" tuples
    worker_id: str
    status: str        # STARTED | SUCCESS | SOFT_FAIL | HARD_FAIL | BATCH_COMPLETE
    metadata: JobMetadata = Field(default_factory=JobMetadata)
    result_data: Optional[Any] = None
    error: Optional[ErrorDetails] = None
    summary: Optional[Dict] = None
