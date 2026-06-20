import asyncio
from collections import deque
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])

_ui_queue: deque = None
# session_id -> set of active WebSockets
_active_connections: dict[str, set[WebSocket]] = {}
# For connections without a specific session (like Proxy Dashboard)
_global_connections: set[WebSocket] = set()


def init_router(ui_queue: deque) -> None:
    global _ui_queue
    _ui_queue = ui_queue


async def start_queue_processor():
    """
    Background task that reads from the global queue and broadcasts.
    """
    print("[WebSocket] Queue processor started.")
    while True:
        if _ui_queue and len(_ui_queue) > 0:
            msg = _ui_queue.popleft()
            session_id = msg.get("session_id")
            
            # 1. Broadcast to specific session
            if session_id and session_id in _active_connections:
                dead_sockets = []
                # Use list copy to avoid "Set changed size during iteration"
                for ws in list(_active_connections[session_id]):
                    try:
                        await ws.send_json(msg)
                    except Exception:
                        dead_sockets.append(ws)
                for ws in dead_sockets:
                    try:
                        _active_connections[session_id].remove(ws)
                    except KeyError:
                        pass
            
            # 2. Also broadcast to global listeners (like Proxy Dashboard)
            dead_globals = []
            # Use list copy to avoid "Set changed size during iteration"
            for ws in list(_global_connections):
                try:
                    await ws.send_json(msg)
                except Exception:
                    dead_globals.append(ws)
            for ws in dead_globals:
                try:
                    _global_connections.remove(ws)
                except KeyError:
                    pass
                
        else:
            await asyncio.sleep(0.05)


# Support BOTH with and without session_id
@router.websocket("/ws/dashboard")
@router.websocket("/ws/dashboard/{session_id}")
async def websocket_dashboard(websocket: WebSocket, session_id: Optional[str] = None):
    await websocket.accept()
    
    if session_id:
        if session_id not in _active_connections:
            _active_connections[session_id] = set()
        _active_connections[session_id].add(websocket)
        print(f"[WebSocket] Client connected to session: {session_id}")
    else:
        _global_connections.add(websocket)
        print("[WebSocket] Client connected to GLOBAL logs")
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        print(f"[WebSocket] Client disconnected. Session: {session_id}")
    finally:
        if session_id and session_id in _active_connections:
            _active_connections[session_id].remove(websocket)
        elif websocket in _global_connections:
            _global_connections.remove(websocket)
