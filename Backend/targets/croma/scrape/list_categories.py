from typing import Dict, List, Optional
from targets.croma.scrape.common_util import CMS_URL, CATEGORY_QUERY


def get_categories(t, proxy: Optional[Dict] = None, session=None, limit: Optional[int] = None, **kwargs):
    """
    Scrape all categories from Croma CMS.
    't' is a dummy trigger — this function takes no iterative input.
    Returns: (categories_list, metadata)
    """
    resp = session.get(CMS_URL, params={"query": CATEGORY_QUERY}, timeout=20, proxies=proxy)
    resp.raise_for_status()
    payload = resp.json().get("result", {})

    categories: List[Dict] = []
    seen = set()
    items = payload if isinstance(payload, list) else [payload]

    for item in items:
        for slot in item.get("contentSlots", {}).get("contentSlot", []):
            for component in slot.get("components", {}).get("component", []):
                for list_name in ("bannerList", "mobileBannerList"):
                    for banner in (component.get(list_name) or []):
                        link = banner.get("urlLink", "")
                        name = banner.get("name", "").strip()
                        if "/c/" in link and name:
                            cat_id = link.split("/c/")[-1].split("?")[0].rstrip("/")
                            if cat_id and cat_id not in seen:
                                seen.add(cat_id)
                                categories.append({
                                    "id": cat_id,
                                    "name": name,
                                    "url": f"https://www.croma.com{link}" if link.startswith("/") else link,
                                })

    if limit:
        categories = categories[:int(limit)]

    return categories, {"success": True, "count": len(categories)}
