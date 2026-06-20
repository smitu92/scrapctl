from typing import List, Tuple, Dict
from targets.croma.scrape.common_util import SEARCH_URL_TEMPLATE, create_api_session


def _get_total_pages(category_id: str, session, proxy) -> int:
    """Quick prefetch of page 0 to discover totalPages for a category."""
    
    # Sanitize: if a full URL is passed, extract the ID (usually after /c/)
    clean_id = category_id.split("/c/")[-1].split("?")[0].strip("/") if "/c/" in category_id else category_id
    
    url = SEARCH_URL_TEMPLATE.format(category_id=clean_id)
    params = {
        "currentPage": "0",
        "query": ":relevance",
        "fields": "BASIC",       # lightweight — we only need pagination metadata
        "channel": "WEB",
        "channelCode": "400049",
    }

    try:
        resp = session.get(url, params=params, timeout=15, proxies=proxy)
        resp.raise_for_status()
        return resp.json().get("pagination", {}).get("totalPages", 1)
    except Exception as e:
        print(f"[TaskExpander] Prefetch failed for cat '{category_id}': {e}")
        return 1  # assume at least 1 page so we don't skip the category


def expand_categories_to_pages(
    category_ids: List[str],
    proxy=None,
) -> Tuple[List[Tuple[str, int]], Dict[str, List[Tuple[str, int]]]]:
    """
    For each category_id:
        1. Hit page 0 to get totalPages.
        2. Expand into (category_id, page) tuples for all pages.

    Returns:
        (t_list, task_groups)
        t_list: flat list ready for JobTracker
        task_groups: dict mapping cat_id -> [tasks...]
    """
    session = create_api_session()
    t_list: List[Tuple[str, int]] = []
    task_groups: Dict[str, List[Tuple[str, int]]] = {}

    for cat_id in category_ids:
        # Sanitize clean ID for labeling
        clean_id = cat_id.split("/c/")[-1].split("?")[0].strip("/") if "/c/" in cat_id else cat_id
        
        total = _get_total_pages(cat_id, session, proxy)
        group_tasks = []
        for page in range(total):
            task = (cat_id, page)
            t_list.append(task)
            group_tasks.append(task)
        
        task_groups[f"Category: {clean_id}"] = group_tasks

    return t_list, task_groups
