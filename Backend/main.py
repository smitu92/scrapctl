"""
ScrapCTL v2.0 — Backend Entry Point
Run with: uvicorn main:app --port 4322 --reload
"""
from collections import deque
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from features.task_execution.routes import router as task_router, init_router as init_task_router
from features.websocket.routes import router as ws_router, init_router as init_ws_router
from features.projects.routes import router as projects_router
from features.proxies.routes import router as proxies_router, init_router as init_proxies_router
from features.feedback.routes import router as feedback_router
from shared.database import create_db_and_tables


# ── Shared state ──────────────────────────────────────────────────────────────
ui_queue: deque = deque()

# ── Proxy rotator bootstrap ───────────────────────────────────────────────────
rotator = None
try:
    from tools  import cleanproxies_Util
    from shared.proxy_rotator import ProxyRotator
    proxies = cleanproxies_Util.clean()
    rotator = ProxyRotator(proxies)
    print(f"[Boot] Proxy rotator loaded with {len(proxies)} proxies.")
except Exception as e:
    print(f"[Boot][WARN] Proxy loading failed — running without proxies. Reason: {e}")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="ScrapCTL v2.0", version="2.0.0")

@app.on_event("startup")
async def on_startup():
    create_db_and_tables()
    print("[Boot] Database tables created/verified.")
    
    from features.proxies.routes import load_defaults_on_boot
    load_defaults_on_boot()
    
    # Start WebSocket queue processor
    import asyncio
    from features.websocket.routes import start_queue_processor
    asyncio.create_task(start_queue_processor())

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers with shared dependencies ─────────────────────────────────
init_task_router(ui_queue, rotator)
init_ws_router(ui_queue)
init_proxies_router(ui_queue, rotator)

app.include_router(task_router)
app.include_router(ws_router)
app.include_router(projects_router)
app.include_router(proxies_router)
app.include_router(feedback_router)


@app.get("/")
async def root():
    return {"service": "ScrapCTL v2.0", "status": "online"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=4321, reload=True)
