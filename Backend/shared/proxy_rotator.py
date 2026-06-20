import threading
from typing import List, Optional


class ProxyRotator:
    """Generic thread-safe proxy rotator. Target-agnostic."""

    def __init__(self, proxies: List[str]) -> None:
        self.proxies = proxies
        self.index = 0
        self.lock = threading.Lock()

    def get_proxy(self) -> Optional[str]:
        if not self.proxies:
            return None
        with self.lock:
            proxy = self.proxies[self.index]
            self.index = (self.index + 1) % len(self.proxies)
            return proxy

    def update_proxies(self, proxies: List[str]) -> None:
        with self.lock:
            self.proxies = proxies
            self.index = 0
            print(f"[ProxyRotator] Updated with {len(proxies)} proxies.")
