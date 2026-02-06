"""댓글 스키마"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    """댓글 생성"""
    content: str = Field(..., min_length=1, max_length=5000)


class CommentUpdate(BaseModel):
    """댓글 수정"""
    content: str = Field(..., min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    """댓글 응답"""
    id: int
    issue_id: int
    author: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
