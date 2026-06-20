import re
from typing import Dict, Tuple, Any
from bs4 import BeautifulSoup
from targets.croma.scrape.specs import _extract_from_json

async def extract_specs_async(
    t: str, 
    client: Any, 
    **kwargs
) -> Tuple[Dict, Dict]:
    """
    t = full product URL string.
    Asynchronously scrapes technical specifications from a Croma product page.
    """
    product_url = t
    try:
        resp = await client.get(product_url, timeout=25.0)
        resp.raise_for_status()
        
        # We use BeautifulSoup to parse the HTML. 
        # Note: parsing is CPU bound, but it's fast enough that it won't block the loop.
        soup = BeautifulSoup(resp.content, "html.parser")
        specs: Dict[str, str] = {}

        # Strategy 1: JSON in window.__INITIAL_DATA__
        for script in soup.find_all("script"):
            if script.string and "window.__INITIAL_DATA__" in script.string:
                extracted = _extract_from_json(script.string)
                if extracted:
                    specs = extracted
                    break

        # Strategy 2: HTML table / list fallback
        if not specs:
            anchor = soup.find(string=re.compile(r"Dial Shape|Warranty|Resolution", re.I))
            if anchor:
                row = anchor.find_parent(["li", "tr", "div"]) or anchor.parent
                container = row.find_parent(["ul", "tbody", "div", "section"]) if row else None
                if container:
                    for item in container.find_all(["li", "tr"]) or container.find_all("div", recursive=False):
                        texts = [t for t in item.stripped_strings if t]
                        if len(texts) >= 2:
                            specs[texts[0].replace(":", "").strip()] = " ".join(texts[1:]).strip()

        return specs, {"success": True, "count": len(specs)}

    except Exception as e:
        return {}, {"success": False, "error": str(e)}
