from fastapi import APIRouter

from app.api.v1 import auth, conversations, dashboard, evaluations, imports, media, provider, worker

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(provider.router, prefix="/provider", tags=["provider"])
api_router.include_router(imports.router, prefix="/imports", tags=["imports"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(worker.router)
