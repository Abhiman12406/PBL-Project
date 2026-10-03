from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.persona import router as persona_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(persona_router)
api_router.include_router(admin_router)
