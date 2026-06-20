import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import FileResponse
from .schemas import ProjectFolder

from .manager import project_manager

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("", response_model=List[ProjectFolder])
async def list_projects(x_browser_id: str = Header(None)):
    """Returns a list of project folders and their files using IDs, filtered by browser session."""
    return project_manager.list_all_projects(x_browser_id)

@router.get("/{item_id}")
async def get_project_item(item_id: str, x_browser_id: str = Header(None)):
    """Gets metadata for a specific file or folder by ID."""
    item = project_manager.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if x_browser_id and item.get("browser_id") and item.get("browser_id") != x_browser_id:
        raise HTTPException(status_code=403, detail="Access denied: Ownership mismatch")
    return item

@router.post("/folder")
async def create_folder(name: str, parent_id: Optional[str] = None, x_browser_id: str = Header(None)):
    """Creates a new folder and returns its ID."""
    try:
        new_id = project_manager.create_folder(name, parent_id, x_browser_id)
        return {"id": new_id, "name": name}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/download/{file_id}")
async def download_file(file_id: str, x_browser_id: str = Header(None)):
    """Streams a file back to the user by ID."""
    item = project_manager.get_item(file_id)
    if not item or item["type"] != "file":
        raise HTTPException(status_code=404, detail="File not found")
    if x_browser_id and item.get("browser_id") and item.get("browser_id") != x_browser_id:
        raise HTTPException(status_code=403, detail="Access denied: Ownership mismatch")
    
    file_path = item["path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file missing")

    return FileResponse(
        path=file_path,
        filename=item["name"],
        media_type="application/octet-stream"
    )

@router.delete("/all")
async def delete_all_projects(x_admin_key: str = Header(None), x_browser_id: str = Header(None)):
    """Wipes projects (full wipe if admin key, otherwise user-specific session wipe)."""
    if x_admin_key and x_admin_key == os.getenv("ADMIN_SECRET_KEY"):
        project_manager.delete_all(browser_id=None)
        return {"message": "All data wiped successfully (Admin override)"}
    elif x_browser_id:
        project_manager.delete_all(browser_id=x_browser_id)
        return {"message": "All user session data wiped successfully"}
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied: Missing valid credentials.")


@router.delete("/{item_id}")
async def delete_item(item_id: str, x_browser_id: str = Header(None)):
    """Deletes an item by ID."""
    try:
        project_manager.delete_item(item_id, x_browser_id)
        return {"message": "Deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{item_id}/rename")
async def rename_item(item_id: str, name: str, x_browser_id: str = Header(None)):
    """Renames an item by ID."""
    item = project_manager.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if x_browser_id and item.get("browser_id") and item.get("browser_id") != x_browser_id:
        raise HTTPException(status_code=403, detail="Access denied: Ownership mismatch")
    try:
        project_manager.rename_item(item_id, name)
        return {"message": "Renamed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/preview/{file_id}")
async def get_file_preview(file_id: str, page: int = 1, page_size: int = 100, x_browser_id: str = Header(None)):
    """Returns a paginated preview of a file."""
    item = project_manager.get_item(file_id)
    if not item:
        raise HTTPException(status_code=404, detail="File not found")
    if x_browser_id and item.get("browser_id") and item.get("browser_id") != x_browser_id:
        raise HTTPException(status_code=403, detail="Access denied: Ownership mismatch")
    try:
        return project_manager.get_file_preview(file_id, page, page_size)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/{file_id}")
async def sync_file_to_cloud(file_id: str, x_browser_id: str = Header(None)):
    """Uploads a specific scraped file manually to the storage provider (Vercel/S3) after verifying ownership and source path."""
    item = project_manager.get_item(file_id)
    if not item or item["type"] != "file":
        raise HTTPException(status_code=404, detail="File not found")
        
    # Security: Verify ownership
    if x_browser_id and item.get("browser_id") and item.get("browser_id") != x_browser_id:
        raise HTTPException(status_code=403, detail="Access denied: Ownership mismatch")
        
    file_path = item["path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file missing")
        
    # Security: Verify source path is strictly within `./output` folder
    from features.projects.manager import BASE_OUTPUT_DIR
    base_dir = os.path.abspath(BASE_OUTPUT_DIR)
    target_path = os.path.abspath(file_path)
    if not target_path.startswith(base_dir) or target_path == base_dir:
        raise HTTPException(status_code=403, detail="Access denied: Invalid file source path.")
        
    # Security: Limit file extensions
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".json", ".csv", ".log"]:
        raise HTTPException(status_code=403, detail="Access denied: Only JSON, CSV, and LOG files can be synced.")

    # Security: Limit file size
    stat = os.stat(file_path)
    if stat.st_size > 15 * 1024 * 1024:  # 15 MB
        raise HTTPException(status_code=403, detail="Access denied: File size exceeds the 15MB upload limit.")
        
    # Perform upload
    try:
        from shared.providers.factory import get_storage_provider
        storage_provider = get_storage_provider()
        
        # Determine remote path based on parent folder or session
        parent_id = item.get("parent_id")
        session_id = "manual_sync"
        if parent_id:
            parent = project_manager.get_item(parent_id)
            if parent:
                session_id = parent["name"]
                
        remote_path = f"{session_id}/{item['name']}"
        
        success = storage_provider.upload_file(file_path, remote_path)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to upload file to cloud storage provider.")
            
        # Update registry
        item["synced"] = True
        project_manager.registry[file_id] = item
        project_manager.save_registry()
        
        return {"message": "File synced successfully", "remote_path": remote_path}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
