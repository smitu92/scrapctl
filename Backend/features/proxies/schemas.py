from pydantic import BaseModel
from typing import List, Optional


class ProxyItem(BaseModel):
    ip: str
    port: str
    username: Optional[str] = None
    password: Optional[str] = None
    protocol: str = "HTTP"
    status: str = "PENDING"
    latency: Optional[float] = None
    last_checked: Optional[str] = None
    raw_string: Optional[str] = None
    error_code: Optional[int] = None


class ProxyTestRequest(BaseModel):
    proxies: List[str]
    pattern: str = "USER:PASS:IP:PORT"
    test_url: str = "https://www.croma.com"
    timeout_ms: Optional[int] = 5000
    azure_key: Optional[str] = None
    headers: Optional[dict] = None


class ProxyTestResponse(BaseModel):
    results: List[ProxyItem]


class DefaultPoolStatus(BaseModel):
    active: int
    total: int
    last_tested: Optional[str] = None
