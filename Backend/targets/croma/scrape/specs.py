import json
import re
from typing import Dict, Optional, Tuple
from bs4 import BeautifulSoup


def _extract_from_json(script_text: str) -> Optional[Dict]:
    try:
        start = script_text.find("{")
        end = script_text.rfind("}") + 1
        if start < 0 or end <= start:
            return None
        json_text = re.sub(r"\bundefined\b", "null", script_text[start:end])
        data = json.loads(json_text)
        specs: Dict[str, str] = {}
        for cls in data.get("pdpReducer", {}).get("pdpData", {}).get("classifications", []):
            for feat in cls.get("features", []):
                key = feat.get("name")
                if not key:
                    continue
                values = []
                for v in feat.get("featureValues", []):
                    val = (v.get("displayValue") or v.get("value") or v.get("name")) if isinstance(v, dict) else v
                    if val:
                        values.append(str(val).strip())
                if values:
                    specs[key] = " , ".join(values)
        return specs or None
    except Exception:
        return None


def extract_specs(t: str, proxy, session, **kwargs) -> Tuple[Dict, Dict]:
    """
    t = full product URL string.
    Scrapes technical specifications from a Croma product page.
    """
    product_url = t
    resp = session.get(product_url, timeout=25, proxies=proxy)
    resp.raise_for_status()
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

    # Strategy 3: dt/dd fallback
    if not specs:
        for dt in soup.find_all("dt"):
            dd = dt.find_next_sibling("dd")
            if dd:
                specs[dt.get_text(strip=True)] = dd.get_text(strip=True)

    return specs, {"success": True, "count": len(specs)}
