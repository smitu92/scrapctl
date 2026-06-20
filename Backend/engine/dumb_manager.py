import time
import random
import json
import os
import csv
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, Optional

from engine.job_tracker import JobTracker
from shared.schemas import TaskEvent


def _scraper_work(tracker: JobTracker, scrape_func: Callable, call_kwargs: dict,
                  rotator, session_factory: Callable) -> None:
    """
    Worker thread logic. Uses ONE persistent session for all tasks to 
    maintain 'Keep-Alive' and avoid 407 Proxy Authentication errors.
    """
    # --- 1. INITIALIZE PERSISTENT SESSION & PROXY ---
    session = session_factory(**call_kwargs)
    
    # Each thread gets its own 'sticky' proxy to reduce authentication handshakes
    proxy_str = rotator.get_proxy() if rotator else None
    proxy_dict = _build_proxy(proxy_str)
    
    if proxy_dict:
        session.proxies = proxy_dict

    consecutive_failures = 0

    while True:
        with tracker.lock:
            if not tracker.q or getattr(tracker, "stopped", False):
                break
            t = tracker.q.popleft()
            log = tracker.logs[str(t)]
            attempt = log.metadata.attempt

        tracker._push_event(str(t), "STARTED")

        # --- Respect user-defined delay ---
        delay = call_kwargs.get("delay")
        if delay:
            try:
                jitter_delay = float(delay) * (0.5 + random.random())
                time.sleep(jitter_delay)
            except:
                pass

        start = time.time()
        try:
            # --- 2. EXECUTE TASK WITH PERSISTENT SESSION ---
            result, metadata = scrape_func(t=t, proxy=proxy_dict, session=session, **call_kwargs)

            latency = time.time() - start

            if metadata and metadata.get("success"):
                tracker.reffer_as_success(t, result, latency, proxy=proxy_str)
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                error_msg = (metadata or {}).get("error") or f"Logical failure on attempt {attempt}"
                
                # Rotate session and proxy if we hit the failure threshold
                if rotator and consecutive_failures >= 3:
                    proxy_str = rotator.get_proxy()
                    proxy_dict = _build_proxy(proxy_str)
                    session = session_factory(**call_kwargs)
                    if proxy_dict:
                        session.proxies = proxy_dict
                    consecutive_failures = 0
                
                _handle_failure(tracker, t, attempt, error_msg, latency, proxy=proxy_str)

        except Exception as exc:
            latency = time.time() - start
            consecutive_failures += 1
            
            # --- 3. ON FAILURE: ROTATE PROXY & RESET SESSION ONLY IF THRESHOLD MET ---
            if rotator and consecutive_failures >= 3:
                proxy_str = rotator.get_proxy()
                proxy_dict = _build_proxy(proxy_str)
                session = session_factory(**call_kwargs) # Fresh session for the new proxy
                if proxy_dict:
                    session.proxies = proxy_dict
                consecutive_failures = 0
            
            _handle_failure(tracker, t, attempt, str(exc), latency, proxy=proxy_str)
            time.sleep(0.5)



def _handle_failure(tracker: JobTracker, t, attempt: int, msg: str, latency: float, proxy: str = None) -> None:
    if attempt >= tracker.max_try:
        tracker.reffer_as_failure(t, msg, latency, proxy=proxy)
    else:
        tracker.put_into_retry(t, msg, latency, proxy=proxy)


def _build_proxy(proxy_str: Optional[str]) -> Optional[dict]:
    if not proxy_str:
        return None
    if not proxy_str.startswith("http"):
        proxy_str = f"http://{proxy_str}"
    return {"http": proxy_str, "https": proxy_str}


def run_scraper_threads(
    session_id: str,
    t_list: list,
    scrape_func: Callable,
    call_kwargs: dict,
    session_factory: Callable,
    rotator,
    ui_queue: deque,
    output_dir: str = "./output",
    file_prefix: str = "data",
    max_workers: int = 5,
    max_retries: int = 3,
    task_groups: dict = None,
) -> tuple[str, dict]:
    """
    Entry point for the generic execution engine.
    Returns (output_json_path, summary_dict).
    """
    os.makedirs(output_dir, exist_ok=True)
    tracker = JobTracker(session_id, ui_queue, max_try=max_retries, output_dir=output_dir, file_prefix=file_prefix)

    tracker.init_tasks(t_list, task_groups=task_groups)

    actual_workers = min(max_workers, len(t_list)) if t_list else 1

    try:
        with ThreadPoolExecutor(max_workers=actual_workers) as executor:
            futures = [
                executor.submit(_scraper_work, tracker, scrape_func, call_kwargs, rotator, session_factory)
                for _ in range(actual_workers)
            ]
            for f in as_completed(futures):
                f.result()  # surface any uncaught thread exceptions
    finally:
        # Flush any remaining logs to file (survives crashes!)
        tracker.final_flush()
        # Remove from active trackers
        with tracker.lock:
            JobTracker.ACTIVE_TRACKERS.pop(tracker.session_id, None)


    # ---------------------------------------------------------------- save output

    success_count, fail_count, final_data = 0, 0, []
    for key, log in tracker.logs.items():
        if log.result is not None:
            success_count += 1
            final_data.append({"task": key, "result": log.result})
        else:
            fail_count += 1

    json_path = os.path.join(output_dir, f"{file_prefix}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(final_data, f, indent=4, ensure_ascii=False)

    csv_path = os.path.join(output_dir, f"{file_prefix}.csv")
    _write_csv(csv_path, final_data)

    # --- Save detailed execution logs
    logs_path = os.path.join(output_dir, f"{file_prefix}_logs.json")
    with open(logs_path, "w", encoding="utf-8") as f:
        json.dump(tracker.get_full_logs(), f, indent=4, ensure_ascii=False)

    # --- Upload final files to Storage (Disabled for manual sync control)
    # tracker._upload_to_storage(json_path)
    # tracker._upload_to_storage(csv_path)
    # tracker._upload_to_storage(logs_path)

    # ---------------------------------------------------------------- BATCH_COMPLETE event

    summary = {"success_count": success_count, "fail_count": fail_count, "output_file": json_path}
    event = TaskEvent(
        session_id=session_id,
        task_id="BATCH",
        worker_id="MANAGER",
        status="BATCH_COMPLETE",
        summary=summary,
    )
    ui_queue.append(event.model_dump(mode="json"))

    return json_path, summary


def _write_csv(path: str, final_data: list) -> None:
    try:
        if not final_data:
            return
        
        rows = []
        all_keys = set()
        all_keys.add("task")

        for item in final_data:
            result = item.get("result")
            if isinstance(result, list):
                # Handle list of results (e.g. products)
                for r in result:
                    if isinstance(r, dict):
                        row = {"task": item["task"], **r}
                        rows.append(row)
                        all_keys.update(row.keys())
            elif isinstance(result, dict):
                # Handle single result (e.g. spec)
                row = {"task": item["task"], **result}
                rows.append(row)
                all_keys.update(row.keys())

        if rows:
            # Sort keys to have 'task' first, then alphabetical
            fieldnames = ["task"] + sorted([k for k in all_keys if k != "task"])
            with open(path, "w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
    except Exception as e:
        print(f"[DumbManager] CSV write skipped: {e}")

