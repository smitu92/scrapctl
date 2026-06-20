import os
import time
import requests
import re
import socket
from urllib.parse import urlparse
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from collections import deque
from .schemas import ProxyItem, ProxyTestRequest, ProxyTestResponse, DefaultPoolStatus
from sqlmodel import Session, select
from shared.database import engine
from shared.models import Proxy
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from functools import partial

router = APIRouter(prefix="/api/proxies", tags=["proxies"])

PROXY_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "tools", "data", "proxies.txt")

_ui_queue: deque = None
_rotator = None
_global_defaults: list = []


def init_router(ui_queue: deque, rotator=None) -> None:
    global _ui_queue, _rotator
    _ui_queue = ui_queue
    _rotator = rotator


def load_defaults_on_boot():
    """Called once at server startup. Loads default proxies from DB into memory."""
    global _global_defaults

    with Session(engine) as session:
        defaults_in_db = session.exec(select(Proxy).where(Proxy.is_default == True)).all()

        # Seed from file if DB is empty
        if not defaults_in_db and os.path.exists(PROXY_FILE_PATH):
            print("[Proxies] Seeding default proxies from file to DB...")
            with open(PROXY_FILE_PATH, "r") as f:
                lines = f.read().splitlines()
            for line in lines:
                item = _parse_proxy_string(line)
                if item and item.status != "INVALID":
                    p = Proxy(
                        ip=item.ip,
                        port=item.port,
                        username=item.username,
                        password=item.password,
                        status="ACTIVE",
                        is_default=True
                    )
                    session.add(p)
            session.commit()
            defaults_in_db = session.exec(select(Proxy).where(Proxy.is_default == True)).all()

        _global_defaults = [
            {
                "ip": p.ip,
                "port": p.port,
                "username": p.username,
                "password": p.password,
                "status": p.status,
            }
            for p in defaults_in_db
        ]
        print(f"[Proxies] Loaded {len(_global_defaults)} default proxies into global memory.")


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _is_ip(s: str) -> bool:
    return bool(re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", s))


def _is_safe_url(url: str) -> bool:
    """Helper to validate if a URL is safe to query, blocking loopback and private networks (SSRF prevention)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname
        if not host:
            return False
        
        # Resolve IP address to prevent DNS bypasses
        ip = socket.gethostbyname(host)
        
        # Block localhost / loopback
        if ip == "localhost" or ip.startswith("127."):
            return False
        # Block link-local (cloud metadata)
        if ip.startswith("169.254."):
            return False
        # Block private IP ranges
        if ip.startswith("10.") or ip.startswith("192.168."):
            return False
        if ip.startswith("172."):
            parts = [int(p) for p in ip.split(".")]
            if len(parts) == 4 and 16 <= parts[1] <= 31:
                return False
        return True
    except Exception:
        return False


def _parse_proxy_string(p: str, preferred_pattern: str = None) -> ProxyItem:
    p = p.strip()
    if not p:
        return None
    try:
        item = None
        if "@" in p:
            auth, addr = p.split("@")
            user, pw = auth.split(":")
            ip, port = addr.split(":")
            item = ProxyItem(username=user, password=pw, ip=ip, port=port)
        else:
            parts = p.split(":")
            if len(parts) == 4:
                # IPs and domains usually have dots in the first segment
                if "." in parts[0] or (preferred_pattern and "IP:PORT:USER:PASS" in preferred_pattern):
                    item = ProxyItem(ip=parts[0], port=parts[1], username=parts[2], password=parts[3])
                else:
                    item = ProxyItem(username=parts[0], password=parts[1], ip=parts[2], port=parts[3])
            elif len(parts) == 2:
                item = ProxyItem(ip=parts[0], port=parts[1])
            else:
                item = ProxyItem(ip=p, port="80")

        if item:
            item.raw_string = p
        return item
    except Exception:
        return ProxyItem(ip=p, port="80", status="INVALID", raw_string=p)



def _test_single_proxy(
    item: ProxyItem,
    test_url: str,
    timeout_ms: int = 5000,
    azure_key: str = None,
    custom_headers: dict = None
) -> ProxyItem:
    if item.status == "INVALID":
        return item

    proxy_str = f"{item.ip}:{item.port}"
    if item.username and item.password:
        proxy_str = f"{item.username}:{item.password}@{proxy_str}"

    proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}

    headers = {
        "User-Agent": "python-requests/2.31.0"
    }

    if custom_headers:
        headers.update(custom_headers)

    start = time.time()
    try:
        resp = requests.get(test_url, proxies=proxies, timeout=timeout_ms / 1000, headers=headers, allow_redirects=True)
        item.latency = round(time.time() - start, 3)
        item.error_code = resp.status_code
        item.status = "ACTIVE" if 200 <= resp.status_code < 400 else "DEAD"
    except Exception as e:
        item.status = "DEAD"
        item.latency = None
        item.error_code = getattr(getattr(e, "response", None), "status_code", 999)

    item.last_checked = datetime.now(timezone.utc).isoformat()

    # Push real-time update to UI
    if _ui_queue is not None:
        _ui_queue.append({"type": "PROXY_UPDATE", "data": item.dict()})

    return item


# ─── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=DefaultPoolStatus)
async def get_default_pool():
    """Returns only the Default Pool summary. User proxies live in browser localStorage."""
    global _global_defaults

    # Fallback: reload from DB if somehow empty
    if not _global_defaults:
        with Session(engine) as session:
            defaults_in_db = session.exec(select(Proxy).where(Proxy.is_default == True)).all()
            _global_defaults = [
                {"ip": p.ip, "port": p.port, "username": p.username, "password": p.password, "status": p.status}
                for p in defaults_in_db
            ]

    active = len([p for p in _global_defaults if p["status"] == "ACTIVE"])
    total = len(_global_defaults)

    return DefaultPoolStatus(
        active=active,
        total=total,
        last_tested=None
    )


@router.post("/test-defaults", response_model=DefaultPoolStatus)
async def test_defaults():
    """Tests all default proxies from memory. Returns active/total count. Does NOT save to DB."""
    global _global_defaults

    if not _global_defaults:
        raise HTTPException(status_code=404, detail="No default proxies loaded")

    test_url = "https://www.croma.com"
    timeout_ms = 5000

    # Convert to ProxyItem list for testing
    items = [
        ProxyItem(ip=p["ip"], port=p["port"], username=p["username"], password=p["password"])
        for p in _global_defaults
    ]

    if _ui_queue is not None:
        _ui_queue.append({"type": "DEFAULT_POOL_TEST_START", "data": {"count": len(items)}})

    test_fn = partial(_test_single_proxy, test_url=test_url, timeout_ms=timeout_ms)

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(test_fn, items))

    # Update in-memory status (NOT DB)
    for result in results:
        for cached in _global_defaults:
            if cached["ip"] == result.ip and cached["port"] == result.port:
                cached["status"] = result.status

    active = len([r for r in results if r.status == "ACTIVE"])
    total = len(results)

    if _ui_queue is not None:
        _ui_queue.append({
            "type": "DEFAULT_POOL_TEST_COMPLETE",
            "data": {"active": active, "total": total}
        })

    return DefaultPoolStatus(active=active, total=total, last_tested=datetime.now(timezone.utc).isoformat())


@router.post("/test", response_model=ProxyTestResponse)
async def test_proxies(req: ProxyTestRequest):
    """Tests user-provided proxies. Sends real-time updates via WebSocket."""
    # SSRF Validation: Ensure target URL is safe and public
    if not _is_safe_url(req.test_url):
        raise HTTPException(status_code=400, detail="Access denied: Invalid or unsafe test URL.")

    test_items = []
    for p in req.proxies:
        item = _parse_proxy_string(p, req.pattern)
        if item and item.status != "INVALID":
            test_items.append(item)

    if not test_items:
        raise HTTPException(status_code=400, detail="No valid proxies to test")

    test_fn = partial(
        _test_single_proxy,
        test_url=req.test_url,
        timeout_ms=req.timeout_ms or 5000,
        azure_key=req.azure_key,
        custom_headers=req.headers
    )

    if _ui_queue is not None:
        _ui_queue.append({
            "type": "PROXY_TEST_START",
            "data": {"count": len(test_items), "target": req.test_url}
        })

    with ThreadPoolExecutor(max_workers=20) as executor:
        results = list(executor.map(test_fn, test_items))

    if _ui_queue is not None:
        _ui_queue.append({
            "type": "PROXY_TEST_COMPLETE",
            "data": {"count": len(results)}
        })

    return ProxyTestResponse(results=results)


@router.get("/default-proxies-for-scraping")
async def get_defaults_for_scraping():
    """Called by scraping engine to get the actual default proxy strings."""
    return get_defaults_for_scraping_in_memory()


def get_defaults_for_scraping_in_memory() -> list:
    """Helper to get default proxies directly from memory."""
    global _global_defaults
    return [
        f"{p['username']}:{p['password']}@{p['ip']}:{p['port']}"
        if p.get("username") else f"{p['ip']}:{p['port']}"
        for p in _global_defaults
        if p.get("status") == "ACTIVE" or p.get("status") is None
    ]

