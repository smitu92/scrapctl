import os
import random
from typing import Dict

# A curated list of modern, realistic browser fingerprints
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
]

def get_rotated_headers(target: str = "croma", custom_key: str = None) -> Dict[str, str]:
    """
    Returns a dictionary of headers with a randomized User-Agent.
    Tailors additional headers based on the target site.
    """
    ua = random.choice(USER_AGENTS)
    
    headers = {
        "User-Agent": ua,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
    }
    
    if target == "croma":
        headers.update({
            "Ocp-Apim-Subscription-Key": custom_key or os.getenv("AZURE_KEY", ""),
            "Origin": "https://www.croma.com",
            "Referer": "https://www.croma.com/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "sec-ch-ua-mobile": "?0",
        })
        if "Windows" in ua:
            headers["sec-ch-ua-platform"] = '"Windows"'
        elif "Macintosh" in ua:
            headers["sec-ch-ua-platform"] = '"macOS"'
        else:
            headers["sec-ch-ua-platform"] = '"Linux"'
        
    return headers
