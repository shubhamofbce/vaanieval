import logging
import os
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager

from app.api.v1.api import api_router
from app.core.config import get_settings
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)

allowed_origins = settings.cors_allowed_origins

# Add Vercel domains in production
if os.getenv("VERCEL_ENV") == "production" or os.getenv("VERCEL_URL"):
    vercel_url = os.getenv("VERCEL_URL", "")
    if vercel_url:
        allowed_origins.append(f"https://{vercel_url}")
    # Also allow all Vercel preview deployments
    allowed_origins.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def prevent_search_indexing(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    response = await call_next(request)
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


app.include_router(api_router)


@app.get("/health/live")
def liveness() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def readiness() -> dict[str, str]:
    return {"status": "ready"}
