"""워커 설정"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """워커 설정"""
    
    # API 설정
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
    API_KEY = os.getenv("API_KEY", "")
    
    # 워커 설정
    POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "5"))  # 초
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
    
    # 에이전트 설정
    AGENT_TYPE = os.getenv("AGENT_TYPE", "claude_code")  # claude_code, cursor
    
    # 작업 디렉토리
    WORK_DIR = os.getenv("WORK_DIR", "./workspaces")


config = Config()
