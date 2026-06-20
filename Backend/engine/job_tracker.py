import threading
from collections import deque
from typing import Any, Optional

from shared.schemas import TaskEvent, JobMetadata, ErrorDetails
from shared.database import engine
from shared.models import ScrapSession
from sqlmodel import Session



class _LogEntry:
    """Internal per-task log. Holds original t value, metadata, result, error."""
    def __init__(self, t: Any, max_try: int = 3):
        self.t = t
        self.metadata = JobMetadata(max_attempts=max_try)
        self.result: Any = None
        self.error: Optional[ErrorDetails] = None


class JobTracker:
    """
    Dumb, generic class.
    - Maintains a thread-safe queue of pending tasks.
    - Tracks success / failure / retry per task.
    - Pushes TaskEvent JSON into ui_queue so WebSocket can stream it live.
    - Stores logs in a global dictionary to survive request crashes.
    """
    
    # Global dictionary to store logs per session. Survives request crashes.
    # Format: { session_id: [log_entry1, log_entry2, ...] }
    GLOBAL_LOGS: dict[str, list] = {}
    ACTIVE_TRACKERS: dict[str, 'JobTracker'] = {}

    def __init__(self, session_id: str, ui_queue: deque, max_try: int = 3, output_dir: str = "./output", file_prefix: str = "data"):
        self.session_id = session_id
        self.ui_queue = ui_queue
        self.max_try = max_try
        self.output_dir = output_dir
        self.file_prefix = file_prefix
        self.stopped = False

        # Create session in DB if not exists
        with Session(engine) as session:
            db_sess = session.get(ScrapSession, session_id)
            if not db_sess:
                db_sess = ScrapSession(id=session_id)
                session.add(db_sess)
                session.commit()

        # Initialize global logs for this session if not exists
        if session_id not in JobTracker.GLOBAL_LOGS:
            JobTracker.GLOBAL_LOGS[session_id] = []

        # Register in active trackers
        JobTracker.ACTIVE_TRACKERS[session_id] = self

        self.q: deque = deque()
        self.logs: dict[str, _LogEntry] = {}
        self.lock = threading.Lock()
        self.done = 0

        # Group tracking
        self.groups: dict[str, set[str]] = {}  # group_id -> set of task_keys
        self.task_to_group: dict[str, str] = {} # task_key -> group_id
        self.group_finished_counts: dict[str, int] = {} # group_id -> count of finished tasks

    def stop(self) -> None:
        """Sets the stopped flag to cancel the running job."""
        with self.lock:
            self.stopped = True



    def init_tasks(self, t_list: list, task_groups: dict[str, list] = None) -> None:
        """Load t_list into the queue. Uses str(t) as the dict key."""
        with self.lock:
            for t in t_list:
                key = str(t)
                if key not in self.logs:
                    self.q.append(t)
                    self.logs[key] = _LogEntry(t, self.max_try)
            
            if task_groups:
                for group_id, tasks in task_groups.items():
                    task_keys = {str(t) for t in tasks}
                    self.groups[group_id] = task_keys
                    self.group_finished_counts[group_id] = 0
                    for tk in task_keys:
                        self.task_to_group[tk] = group_id

    # ------------------------------------------------------------------ events
    def _push_event(self, t_key: str, status: str, result=None, error=None, summary=None, worker_id: str = None) -> None:
        log = self.logs.get(t_key)
        m = log.metadata if log else JobMetadata()
        event = TaskEvent(
            session_id=self.session_id,
            task_id=t_key,
            worker_id=worker_id or threading.current_thread().name,
            status=status,
            metadata=m,
            result_data=result,
            error=error,
            summary=summary
        )
        self.ui_queue.append(event.model_dump(mode="json"))

    def _check_group_complete(self, t_key: str) -> None:
        group_id = self.task_to_group.get(t_key)
        if not group_id:
            return
        
        self.group_finished_counts[group_id] += 1
        if self.group_finished_counts[group_id] >= len(self.groups[group_id]):
            # Entire group complete!
            self._push_event(group_id, "GROUP_COMPLETE", summary={
                "message": f"Operation for '{group_id}' successfully finalized.",
                "total_tasks": len(self.groups[group_id])
            })

    # ---------------------------------------------------------------- outcomes
    def _flush_logs_to_file(self) -> None:
        """Flushes in-memory logs for this session to a local file in chunks."""
        import os
        import json
        
        session_logs = JobTracker.GLOBAL_LOGS.get(self.session_id, [])
        if not session_logs:
            return
            
        os.makedirs(self.output_dir, exist_ok=True)
        file_path = os.path.join(self.output_dir, f"{self.file_prefix}_chunks.json")
        
        existing_data = []
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
            except:
                pass
                
        existing_data.extend(session_logs)
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, indent=4, ensure_ascii=False)
            
        # Clear the in-memory list for this chunk
        JobTracker.GLOBAL_LOGS[self.session_id] = []

    def _upload_to_storage(self, file_path: str) -> None:
        """Uploads a local file to the configured object storage provider."""
        import os
        from shared.providers.factory import get_storage_provider
        
        storage_provider = get_storage_provider()
        file_name = os.path.basename(file_path)
        remote_path = f"{self.session_id}/{file_name}"
        
        storage_provider.upload_file(file_path, remote_path)

    def _log_outcome(self, key: str, status: str, latency: float, proxy: Optional[str], result: Any = None, error: Any = None) -> None:

        """Appends a log to the global list and flushes if chunk size reached."""
        import datetime
        
        log_entry = {
            "task": key,
            "status": status,
            "latency": latency,
            "proxy": proxy,
            "result": result,
            "error": error,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        JobTracker.GLOBAL_LOGS[self.session_id].append(log_entry)
        
        # Flush every 100 logs
        if len(JobTracker.GLOBAL_LOGS[self.session_id]) >= 100:
            self._flush_logs_to_file()

    def reffer_as_success(self, t: Any, result: Any, latency: float, proxy: str = None, worker_id: str = None) -> None:
        key = str(t)
        with self.lock:
            if key in self.logs:
                log = self.logs[key]
                log.result = result
                log.metadata.latency_seconds = latency
                log.metadata.proxy_used = proxy
                log.metadata.attempt += 1
                self.done += 1
                self._push_event(key, "SUCCESS", result=result, worker_id=worker_id)
                self._check_group_complete(key)
                
                # Log outcome for chunking (replaces direct DB write)
                self._log_outcome(key, "SUCCESS", latency, proxy, result=result)



    def reffer_as_fail(self, t: Any, error_msg: str, latency: float, proxy: str = None, is_hard_fail: bool = False, worker_id: str = None) -> None:
        key = str(t)
        with self.lock:
            if key in self.logs:
                log = self.logs[key]
                if is_hard_fail:
                    log.error = ErrorDetails(error_type="HARD_FAIL", message=error_msg)
                    log.metadata.latency_seconds = latency
                    log.metadata.proxy_used = proxy
                    log.metadata.attempt += 1
                    err = ErrorDetails(error_type="HARD_FAIL", message=error_msg)
                    self.done += 1
                    self._push_event(key, "HARD_FAIL", error=err, worker_id=worker_id)
                    self._check_group_complete(key)
                    
                    # Log outcome for chunking
                    self._log_outcome(key, "HARD_FAIL", latency, proxy, error=error_msg)
                else:
                    log.metadata.proxy_used = proxy
                    log.metadata.attempt += 1
                    err = ErrorDetails(error_type="SOFT_FAIL", message=error_msg)
                    self._push_event(key, "SOFT_FAIL", error=err, worker_id=worker_id)
                    self.q.append(log.t)  # re-queue original t
                    
                    # Log outcome for chunking
                    self._log_outcome(key, "SOFT_FAIL", latency, proxy, error=error_msg)


    def reffer_as_failure(self, t: Any, error_msg: str, latency: float, proxy: str = None, worker_id: str = None) -> None:
        """Proxies hard failures to reffer_as_fail for backward compatibility."""
        self.reffer_as_fail(t, error_msg, latency, proxy=proxy, is_hard_fail=True, worker_id=worker_id)



    def put_into_retry(self, t: Any, error_msg: str, latency: float, proxy: str = None, worker_id: str = None) -> None:
        key = str(t)
        with self.lock:
            if key in self.logs:
                log = self.logs[key]
                log.metadata.latency_seconds = latency
                log.metadata.proxy_used = proxy
                log.metadata.attempt += 1
                err = ErrorDetails(error_type="SOFT_FAIL", message=error_msg)
                self._push_event(key, "SOFT_FAIL", error=err, worker_id=worker_id)
                self.q.append(log.t)  # re-queue original t
                
                # Log outcome for chunking
                self._log_outcome(key, "SOFT_FAIL", latency, proxy, error=error_msg)


    def final_flush(self) -> None:
        """Flushes any remaining logs in memory to the file at the end of the run."""
        self._flush_logs_to_file()
        
        # Upload the chunked logs file to storage (Disabled for manual sync control)
        # import os
        # file_path = os.path.join(self.output_dir, f"{self.file_prefix}_chunks.json")
        # if os.path.exists(file_path):
        #     self._upload_to_storage(file_path)
            
        # Clean up the global dict reference
        if self.session_id in JobTracker.GLOBAL_LOGS:
            del JobTracker.GLOBAL_LOGS[self.session_id]


    def get_full_logs(self) -> list:

        """Returns a list of all log entries for final file export."""
        with self.lock:
            return [
                {
                    "task": key,
                    "status": "SUCCESS" if log.result is not None else ("HARD_FAIL" if log.error else "PENDING"),
                    "attempts": log.metadata.attempt,
                    "latency": log.metadata.latency_seconds,
                    "proxy": log.metadata.proxy_used,
                    "error": log.error.model_dump() if log.error else None,
                    "timestamp": log.metadata.timestamp.isoformat()
                }
                for key, log in self.logs.items()
            ]
