from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.rbac import require_role
from app.config import settings
from app.db.connection import db_manager

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/system-status")
def get_system_status(admin_persona: Dict[str, Any] = Depends(require_role(["admin"]))):
    """Admin-only endpoint returning granular platform diagnostics."""
    return {
        "status": "ok",
        "authorized_persona": admin_persona["title"],
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "services": db_manager.get_services_health(),
    }
