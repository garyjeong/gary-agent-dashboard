"""애플리케이션 설정"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """환경변수 기반 설정"""
    
    # 서버
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    
    # 데이터베이스
    database_url: str = "sqlite+aiosqlite:///./data/app.db"
    
    # API 인증
    api_key: str = ""
    
    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    
    # 텔레그램
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
