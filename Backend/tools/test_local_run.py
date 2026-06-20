import os
import sys
import uuid
from collections import deque
from dotenv import load_dotenv

# Load environment
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
sys.path.append(BACKEND_DIR)

from targets.croma.controller import CromaController
from features.task_execution.schemas import ExecuteTaskRequest
from engine.dumb_manager import run_scraper_threads
from shared.proxy_rotator import ProxyRotator

def main():
    print("="*60)
    print("LOCAL RUN TEST")
    print("="*60)

    # Mock the request
    req = ExecuteTaskRequest(
        target="croma",
        task_type="ListDownCategories",
        input_type="raw_list",
        input_data=[],
        params={
            "limit": 2,
            "workers": 1,
            "max_retries": 1
        },
        use_proxies=False
    )

    ctrl = CromaController()
    
    print("[Local] Validating request...")
    error_msg = ctrl.validate(req.task_type, req)
    if error_msg:
        print(f"[Local] Validation failed: {error_msg}")
        return

    print("[Local] Building execution packages...")
    t_list, scrape_func, call_kwargs, session_factory, workers, task_groups = ctrl.build_execution(req.task_type, req)
    call_kwargs["azure_key"] = req.azure_key
    call_kwargs["max_retries"] = req.params.get("max_retries", 1)

    session_id = str(uuid.uuid4())
    ui_queue = deque()
    
    print(f"[Local] Running scraper threads for session_id: {session_id}...")
    try:
        run_scraper_threads(
            session_id=session_id,
            t_list=t_list,
            scrape_func=scrape_func,
            call_kwargs=call_kwargs,
            session_factory=session_factory,
            rotator=None,
            ui_queue=ui_queue,
            output_dir=req.output_path,
            file_prefix=req.task_type.lower(),
            max_workers=1,
            max_retries=1,
            task_groups=task_groups,
        )
        print("[Local] Run completed successfully!")
    except Exception as e:
        print("[Local] ERROR during execution:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
