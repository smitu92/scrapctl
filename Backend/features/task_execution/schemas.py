from pydantic import BaseModel
from typing import Dict, List, Optional


class ExecuteTaskRequest(BaseModel):
    target: str                         # "croma" | "blinkit" (future)
    task_type: str                      # "ListDownCategories" | "Productlist" | "Specs_of_categories"
    input_type: str = "raw_list"        # "raw_list" | "single_url" | "device_upload_csv" | "device_upload_txt"
    input_data: List[str] = []          # pasted items / single URL
    file_content: str = ""              # raw CSV or TXT content from browser upload
    target_column: str = ""             # column name chosen from CSV preview
    params: Dict = {}                   # e.g. {"limit": 10, "delay": 0.5, "workers": 5, "max_retries": 3}
    use_proxies: bool = True            # toggle between Local IP and Proxy Fleet
    custom_proxies: List[str] = []      # proxies from user's browser localStorage
    use_default_proxies: bool = True    # toggle to use default 10 proxies
    azure_key: Optional[str] = None     # custom Ocp-Apim-Subscription-Key
    output_path: str = "./output/default_run"
    project_file_id: Optional[str] = None # ID of a file already in the system


class ExecuteTaskResponse(BaseModel):
    session_id: str
    state: str                          # "RUNNING" | "ERROR"
    task_count: int
    error: Optional[str] = None
    details: Optional[str] = None
