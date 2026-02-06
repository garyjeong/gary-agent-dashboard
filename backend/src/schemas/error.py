"""공통 에러 응답 스키마"""
from typing import Optional
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """API 에러 응답"""
    detail: str
    code: Optional[str] = None
