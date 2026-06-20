import os
import json
import uuid
import time
from datetime import datetime, timezone
from typing import Dict, Optional, List
from .schemas import FileItem, ProjectFolder

REGISTRY_FILE = "projects_registry.json"
BASE_OUTPUT_DIR = "./output"

class ProjectManager:
    def __init__(self):
        self.registry: Dict[str, dict] = {}
        self.load_registry()
        self.sync_with_disk()

    def load_registry(self):
        if os.path.exists(REGISTRY_FILE):
            with open(REGISTRY_FILE, "r") as f:
                self.registry = json.load(f)
        else:
            self.registry = {}

    def save_registry(self):
        with open(REGISTRY_FILE, "w") as f:
            json.dump(self.registry, f, indent=4)

    def sync_with_disk(self):
        """Scans the disk, removes missing paths from registry, and adds missing entries to registry."""
        if not os.path.exists(BASE_OUTPUT_DIR):
            os.makedirs(BASE_OUTPUT_DIR)

        # Prune dead entries from registry (paths that don't exist on disk)
        dead_keys = [k for k, item in self.registry.items() if not os.path.exists(item["path"])]
        for k in dead_keys:
            del self.registry[k]

        # Existing paths in registry
        registered_paths = {os.path.abspath(item["path"]): id for id, item in self.registry.items()}

        for root, dirs, files in os.walk(BASE_OUTPUT_DIR):
            for name in dirs + files:
                full_path = os.path.abspath(os.path.join(root, name))
                if full_path not in registered_paths:
                    new_id = str(uuid.uuid4())[:8]
                    parent_id = registered_paths.get(os.path.abspath(root))
                    
                    # Inherit browser_id from parent if it exists
                    browser_id = None
                    if parent_id:
                        parent_item = self.registry.get(parent_id)
                        if parent_item:
                            browser_id = parent_item.get("browser_id")

                    self.registry[new_id] = {
                        "id": new_id,
                        "name": name,
                        "path": full_path,
                        "type": "folder" if os.path.isdir(full_path) else "file",
                        "parent_id": parent_id,
                        "browser_id": browser_id,
                        "synced": False
                    }
                    # Update local lookup so children of this folder can find it
                    registered_paths[full_path] = new_id
        self.save_registry()

    def get_item(self, item_id: str) -> Optional[dict]:
        return self.registry.get(item_id)

    def get_children(self, parent_id: Optional[str]) -> List[dict]:
        return [item for item in self.registry.values() if item.get("parent_id") == parent_id]

    def cleanup_empty_folders(self):
        """Removes UNTRACKED folders that are empty. Keeps registered ones."""
        registered_paths = {os.path.abspath(item["path"]) for item in self.registry.values()}
        
        for root, dirs, files in os.walk(BASE_OUTPUT_DIR, topdown=False):
            for name in dirs:
                full_path = os.path.abspath(os.path.join(root, name))
                # Only delete if empty AND not in our registry
                if not os.listdir(full_path) and full_path not in registered_paths:
                    print(f"[FS] Removing untracked empty folder: {full_path}")
                    os.rmdir(full_path)
        # No need to save_registry here since we didn't touch registered items

    def create_folder(self, name: str, parent_id: Optional[str] = None, browser_id: Optional[str] = None) -> str:
        self.cleanup_empty_folders()
        
        parent_path = os.path.abspath(BASE_OUTPUT_DIR)
        if parent_id:
            parent = self.get_item(parent_id)
            if parent and parent["type"] == "folder":
                parent_path = os.path.abspath(parent["path"])
        
        new_path = os.path.join(parent_path, name)
        resolved_path = os.path.abspath(new_path)
        resolved_parent = os.path.abspath(parent_path)
        
        # Prevent directory traversal
        if not resolved_path.startswith(resolved_parent) or resolved_path == resolved_parent:
            raise ValueError("Access denied: Invalid folder name / path traversal detected.")
        
        # Validation: Check if name already exists in this parent
        for item in self.registry.values():
            if item["name"].lower() == name.lower() and item["parent_id"] == parent_id:
                raise ValueError(f"Folder '{name}' already exists.")

        os.makedirs(resolved_path, exist_ok=True)
        
        new_id = str(uuid.uuid4())[:8]
        self.registry[new_id] = {
            "id": new_id,
            "name": name,
            "path": resolved_path,
            "type": "folder",
            "parent_id": parent_id,
            "browser_id": browser_id
        }
        self.save_registry()
        return new_id

    def delete_item(self, item_id: str, browser_id: Optional[str] = None):
        """Deletes a file or folder from disk and registry."""
        item = self.get_item(item_id)
        if not item:
            raise ValueError("Item not found")

        # Check browser_id if set in registry
        if item.get("browser_id") and item.get("browser_id") != browser_id:
            raise ValueError("Permission denied: Browser ID does not match")

        path = item["path"]
        if os.path.exists(path):
            import shutil
            if item["type"] == "folder":
                shutil.rmtree(path)
            else:
                os.remove(path)
        
        # Remove from registry
        del self.registry[item_id]
        
        # Remove children if any
        children_ids = [id for id, i in self.registry.items() if i.get("parent_id") == item_id]
        for c_id in children_ids:
            del self.registry[c_id]
            
        self.save_registry()

    def rename_item(self, item_id: str, new_name: str):
        """Renames a file or folder on disk and updates registry."""
        item = self.get_item(item_id)
        if not item:
            raise ValueError("Item not found")

        parent_path = os.path.abspath(os.path.dirname(item["path"]))
        new_path = os.path.join(parent_path, new_name)
        resolved_path = os.path.abspath(new_path)
        resolved_parent = os.path.abspath(parent_path)
        
        # Prevent directory traversal
        if not resolved_path.startswith(resolved_parent) or resolved_path == resolved_parent:
            raise ValueError("Access denied: Invalid new name / path traversal detected.")
        
        if os.path.exists(resolved_path):
            raise ValueError(f"Name '{new_name}' already exists in this directory.")

        if not os.path.exists(item["path"]):
            raise ValueError("Source item physically missing on disk.")

        os.rename(item["path"], resolved_path)
        
        # Update registry
        self.registry[item_id]["name"] = new_name
        self.registry[item_id]["path"] = resolved_path
        
        # Update children paths
        for child in self.registry.values():
            if child.get("parent_id") == item_id:
                child["path"] = os.path.abspath(os.path.join(resolved_path, child["name"]))
                
        self.save_registry()

    def delete_all(self, browser_id: Optional[str] = None):
        """Wipes either the entire output directory (if no browser_id) or all user's folders (if browser_id)."""
        if not browser_id:
            if os.path.exists(BASE_OUTPUT_DIR):
                import shutil
                shutil.rmtree(BASE_OUTPUT_DIR)
            os.makedirs(BASE_OUTPUT_DIR)
            self.registry = {}
            self.save_registry()
        else:
            # Delete only items belonging to browser_id
            top_level_ids = [
                item_id for item_id, item in self.registry.items()
                if item.get("browser_id") == browser_id and not item.get("parent_id")
            ]
            for item_id in top_level_ids:
                try:
                    self.delete_item(item_id, browser_id)
                except Exception:
                    pass


    def get_file_preview(self, file_id: str, page: int = 1, page_size: int = 100):
        """Returns a paginated preview of a CSV or JSON file."""
        item = self.get_item(file_id)
        if not item or item["type"] != "file":
            raise ValueError("File not found")

        path = item["path"]
        if not os.path.exists(path):
            raise ValueError("Physical file missing")

        ext = os.path.splitext(path)[1].lower()
        start_idx = (page - 1) * page_size
        
        if ext == ".csv":
            import csv
            data = []
            headers = []
            with open(path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []
                # Skip to start
                for _ in range(start_idx):
                    try:
                        next(reader)
                    except StopIteration:
                        break
                # Read page_size
                for _ in range(page_size):
                    try:
                        data.append(next(reader))
                    except StopIteration:
                        break
            return {"type": "csv", "headers": headers, "data": data, "page": page, "has_more": len(data) == page_size}

        elif ext == ".json":
            with open(path, "r", encoding="utf-8") as f:
                content = json.load(f)
                if isinstance(content, list):
                    page_data = content[start_idx : start_idx + page_size]
                    return {"type": "json", "data": page_data, "page": page, "has_more": len(page_data) == page_size}
                else:
                    return {"type": "json", "data": [content], "page": 1, "has_more": False}
        
        return {"type": "unsupported", "data": [], "page": 1, "has_more": False}

    def list_all_projects(self, browser_id: Optional[str] = None) -> List[ProjectFolder]:
        """Legacy compatibility for old projects list, but with IDs and filtered by browser_id."""
        self.sync_with_disk()  # Ensure we see new files from recent scrapes
        projects = []
        # Find top level folders
        for item in self.registry.values():
            # Filter by browser_id
            if browser_id and item.get("browser_id") and item.get("browser_id") != browser_id:
                continue

            # In our system, top level might be items whose parent_path is BASE_OUTPUT_DIR
            if item["type"] == "folder" and os.path.dirname(item["path"]) == os.path.abspath(BASE_OUTPUT_DIR):
                files = []
                # Find files for this project (immediate children)
                for child in self.registry.values():
                    if browser_id and child.get("browser_id") and child.get("browser_id") != browser_id:
                        continue

                    if child["parent_id"] == item["id"] and child["type"] == "file":
                        try:
                            stat = os.stat(child["path"])
                            files.append(FileItem(
                                id=child["id"],
                                name=child["name"],
                                path=child["path"],
                                size_bytes=stat.st_size,
                                modified_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                                type="file",
                                browser_id=child.get("browser_id"),
                                synced=child.get("synced", False)
                            ))
                        except FileNotFoundError:
                            continue
                
                try:
                    created_at = datetime.fromtimestamp(os.path.getctime(item["path"]), tz=timezone.utc).isoformat()
                except FileNotFoundError:
                    continue
                projects.append(ProjectFolder(
                    id=item["id"],
                    name=item["name"],
                    path=item["path"],
                    files=files,
                    created_at=created_at,
                    browser_id=item.get("browser_id")
                ))
        return projects

project_manager = ProjectManager()
