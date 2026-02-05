#!/usr/bin/env python3
"""
Gary Agent Dashboard - 로컬 워커

백엔드의 작업 큐를 폴링하여 에이전트(Claude Code/Cursor)로 작업을 처리합니다.

사용법:
    python main.py

환경변수:
    API_BASE_URL: 백엔드 API URL (기본: http://localhost:8000)
    POLL_INTERVAL: 폴링 간격 (초, 기본: 5)
    AGENT_TYPE: 에이전트 타입 (claude_code 또는 cursor, 기본: claude_code)
    WORK_DIR: 작업 디렉토리 (기본: ./workspaces)
"""

import asyncio
import signal
import sys
from datetime import datetime

from config import config
from api_client import APIClient
from agent import AgentRunner


class Worker:
    """큐 폴링 워커"""
    
    def __init__(self):
        self.api = APIClient()
        self.agent = AgentRunner()
        self.running = False
    
    async def start(self):
        """워커 시작"""
        self.running = True
        
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║           Gary Agent Dashboard - 로컬 워커                    ║
╠══════════════════════════════════════════════════════════════╣
║  API URL      : {config.API_BASE_URL:<43} ║
║  폴링 간격    : {config.POLL_INTERVAL}초{' '*40} ║
║  에이전트     : {config.AGENT_TYPE:<43} ║
║  작업 디렉토리: {config.WORK_DIR:<43} ║
╚══════════════════════════════════════════════════════════════╝
        """)
        
        print(f"[{self._now()}] 워커 시작. Ctrl+C로 종료합니다.\n")
        
        while self.running:
            await self._poll_and_process()
            await asyncio.sleep(config.POLL_INTERVAL)
    
    def stop(self):
        """워커 종료"""
        print(f"\n[{self._now()}] 워커 종료 중...")
        self.running = False
    
    async def _poll_and_process(self):
        """큐 폴링 및 처리"""
        # 다음 작업 가져오기
        queue_item = await self.api.get_next_queue_item()
        
        if not queue_item:
            print(f"[{self._now()}] 대기 중인 작업 없음. {config.POLL_INTERVAL}초 후 재시도...")
            return
        
        item_id = queue_item.get("id")
        issue = queue_item.get("issue", {})
        issue_title = issue.get("title", "제목 없음")
        
        print(f"[{self._now()}] 작업 수신: #{item_id} - {issue_title}")
        
        try:
            # 에이전트 실행
            success, result = await self.agent.run(queue_item)
            
            # 결과 업데이트
            status = "completed" if success else "failed"
            await self.api.update_queue_item(item_id, status, result)
            
            if success:
                print(f"[{self._now()}] ✅ 작업 완료: #{item_id}")
            else:
                print(f"[{self._now()}] ❌ 작업 실패: #{item_id}")
                print(f"  - 사유: {result[:200]}...")
                
        except Exception as e:
            error_msg = f"워커 오류: {str(e)}"
            print(f"[{self._now()}] ❌ 오류 발생: {error_msg}")
            await self.api.update_queue_item(item_id, "failed", error_msg)
    
    def _now(self) -> str:
        """현재 시각 문자열"""
        return datetime.now().strftime("%H:%M:%S")


async def main():
    """메인 함수"""
    worker = Worker()
    
    # 시그널 핸들러 설정
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        worker.stop()
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)
    
    try:
        await worker.start()
    except KeyboardInterrupt:
        worker.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n워커가 종료되었습니다.")
        sys.exit(0)
