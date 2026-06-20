import os
from typing import Optional, Tuple, Callable, Dict, Any

from engine.input_extractor import InputExtractor
from targets.croma.scrape.list_categories import get_categories
from targets.croma.scrape.list_categories_async import get_categories_async
from targets.croma.scrape.productlist import get_products_for_category, get_product_page
from targets.croma.scrape.productlist_async import get_product_page_async
from targets.croma.scrape.specs import extract_specs
from targets.croma.scrape.specs_async import extract_specs_async
from targets.croma.scrape.common_util import create_api_session, create_html_session, create_async_api_client
from targets.croma.task_expander import expand_categories_to_pages


# ──────────────────────────────────────────────────────────────────────────────
# Registry — defines what each task type needs and which function runs it.
# ──────────────────────────────────────────────────────────────────────────────
TASK_REGISTRY: Dict[str, Dict[str, Any]] = {
    "ListDownCategories": {
        "label": "Extract All Categories (Sync)",
        "description": "Scrapes categories from the homepage (Threaded).",
        "needs_input": False,
        "scrape_func": get_categories,
        "session_factory": create_api_session,
        "accepted_params": ["limit", "max_retries"],
        "input_label": None,
        "input_hint": None,
    },
    "ListDownCategories_Async": {
        "label": "Extract All Categories (Async)",
        "description": "Scrapes categories from the homepage (AsyncIO).",
        "needs_input": False,
        "scrape_func": get_categories_async,
        "session_factory": create_async_api_client,
        "accepted_params": ["max_retries"],
        "input_label": None,
        "input_hint": None,
    },
    "Productlist": {
        "label": "Extract Product List (Sync)",
        "description": "Extracts products for categories (Threaded).",
        "needs_input": True,
        "scrape_func": get_products_for_category,
        "scrape_func_batch": get_product_page,
        "session_factory": create_api_session,
        "accepted_params": ["limit", "delay", "workers", "max_retries"],
        "input_label": "Category IDs",
        "input_hint": "Croma category IDs (e.g. 10, 392).",
    },
    "Productlist_Async": {
        "label": "Extract Product List (Async)",
        "description": "Extracts products for categories (AsyncIO + HTTP/2).",
        "needs_input": True,
        "scrape_func_batch": get_product_page_async,
        "session_factory": create_async_api_client,
        "accepted_params": ["delay", "workers", "max_retries"],
        "input_label": "Category IDs",
        "input_hint": "Croma category IDs (e.g. 10, 392).",
    },
    "Specs_of_categories": {
        "label": "Extract Product Specs (Sync)",
        "description": "Extracts tech specs from URLs (Threaded).",
        "needs_input": True,
        "scrape_func": extract_specs,
        "session_factory": create_html_session,
        "accepted_params": ["workers", "max_retries"],
        "input_label": "Product URLs",
        "input_hint": "Full Croma URLs, one per line.",
    },
    "Specs_of_categories_Async": {
        "label": "Extract Product Specs (Async)",
        "description": "Extracts tech specs from URLs (AsyncIO + HTTP/2).",
        "needs_input": True,
        "scrape_func": extract_specs_async,
        "session_factory": create_async_api_client,
        "accepted_params": ["workers", "max_retries"],
        "input_label": "Product URLs",
        "input_hint": "Full Croma URLs, one per line.",
    },
}


class CromaController:
    """
    Smart, Croma-specific controller.
    """

    @staticmethod
    def get_registry() -> Dict:
        """Returns frontend-safe registry info filtered by EXECUTION_MODE."""
        mode = os.getenv("EXECUTION_MODE", "BOTH").upper()
        
        filtered = {}
        for task_id, recipe in TASK_REGISTRY.items():
            is_async_task = task_id.endswith("_Async")
            
            if mode == "SYNC" and is_async_task:
                continue
            if mode == "ASYNC" and not is_async_task:
                continue
            
            filtered[task_id] = {
                "label": recipe["label"],
                "description": recipe["description"],
                "needs_input": recipe["needs_input"],
                "accepted_params": recipe["accepted_params"],
                "input_label": recipe.get("input_label"),
                "input_hint": recipe.get("input_hint"),
            }
        return filtered

    @staticmethod
    def validate(task_type: str, req) -> Optional[str]:
        if task_type not in TASK_REGISTRY:
            return f"Unknown task_type '{task_type}'."
        recipe = TASK_REGISTRY[task_type]
        if recipe["needs_input"] and not (req.input_data or req.file_content):
            return f"Task '{task_type}' requires '{recipe['input_label']}'."
        return None

    @staticmethod
    def build_execution(task_type: str, req) -> Tuple[list, Callable, dict, Callable, int, Optional[Dict]]:
        recipe = TASK_REGISTRY[task_type]
        task_groups = None

        call_kwargs = {
            k: v for k, v in (req.params or {}).items()
            if k in recipe["accepted_params"]
        }
        workers = int(req.params.get("workers", 5)) if req.params else 5

        if not recipe["needs_input"]:
            t_list = [1]
            scrape_func = recipe["scrape_func"]
        else:
            items = InputExtractor.extract(
                input_type=req.input_type,
                input_data=req.input_data or [],
                file_content=req.file_content or "",
                target_column=req.target_column or "",
            )
            if not items:
                raise ValueError("No valid items extracted.")

            if task_type in ["Productlist", "Productlist_Async"]:
                t_list, task_groups = expand_categories_to_pages(items, proxy=None)
                scrape_func = recipe["scrape_func_batch"]
                call_kwargs.pop("limit", None)
            else:
                t_list = items
                # For Specs, handle both Sync and Async scrape_func
                scrape_func = recipe["scrape_func"] if "scrape_func" in recipe else recipe["scrape_func_batch"]

        session_factory = recipe["session_factory"]
        return t_list, scrape_func, call_kwargs, session_factory, workers, task_groups
