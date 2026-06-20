from pydantic import BaseModel
from typing import List, Optional


class FileItem(BaseModel):
    id: str
    name: str
    path: str
    size_bytes: int
    modified_at: str
    type: str  # "file" | "folder"
    browser_id: Optional[str] = None
    synced: bool = False


class ProjectFolder(BaseModel):
    id: str
    name: str
    path: str
    files: List[FileItem] = []
    created_at: str
    browser_id: Optional[str] = None
