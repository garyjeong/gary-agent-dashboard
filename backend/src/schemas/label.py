"""라벨 스키마"""
import re
from typing import List
from pydantic import BaseModel, Field, field_validator


_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class LabelCreate(BaseModel):
    """라벨 생성"""
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(..., min_length=7, max_length=7)

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        if not _HEX_COLOR_RE.match(v):
            raise ValueError("color는 #RRGGBB 형식이어야 합니다")
        return v


class LabelResponse(BaseModel):
    """라벨 응답"""
    id: int
    name: str
    color: str

    class Config:
        from_attributes = True


class LabelListResponse(BaseModel):
    """라벨 목록 응답"""
    items: List[LabelResponse]
