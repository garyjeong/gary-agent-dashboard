"""라우터 모듈"""
from src.routes.issues import router as issues_router
from src.routes.queue import router as queue_router
from src.routes.auth import router as auth_router
from src.routes.github import router as github_router
from src.routes.settings import router as settings_router
from src.routes.labels import router as labels_router

__all__ = ["issues_router", "queue_router", "auth_router", "github_router", "settings_router", "labels_router"]
