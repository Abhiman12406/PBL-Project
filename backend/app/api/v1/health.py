from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.db.connection import db_manager

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health():
    services_health = db_manager.get_services_health()
    return {
        "status": "healthy",
        "services": services_health,
        "version": settings.VERSION,
        "project": settings.PROJECT_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
