"""설정 관련 스키마"""
from typing import Optional
from pydantic import BaseModel


class TelegramSettingsResponse(BaseModel):
    """텔레그램 설정 응답"""
    template: str
    chat_id: Optional[str]


class TelegramSettingsUpdate(BaseModel):
    """텔레그램 설정 수정"""
    template: Optional[str] = None
    chat_id: Optional[str] = None
