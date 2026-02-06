"""댓글 라우터"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.auth import require_current_user
from src.models.comment import Comment
from src.models.issue import Issue
from src.models.user import User
from src.schemas.comment import CommentCreate, CommentUpdate, CommentResponse

router = APIRouter(tags=["comments"])


@router.get("/api/issues/{issue_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
):
    """일감의 댓글 목록 조회"""
    result = await db.execute(
        select(Comment)
        .where(Comment.issue_id == issue_id)
        .order_by(Comment.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("/api/issues/{issue_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    issue_id: int,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_current_user),
):
    """댓글 생성"""
    # 일감 존재 확인
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="일감을 찾을 수 없습니다")

    comment = Comment(
        issue_id=issue_id,
        author=user.github_login,
        content=data.content,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


@router.delete("/api/issues/{issue_id}/comments/{comment_id}", status_code=204)
async def delete_comment(
    issue_id: int,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_current_user),
):
    """댓글 삭제"""
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.issue_id == issue_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    await db.delete(comment)
    await db.commit()
