"""설정 라우터"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.services.telegram_service import TelegramService, DEFAULT_TEMPLATE
from src.schemas.settings import TelegramSettingsResponse, TelegramSettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_telegram_service(db: AsyncSession = Depends(get_db)) -> TelegramService:
    return TelegramService(db)


@router.get("/telegram", response_model=TelegramSettingsResponse)
async def get_telegram_settings(
    service: TelegramService = Depends(get_telegram_service),
):
    """텔레그램 설정 조회"""
    template = await service.get_template()
    chat_id = await service.get_chat_id()
    return TelegramSettingsResponse(template=template, chat_id=chat_id)


@router.patch("/telegram", response_model=TelegramSettingsResponse)
async def update_telegram_settings(
    data: TelegramSettingsUpdate,
    service: TelegramService = Depends(get_telegram_service),
):
    """텔레그램 설정 수정"""
    if data.template is not None:
        await service.save_template(data.template)
    if data.chat_id is not None:
        await service.save_chat_id(data.chat_id)
    
    template = await service.get_template()
    chat_id = await service.get_chat_id()
    return TelegramSettingsResponse(template=template, chat_id=chat_id)


@router.post("/telegram/test")
async def test_telegram_notification(
    service: TelegramService = Depends(get_telegram_service),
):
    """텔레그램 알림 테스트"""
    template = await service.get_template()
    
    message = service.render_template(
        template=template,
        issue_title="테스트 일감",
        repo_name="owner/test-repo",
        status="완료",
        completed_at="2024-01-01 12:00:00",
        result="테스트 알림입니다.",
    )
    
    success = await service.send_message(message)
    
    return {
        "success": success,
        "message": "알림 전송 성공" if success else "알림 전송 실패 (Chat ID 또는 토큰 확인 필요)"
    }
