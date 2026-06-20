from typing import Dict, List, Tuple
from targets.croma.scrape.common_util import SEARCH_URL_TEMPLATE


async def _fetch_page_async(category_id: str, page: int, client, params_override: dict = None) -> dict:
    """Async page fetcher using httpx Client."""
    url = SEARCH_URL_TEMPLATE.format(category_id=category_id)
    params = {
        "currentPage": str(page),
        "query": ":relevance",
        "fields": "FULL",
        "channel": "WEB",
        "channelCode": "400049",
        **(params_override or {}),
    }
    
    # client is expected to be an httpx.AsyncClient instance
    resp = await client.get(url, params=params, timeout=20.0)
    resp.raise_for_status()
    return resp.json()


def _parse_products(data: dict) -> List[Dict]:
    """Parses Croma search API response into clean product dicts."""
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
# Async Version of get_product_page (Option B)
# ──────────────────────────────────────────────────────────────────────────────
async def get_product_page_async(
    t: Tuple[str, int],
    client,
    **kwargs,
) -> Tuple[List[Dict], Dict]:
    """
    t = (category_id, page_number).
    Fetches exactly one page asynchronously. TaskExpander built the list.
    """
    category_id, page = t
    try:
        data = await _fetch_page_async(category_id, page, client)
        products = _parse_products(data)
        return products, {"success": True, "count": len(products)}
    except Exception as e:
        # Returning success: False allows the AsyncManager to handle retries
        return [], {"success": False, "error": str(e)}
