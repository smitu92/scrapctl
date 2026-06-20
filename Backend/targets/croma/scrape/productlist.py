import time
from typing import Dict, List, Optional, Tuple
from targets.croma.scrape.common_util import SEARCH_URL_TEMPLATE


def _fetch_page(category_id: str, page: int, session, proxy, params_override: dict = None) -> dict:
    url = SEARCH_URL_TEMPLATE.format(category_id=category_id)
    params = {
        "currentPage": str(page),
        "query": ":relevance",
        "fields": "FULL",
        "channel": "WEB",
        "channelCode": "400049",
        **(params_override or {}),
    }
    resp = session.get(url, params=params, timeout=20, proxies=proxy)
    resp.raise_for_status()
    return resp.json()


def _parse_products(data: dict) -> List[Dict]:
    return [
        {
            "sku": p.get("code", ""),
            "name": p.get("name", ""),
            "brand": p.get("brandName", ""),
            "price": p.get("price", {}).get("formattedValue", ""),
            "rating": str(p.get("averageRating", "")),
            "url": "https://www.croma.com" + p.get("url", ""),
        }
        for p in data.get("products", [])
    ]


# ──────────────────────────────────────────────────────────────────────────────
# Option A — t = category_id
# Worker handles all pages internally (used when user provides a single cat_id)
# ──────────────────────────────────────────────────────────────────────────────
def get_products_for_category(
    t: str,
    proxy: Optional[Dict],
    session,
    limit: Optional[int] = None,
    delay: float = 1.5,
    **kwargs,
) -> Tuple[List[Dict], Dict]:
    """
    t = category_id string.
    Fetches all pages for that category internally (while-loop).
    Use this when the user provides ONE category id.
    """
    category_id = t
    products: List[Dict] = []
    page = 0

    while True:
        data = _fetch_page(category_id, page, session, proxy)
        products.extend(_parse_products(data))

        pagination = data.get("pagination", {})
        total_pages = pagination.get("totalPages", 1)

        if limit and len(products) >= int(limit):
            products = products[:int(limit)]
            break
        if page >= total_pages - 1:
            break

        page += 1
        time.sleep(delay)

    return products, {"success": True, "count": len(products)}


# ──────────────────────────────────────────────────────────────────────────────
# Option B — t = (category_id, page_number) tuple
# Worker fetches EXACTLY one page (used when user provides MULTIPLE cat_ids)
# The manager handles parallelism across all (cat_id, page) combinations.
# ──────────────────────────────────────────────────────────────────────────────
def get_product_page(
    t: Tuple[str, int],
    proxy: Optional[Dict],
    session,
    **kwargs,
) -> Tuple[List[Dict], Dict]:
    """
    t = (category_id, page_number).
    Fetches exactly one page. No while-loop. TaskExpander pre-built the full t_list.
    """
    category_id, page = t
    data = _fetch_page(category_id, page, session, proxy)
    products = _parse_products(data)
    return products, {"success": True, "count": len(products)}
