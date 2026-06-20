import time
import json
from datetime import datetime, timezone
import asyncio
import requests
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .schemas import ProxyItem
from .routes import _parse_proxy_string

router = APIRouter(prefix="/api/proxies/ws", tags=["proxies_ws"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def library_connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

manager = ConnectionManager()

async def _test_proxy_async(item: ProxyItem, test_url: str, headers: dict, timeout: int) -> ProxyItem:
    proxy_str = f"{item.ip}:{item.port}"
    if item.username and item.password:
        proxy_str = f"{item.username}:{item.password}@{proxy_str}"
    
    proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}
    
    start = time.time()
    try:
        # Run in thread pool since requests is blocking
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(None, lambda: requests.get(
            test_url, 
            proxies=proxies, 
            timeout=timeout/1000, 
            headers=headers, 
            allow_redirects=True
        ))
        item.latency = round(time.time() - start, 3)
        item.error_code = resp.status_code
        item.status = "ACTIVE" if 200 <= resp.status_code < 400 else "DEAD"
    except Exception as e:
        item.status = "DEAD"
        item.latency = None
        if hasattr(e, 'response') and e.response:
            item.error_code = e.response.status_code
            
    item.last_checked = datetime.now(timezone.utc).isoformat()
    return item

@router.websocket("/test")
async def websocket_test_endpoint(websocket: WebSocket):
    await manager.library_connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            req_data = json.loads(data)
            
            proxies_raw = req_data.get("proxies", [])
            test_url = req_data.get("test_url", "https://www.croma.com")
            headers = req_data.get("headers", {})
            pattern = req_data.get("pattern", "IP:PORT:USER:PASS")
            timeout = req_data.get("timeout", 5000)

            # Parse all proxies
            items = [i for i in [_parse_proxy_string(p, pattern) for p in proxies_raw] if i]
            
            # Send initial state
            await manager.send_personal_message({"type": "INIT", "count": len(items)}, websocket)

            # Test them sequentially or in small batches and stream results
            for item in items:
                tested_item = await _test_proxy_async(item, test_url, headers, timeout)
                await manager.send_personal_message({
                    "type": "RESULT", 
                    "proxy": tested_item.dict()
                }, websocket)
                # Small sleep to prevent overwhelming the socket if many proxies
                await asyncio.sleep(0.01)

            await manager.send_personal_message({"type": "COMPLETE"}, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        manager.disconnect(websocket)
