"""라벨 라우터"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.label import Label
from src.schemas.label import LabelCreate, LabelResponse, LabelListResponse

router = APIRouter(prefix="/api/labels", tags=["labels"])


@router.get("", response_model=LabelListResponse)
async def get_labels(db: AsyncSession = Depends(get_db)):
    """라벨 목록 조회"""
    result = await db.execute(select(Label).order_by(Label.name))
    labels = list(result.scalars().all())
    return LabelListResponse(items=labels)


@router.post("", response_model=LabelResponse, status_code=201)
async def create_label(data: LabelCreate, db: AsyncSession = Depends(get_db)):
    """라벨 생성"""
    # 중복 체크
    existing = await db.execute(select(Label).where(Label.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"이미 존재하는 라벨입니다: {data.name}",
        )

    label = Label(name=data.name, color=data.color)
    db.add(label)
    await db.commit()
    await db.refresh(label)
    return label


@router.delete("/{label_id}", status_code=204)
async def delete_label(label_id: int, db: AsyncSession = Depends(get_db)):
    """라벨 삭제"""
    result = await db.execute(select(Label).where(Label.id == label_id))
    label = result.scalar_one_or_none()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="라벨을 찾을 수 없습니다",
        )
    await db.delete(label)
    await db.commit()
