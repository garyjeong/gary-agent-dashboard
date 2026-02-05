"""텔레그램 알림 서비스"""
from typing import Optional
import logging
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.setting import Setting
from src.models.queue_item import QueueItem

logger = logging.getLogger(__name__)
settings = get_settings()

TELEGRAM_API_URL = "https://api.telegram.org"

# 기본 템플릿
DEFAULT_TEMPLATE = """🎉 *작업 완료 알림*

📋 *일감*: {{issue_title}}
📁 *리포*: {{repo_name}}
✅ *상태*: {{status}}
⏰ *완료 시각*: {{completed_at}}

📝 *결과*:
{{result}}
"""


class TelegramService:
    """텔레그램 알림 서비스"""

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self.bot_token = settings.telegram_bot_token
        self.default_chat_id = settings.telegram_chat_id

    async def send_message(
        self,
        text: str,
        chat_id: Optional[str] = None,
        parse_mode: str = "Markdown",
    ) -> bool:
        """텔레그램 메시지 전송"""
        if not self.bot_token:
            logger.warning("텔레그램 봇 토큰이 설정되지 않았습니다")
            return False

        target_chat_id = chat_id or self.default_chat_id
        if not target_chat_id:
            logger.warning("채팅 ID가 설정되지 않았습니다")
            return False

        url = f"{TELEGRAM_API_URL}/bot{self.bot_token}/sendMessage"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={
                        "chat_id": target_chat_id,
                        "text": text,
                        "parse_mode": parse_mode,
                    },
                )

                if response.status_code == 200:
                    return True
                else:
                    logger.error(f"텔레그램 전송 실패: {response.status_code}")
                    return False
        except Exception as e:
            logger.error(f"텔레그램 전송 에러: {e}")
            return False

    async def get_template(self) -> str:
        """저장된 템플릿 조회"""
        if not self.db:
            return DEFAULT_TEMPLATE

        result = await self.db.execute(
            select(Setting).where(Setting.key == "telegram_template")
        )
        setting = result.scalar_one_or_none()

        return setting.value if setting and setting.value else DEFAULT_TEMPLATE

    async def save_template(self, template: str) -> None:
        """템플릿 저장"""
        if not self.db:
            return

        result = await self.db.execute(
            select(Setting).where(Setting.key == "telegram_template")
        )
        setting = result.scalar_one_or_none()

        if setting:
            setting.value = template
        else:
            setting = Setting(key="telegram_template", value=template)
            self.db.add(setting)

        await self.db.commit()

    async def get_chat_id(self) -> str:
        """저장된 채팅 ID 조회"""
        if not self.db:
            return self.default_chat_id

        result = await self.db.execute(
            select(Setting).where(Setting.key == "telegram_chat_id")
        )
        setting = result.scalar_one_or_none()

        return setting.value if setting and setting.value else self.default_chat_id

    async def save_chat_id(self, chat_id: str) -> None:
        """채팅 ID 저장"""
        if not self.db:
            return

        result = await self.db.execute(
            select(Setting).where(Setting.key == "telegram_chat_id")
        )
        setting = result.scalar_one_or_none()

        if setting:
            setting.value = chat_id
        else:
            setting = Setting(key="telegram_chat_id", value=chat_id)
            self.db.add(setting)

        await self.db.commit()

    def render_template(
        self,
        template: str,
        issue_title: str,
        repo_name: Optional[str],
        status: str,
        completed_at: str,
        result: Optional[str],
    ) -> str:
        """템플릿 렌더링"""
        text = template
        text = text.replace("{{issue_title}}", issue_title or "제목 없음")
        text = text.replace("{{repo_name}}", repo_name or "미지정")
        text = text.replace("{{status}}", status)
        text = text.replace("{{completed_at}}", completed_at)
        text = text.replace("{{result}}", result or "결과 없음")
        return text

    async def send_completion_notification(self, queue_item: QueueItem) -> bool:
        """작업 완료 알림 전송"""
        template = await self.get_template()
        chat_id = await self.get_chat_id()

        issue = queue_item.issue
        completed_at = queue_item.completed_at.strftime("%Y-%m-%d %H:%M:%S") if queue_item.completed_at else "알 수 없음"

        status_text = "완료" if queue_item.status.value == "completed" else "실패"

        message = self.render_template(
            template=template,
            issue_title=issue.title if issue else "알 수 없음",
            repo_name=issue.repo_full_name if issue else None,
            status=status_text,
            completed_at=completed_at,
            result=queue_item.result,
        )

        return await self.send_message(message, chat_id)
