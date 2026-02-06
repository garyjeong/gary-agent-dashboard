"""FastAPI 애플리케이션 엔트리포인트"""
import logging
from contextlib import asynccontextmanager
from sqlalchemy import func
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from src.config import get_settings
from src.database import init_db
from src.routes import issues_router, queue_router, auth_router, github_router, settings_router, labels_router

logger = logging.getLogger(__name__)

settings = get_settings()


DEFAULT_LABELS = [
    {"name": "bug", "color": "#EF4444"},
    {"name": "feature", "color": "#3B82F6"},
    {"name": "refactor", "color": "#EAB308"},
    {"name": "docs", "color": "#22C55E"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 로직"""
    from sqlalchemy import select
    from src.database import async_session_maker
    from src.models.label import Label

    await init_db()

    # 기본 라벨 시드
    async with async_session_maker() as session:
        result = await session.execute(select(func.count(Label.id)))
        if result.scalar_one() == 0:
            for lb in DEFAULT_LABELS:
                session.add(Label(name=lb["name"], color=lb["color"]))
            await session.commit()

    yield


app = FastAPI(
    title="Gary Agent Dashboard API",
    description="Jira형 일감 대시보드 + 에이전트 작업 큐 API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "Cookie"],
)

# 글로벌 예외 핸들러
@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Pydantic 검증 에러 → 422"""
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "code": "validation_error"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """예상치 못한 에러 → 500"""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 내부 오류가 발생했습니다", "code": "internal_error"},
    )


# 라우터 등록
app.include_router(issues_router)
app.include_router(queue_router)
app.include_router(auth_router)
app.include_router(github_router)
app.include_router(settings_router)
app.include_router(labels_router)


@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
