from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import get_settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Build allowed origins list
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

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

app.include_router(api_router)


@app.get("/health/live")
def liveness() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def readiness() -> dict[str, str]:
    return {"status": "ready"}
