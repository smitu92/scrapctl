import asyncio
import random
import json
import os
import csv
import time
from collections import deque
from typing import Callable

from engine.job_tracker import JobTracker
from shared.schemas import TaskEvent

async def _worker_coro(
    worker_id: str,
    tracker: JobTracker,
    scrape_func: Callable,
    call_kwargs: dict,
    rotator,
    client_factory: Callable,
    worker_index: int = 0
) -> None:
    """
    Async worker logic. Each worker maintains ONE persistent httpx.AsyncClient
    to ensure connection reuse and avoid Proxy Auth (407) errors.
    """
    # --- 1. INITIALIZE PERSISTENT CLIENT & PROXY ---
    # Stagger startup to avoid concurrent connection storms on the proxy gateway
    if worker_index > 0:
        await asyncio.sleep(worker_index * 0.25)

    proxy_str = rotator.get_proxy() if rotator else None
    client = client_factory(proxy=proxy_str, **call_kwargs)
    
    consecutive_failures = 0
    
    try:
        while True:
            # Atomic pop from tracker queue
            with tracker.lock:
                if not tracker.q or getattr(tracker, "stopped", False):
                    break
                t = tracker.q.popleft()
                log = tracker.logs[str(t)]
                attempt = log.metadata.attempt

            tracker._push_event(str(t), "STARTED", worker_id=worker_id)


            # --- Respect user-defined delay ---
            delay = call_kwargs.get("delay")
            if delay:
                jitter_delay = float(delay) * (0.5 + random.random())
                await asyncio.sleep(jitter_delay)

            start = time.time()
            try:
                # --- 2. EXECUTE TASK WITH PERSISTENT CLIENT ---
                # Note: scrape_func MUST be an 'async def' function
                result, metadata = await scrape_func(t=t, client=client, **call_kwargs)
                latency = time.time() - start

                if metadata and metadata.get("success"):
                    tracker.reffer_as_success(t, result, latency, proxy=proxy_str, worker_id=worker_id)
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    error_msg = (metadata or {}).get("error") or f"Logical failure on attempt {attempt}"
                    
                    # Rotate proxy and reset client if threshold met
                    if rotator and consecutive_failures >= 3:
                        await client.aclose()
                        proxy_str = rotator.get_proxy()
                        client = client_factory(proxy=proxy_str, **call_kwargs)
                        consecutive_failures = 0
                        
                    await _handle_failure(tracker, t, attempt, error_msg, latency, proxy_str, worker_id=worker_id)
                    await asyncio.sleep(0.5)

            except Exception as exc:
                latency = time.time() - start
                consecutive_failures += 1
                
                # --- 3. ON FAILURE: ROTATE PROXY & RESET CLIENT ONLY IF THRESHOLD MET ---
                if rotator and consecutive_failures >= 3:
                    await client.aclose()
                    proxy_str = rotator.get_proxy()
                    client = client_factory(proxy=proxy_str, **call_kwargs)
                    consecutive_failures = 0
                
                await _handle_failure(tracker, t, attempt, str(exc), latency, proxy_str, worker_id=worker_id)
                await asyncio.sleep(0.5)

    finally:
        await client.aclose()



async def _handle_failure(tracker: JobTracker, t, attempt: int, msg: str, latency: float, proxy: str = None, worker_id: str = None) -> None:
    if attempt >= tracker.max_try:
        tracker.reffer_as_failure(t, msg, latency, proxy=proxy, worker_id=worker_id)
    else:
        tracker.put_into_retry(t, msg, latency, proxy=proxy, worker_id=worker_id)


async def run_scraper_async(
    session_id: str,
    t_list: list,
    scrape_func: Callable,
    call_kwargs: dict,
    client_factory: Callable,
    rotator,
    ui_queue: deque,
    output_dir: str = "./output",
    file_prefix: str = "data",
    max_workers: int = 10,
    max_retries: int = 3,
    task_groups: dict = None,
) -> tuple[str, dict]:
    """
    Entry point for the AsyncIO execution engine.
    """
    os.makedirs(output_dir, exist_ok=True)
    tracker = JobTracker(session_id, ui_queue, max_try=max_retries, output_dir=output_dir, file_prefix=file_prefix)

    tracker.init_tasks(t_list, task_groups=task_groups)

    actual_workers = min(max_workers, len(t_list)) if t_list else 1

    # Create worker coroutines with worker_index to enable staggered startup
    workers = [
        _worker_coro(f"W-{i}", tracker, scrape_func, call_kwargs, rotator, client_factory, worker_index=i)
        for i in range(actual_workers)
    ]
    try:
        # Run all workers in parallel
        await asyncio.gather(*workers)
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
        worker_id="ASYNC_MANAGER",
        status="BATCH_COMPLETE",
        summary=summary,
    )
    ui_queue.append(event.model_dump(mode="json"))

    return json_path, summary


def _write_csv(path: str, final_data: list) -> None:
    # (Identical logic to DumbManager for consistency)
    try:
        if not final_data: return
        rows = []
        all_keys = {"task"}
        for item in final_data:
            result = item.get("result")
            if isinstance(result, list):
                for r in result:
                    if isinstance(r, dict):
                        row = {"task": item["task"], **r}
                        rows.append(row)
                        all_keys.update(row.keys())
            elif isinstance(result, dict):
                row = {"task": item["task"], **result}
                rows.append(row)
                all_keys.update(row.keys())
        if rows:
            fieldnames = ["task"] + sorted([k for k in all_keys if k != "task"])
            with open(path, "w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
    except Exception as e:
        print(f"[AsyncManager] CSV write skipped: {e}")
