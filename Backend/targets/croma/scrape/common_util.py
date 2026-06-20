import requests
import httpx
from typing import Dict, Optional
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from shared.header_rotator import get_rotated_headers


# --- Croma API constants ---
CMS_URL = "https://api.croma.com/sanity/v1/cms"
SEARCH_URL_TEMPLATE = "https://api.croma.com/searchservices/v1/category/{category_id}"

CATEGORY_QUERY = """*[_type == "contentPage" && uid == "pwaHomePage1"][0]{
  ...,
  contentSlots{
    contentSlot[]{
      ...,
      components{
        component[]->{
          ...,
          bannerList[]->{...},
          mobileBannerList[]->{...}
        }
      }
    }
  }
}"""

def _get_retry_session(headers_func: callable) -> requests.Session:
    s = requests.Session()
    s.headers.update(headers_func())
    retries = Retry(
        total=0,
        status_forcelist=[500, 502, 503, 504],
        allowed_methods=["GET"]
    )
    adapter = HTTPAdapter(max_retries=retries)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s


def create_api_session(**kwargs) -> requests.Session:
    key = kwargs.get("azure_key")
    return _get_retry_session(lambda: get_rotated_headers(target="croma", custom_key=key))


def create_html_session(**kwargs) -> requests.Session:
    key = kwargs.get("azure_key")
    return _get_retry_session(lambda: get_rotated_headers(target="croma", custom_key=key))


def create_async_api_client(proxy: Optional[str] = None, **kwargs) -> httpx.AsyncClient:
    """Factory for httpx AsyncClient with HTTP/2 support and proxy handling."""
    key = kwargs.get("azure_key")
    headers = get_rotated_headers(target="croma", custom_key=key)
    
    proxy_url = None
    if proxy:
        proxy_url = f"http://{proxy}" if not proxy.startswith("http") else proxy
        
    use_http2 = False if proxy_url else True

    return httpx.AsyncClient(
        headers=headers,
        proxy=proxy_url,
        http2=use_http2,
        timeout=httpx.Timeout(20.0, connect=10.0),
        follow_redirects=True
    )



def build_proxy(proxy_str: Optional[str]) -> Optional[Dict[str, str]]:
    if not proxy_str:
        return None
    if not proxy_str.startswith("http"):
        proxy_str = f"http://{proxy_str}"
    return {"http": proxy_str, "https": proxy_str}
