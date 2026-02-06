"""백엔드 API 클라이언트"""
import httpx
from typing import Optional
from config import config


class APIClient:
    """백엔드 API 호출 클라이언트"""
    
    def __init__(self):
        self.base_url = config.API_BASE_URL
        self.headers = {
            "Content-Type": "application/json",
        }
        if config.API_KEY:
            self.headers["X-API-Key"] = config.API_KEY
    
    async def get_next_queue_item(self) -> Optional[dict]:
        """다음 처리할 큐 아이템 가져오기"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/queue/next",
                    headers=self.headers,
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data if data else None
                else:
                    print(f"[API] 큐 조회 실패: {response.status_code}")
                    return None
                    
            except Exception as e:
                print(f"[API] 연결 오류: {e}")
                return None
    
    async def get_repo_analysis(self, repo_full_name: str) -> Optional[str]:
        """리포지토리 분석 결과 가져오기"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/queue/repo-analysis/{repo_full_name}",
                    headers=self.headers,
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("analysis_result")
                else:
                    return None

            except Exception as e:
                print(f"[API] 분석 결과 조회 오류: {e}")
                return None

    async def update_queue_item(
        self,
        item_id: int,
        status: str,
        result: Optional[str] = None,
    ) -> bool:
        """큐 아이템 상태 업데이트"""
        async with httpx.AsyncClient() as client:
            try:
                payload = {"status": status}
                if result:
                    payload["result"] = result
                
                response = await client.patch(
                    f"{self.base_url}/api/queue/{item_id}",
                    headers=self.headers,
                    json=payload,
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    return True
                else:
                    print(f"[API] 상태 업데이트 실패: {response.status_code}")
                    return False
                    
            except Exception as e:
                print(f"[API] 연결 오류: {e}")
                return False
