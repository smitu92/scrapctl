import threading
import uuid
from collections import deque

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse
import os

from .schemas import ExecuteTaskRequest, ExecuteTaskResponse
from targets.croma.controller import CromaController
from engine.dumb_manager import run_scraper_threads

router = APIRouter(prefix="/api/task", tags=["task_execution"])

# Injected at startup from main.py
_ui_queue: deque = None
_rotator = None

# Registry: add new targets here — nothing else changes
TARGET_CONTROLLERS = {
    "croma": CromaController,
}


def init_router(ui_queue: deque, rotator) -> None:
    global _ui_queue, _rotator
    _ui_queue = ui_queue
    _rotator = rotator


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/task/registry/{target}
# Frontend calls this to build dynamic UI — no hardcoding needed on frontend
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/registry/{target}")
async def get_registry(target: str):
    ctrl = TARGET_CONTROLLERS.get(target)
    if not ctrl:
        return {"error": f"Unknown target '{target}'."}
    return {"target": target, "registry": ctrl.get_registry()}


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/task/execute
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/execute", response_model=ExecuteTaskResponse)
async def execute_task(req: ExecuteTaskRequest, x_browser_id: str = Header(None)):
    ctrl = TARGET_CONTROLLERS.get(req.target)
    if not ctrl:
        return ExecuteTaskResponse(
            session_id="", state="ERROR", task_count=0,
            error="UNKNOWN_TARGET", details=f"Target '{req.target}' is not registered."
        )

    # --- PRE-VALIDATION: Resolve project file references ---
    if req.project_file_id:
        from features.projects.manager import project_manager
        item = project_manager.get_item(req.project_file_id)
        if item:
            # Enforce authorization check
            if x_browser_id and item.get("browser_id") and item.get("browser_id") != x_browser_id:
                raise HTTPException(status_code=403, detail="Access denied: Ownership mismatch on project file.")
            
            if item["type"] == "file" and os.path.exists(item["path"]):
                import anyio
                def _read_file(p):
                    with open(p, "r", encoding="utf-8") as f:
                        return f.read()
                req.file_content = await anyio.to_thread.run_sync(_read_file, item["path"])
            # Pivot input type to internal upload logic
            if req.input_type == "project_file":
                if item["name"].lower().endswith(".csv"):
                    req.input_type = "device_upload_csv"
                else:
                    req.input_type = "device_upload_txt"

    # Validate
    error_msg = ctrl.validate(req.task_type, req)
    if error_msg:
        return ExecuteTaskResponse(
            session_id="", state="ERROR", task_count=0,
            error="VALIDATION_FAILED", details=error_msg
        )

    # Pre-register output folder with browser_id if output_path is under BASE_OUTPUT_DIR
    from features.projects.manager import project_manager, BASE_OUTPUT_DIR
    out_abspath = os.path.abspath(req.output_path)
    base_abspath = os.path.abspath(BASE_OUTPUT_DIR)
    
    if out_abspath.startswith(base_abspath) and out_abspath != base_abspath:
        folder_name = os.path.basename(out_abspath)
        registered_id = None
        for item_id, item in project_manager.registry.items():
            if os.path.abspath(item["path"]) == out_abspath:
                registered_id = item_id
                break
        if not registered_id:
            try:
                project_manager.create_folder(folder_name, parent_id=None, browser_id=x_browser_id)
            except Exception:
                pass
        else:
            if x_browser_id and not project_manager.registry[registered_id].get("browser_id"):
                project_manager.registry[registered_id]["browser_id"] = x_browser_id
                project_manager.save_registry()

    # Build execution package
    try:
        t_list, scrape_func, call_kwargs, session_factory, workers, task_groups = ctrl.build_execution(req.task_type, req)
        # Inject global params that every worker needs
        call_kwargs["azure_key"] = req.azure_key
        call_kwargs["max_retries"] = req.params.get("max_retries", 3)
    except Exception as e:
        return ExecuteTaskResponse(
            session_id="", state="ERROR", task_count=0,
            error="BUILD_FAILED", details=str(e)
        )

    session_id = str(uuid.uuid4())

    # Fire and forget in background thread
    def _run():
        import asyncio
        from engine.async_manager import run_scraper_async
        from shared.proxy_rotator import ProxyRotator
        from sqlmodel import Session, select
        from shared.models import Proxy
        from shared.database import engine
        
        # Build session rotator
        session_proxies = []
        if req.use_proxies:
            if req.use_default_proxies:
                from features.proxies.routes import get_defaults_for_scraping_in_memory
                session_proxies.extend(get_defaults_for_scraping_in_memory())
            
            if req.custom_proxies:
                session_proxies.extend(req.custom_proxies)

                
        session_rotator = ProxyRotator(session_proxies) if session_proxies else None
        
        import os
        exec_mode = os.getenv("EXECUTION_MODE", "auto").lower()
        
        use_async = False
        if exec_mode == "async":
            use_async = True
        elif exec_mode == "thread":
            use_async = False
        else:
            use_async = req.task_type.endswith("_Async")

        if use_async:
            asyncio.run(run_scraper_async(
                session_id=session_id,
                t_list=t_list,
                scrape_func=scrape_func,
                call_kwargs=call_kwargs,
                client_factory=session_factory,
                rotator=session_rotator,
                ui_queue=_ui_queue,
                output_dir=req.output_path,
                file_prefix=req.task_type.lower(),
                max_workers=workers,
                max_retries=call_kwargs.get("max_retries", 3),
                task_groups=task_groups,
            ))
        else:
            run_scraper_threads(
                session_id=session_id,
                t_list=t_list,
                scrape_func=scrape_func,
                call_kwargs=call_kwargs,
                session_factory=session_factory,
                rotator=session_rotator,
                ui_queue=_ui_queue,
                output_dir=req.output_path,
                file_prefix=req.task_type.lower(),
                max_workers=workers,
                max_retries=call_kwargs.get("max_retries", 3),
                task_groups=task_groups,
            )

    threading.Thread(target=_run, daemon=True).start()

    return ExecuteTaskResponse(
        session_id=session_id,
        state="RUNNING",
        task_count=len(t_list),
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/task/result?file_path=...
# Frontend loads the output JSON file for the results preview table
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/result")
async def get_result(file_path: str):
    base_dir = os.path.abspath("./output")
    target_path = os.path.abspath(file_path)
    if not target_path.startswith(base_dir):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied: Path is outside the allowed directory.")
        
    if not os.path.exists(target_path):
        return {"error": "File not found", "file_path": file_path}
    return FileResponse(target_path)


@router.post("/stop")
async def stop_task(session_id: str | None = None):
    """Stops/cancels a running scraper execution by its session ID, or stops all active sessions if none provided."""
    from engine.job_tracker import JobTracker
    from fastapi import HTTPException
    
    if session_id:
        tracker = JobTracker.ACTIVE_TRACKERS.get(session_id)
        if not tracker:
            raise HTTPException(status_code=404, detail=f"Active session '{session_id}' not found.")
        tracker.stop()
        return {"message": f"Session '{session_id}' stopped successfully."}
    else:
        if not JobTracker.ACTIVE_TRACKERS:
            return {"message": "No active sessions to stop."}
        count = 0
        for tid, tracker in list(JobTracker.ACTIVE_TRACKERS.items()):
            tracker.stop()
            count += 1
        return {"message": f"Successfully requested stop for {count} active sessions."}

