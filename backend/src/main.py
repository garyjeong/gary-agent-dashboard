"""FastAPI 애플리케이션 엔트리포인트"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.database import init_db
from src.routes import issues_router, queue_router, auth_router, github_router, settings_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 로직"""
    # 시작 시: DB 테이블 생성
    await init_db()
    yield
    # 종료 시: (필요 시 정리 로직)


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
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(issues_router)
app.include_router(queue_router)
app.include_router(auth_router)
app.include_router(github_router)
app.include_router(settings_router)


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
