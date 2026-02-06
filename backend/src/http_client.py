"""재시도 로직이 포함된 HTTP 클라이언트 유틸리티"""
import asyncio
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 20.0
DEFAULT_MAX_RETRIES = 3
DEFAULT_BACKOFF_BASE = 1.0


def create_client(timeout: float = DEFAULT_TIMEOUT) -> httpx.AsyncClient:
    """타임아웃이 설정된 httpx 클라이언트 생성"""
    return httpx.AsyncClient(
        timeout=httpx.Timeout(timeout, connect=10.0),
    )


async def request_with_retry(
    method: str,
    url: str,
    *,
    max_retries: int = DEFAULT_MAX_RETRIES,
    backoff_base: float = DEFAULT_BACKOFF_BASE,
    timeout: float = DEFAULT_TIMEOUT,
    headers: Optional[dict] = None,
    **kwargs,
) -> httpx.Response:
    """Exponential backoff 재시도 로직이 포함된 HTTP 요청

    네트워크 에러, 타임아웃, 5xx 에러에 대해 재시도합니다.
    """
    last_exception: Optional[Exception] = None

    for attempt in range(max_retries):
        try:
            async with create_client(timeout) as client:
                response = await client.request(
                    method, url, headers=headers, **kwargs
                )
                # 5xx 서버 에러인 경우 재시도
                if response.status_code >= 500 and attempt < max_retries - 1:
                    wait = backoff_base * (2 ** attempt)
                    logger.warning(
                        f"서버 에러 {response.status_code}, {wait}초 후 재시도 ({attempt + 1}/{max_retries})"
                    )
                    await asyncio.sleep(wait)
                    continue
                return response
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            last_exception = e
            if attempt < max_retries - 1:
                wait = backoff_base * (2 ** attempt)
                logger.warning(
                    f"요청 실패 ({type(e).__name__}), {wait}초 후 재시도 ({attempt + 1}/{max_retries})"
                )
                await asyncio.sleep(wait)
            else:
                logger.error(f"최대 재시도 횟수 초과: {url}")

    raise last_exception or httpx.ConnectError("요청 실패")
