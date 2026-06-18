from fastapi import APIRouter
from app.api.endpoints import auth, conversation, dashboard, email, speech, health, translate

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(conversation.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(email.router, prefix="/emails", tags=["emails"])
api_router.include_router(speech.router, prefix="/speech", tags=["speech"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(translate.router, prefix="/translate", tags=["translate"])

