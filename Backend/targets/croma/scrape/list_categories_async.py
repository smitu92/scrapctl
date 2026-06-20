from typing import List, Dict, Tuple, Any
from targets.croma.scrape.common_util import CMS_URL, CATEGORY_QUERY


async def get_categories_async(
    t: Any = None,
    client: Any = None,
    **kwargs
) -> Tuple[List[Dict], Dict]:
    """
    Asynchronously extracts all categories from Croma CMS API.
    """
    try:
        resp = await client.get(CMS_URL, params={"query": CATEGORY_QUERY}, timeout=20.0)
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

        limit = kwargs.get("limit")
        if limit:
            categories = categories[:int(limit)]

        return categories, {"success": True, "count": len(categories)}

    except Exception as e:
        return [], {"success": False, "error": str(e)}
