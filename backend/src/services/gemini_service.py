"""Gemini API를 이용한 리포지토리 분석 서비스"""
import base64
import logging
from typing import Optional
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.http_client import request_with_retry
from src.services.github_service import GitHubAPIService
from src.models.connected_repo import ConnectedRepo

logger = logging.getLogger(__name__)
settings = get_settings()

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta"
    "/models/gemini-2.0-flash:generateContent"
)

# 분석 대상 주요 파일
KEY_FILES = [
    "README.md", "README.rst", "readme.md",
    "package.json", "requirements.txt", "pyproject.toml",
    "go.mod", "Cargo.toml", "pom.xml", "build.gradle",
    "tsconfig.json", "docker-compose.yml", "docker-compose.yaml",
    "Dockerfile", "Makefile", "setup.py", "setup.cfg",
]

# 주요 진입점 패턴
ENTRY_PATTERNS = [
    "main.py", "app.py", "index.ts", "index.js",
    "main.go", "main.rs", "Main.java",
    "src/main.py", "src/app.py", "src/index.ts", "src/index.js",
    "src/main.go", "src/main.rs",
    "cmd/main.go", "app/main.py",
]

MAX_CONTENT_BYTES = 100 * 1024  # 100KB


class GeminiAnalysisService:
    """리포지토리 분석 서비스 (Gemini API)"""

    def __init__(self, github_service: GitHubAPIService):
        self.github = github_service

    async def analyze_repo(self, repo_id: int, db: AsyncSession) -> None:
        """리포지토리를 분석하고 결과를 DB에 저장"""
        result = await db.execute(
            select(ConnectedRepo).where(ConnectedRepo.id == repo_id)
        )
        repo = result.scalar_one_or_none()
        if not repo:
            logger.error("ConnectedRepo not found: id=%d", repo_id)
            return

        repo.analysis_status = "analyzing"
        repo.analysis_error = None
        await db.commit()

        try:
            owner, repo_name = repo.full_name.split("/", 1)

            # 트리 조회
            tree_data = await self.github.get_repo_tree(
                owner, repo_name, repo.default_branch
            )
            file_paths = [
                item["path"]
                for item in tree_data.get("tree", [])
                if item.get("type") == "blob"
            ]

            # 주요 파일 내용 가져오기
            files_content = await self._fetch_key_files(owner, repo_name, file_paths)

            # 프롬프트 생성 + Gemini 호출
            prompt = self._build_prompt(
                repo.full_name, repo.description, file_paths, files_content
            )
            analysis = await self._call_gemini(prompt)

            # 결과 저장
            repo.analysis_status = "completed"
            repo.analysis_result = analysis
            repo.analysis_error = None
            repo.analyzed_at = datetime.utcnow()
            await db.commit()

            logger.info("분석 완료: %s (id=%d)", repo.full_name, repo_id)

        except Exception as e:
            logger.exception("분석 실패: %s (id=%d)", repo.full_name, repo_id)
            repo.analysis_status = "failed"
            repo.analysis_error = str(e)[:2000]
            repo.analyzed_at = datetime.utcnow()
            await db.commit()

    async def _fetch_key_files(
        self, owner: str, repo: str, all_paths: list[str]
    ) -> dict[str, str]:
        """주요 파일들의 내용 가져오기 (100KB 제한)"""
        path_set = set(all_paths)
        files_to_fetch: list[str] = []

        for kf in KEY_FILES:
            if kf in path_set:
                files_to_fetch.append(kf)
        for ep in ENTRY_PATTERNS:
            if ep in path_set and ep not in files_to_fetch:
                files_to_fetch.append(ep)

        result: dict[str, str] = {}
        total_bytes = 0

        for file_path in files_to_fetch:
            if total_bytes >= MAX_CONTENT_BYTES:
                break
            try:
                content = await self._get_file_content(owner, repo, file_path)
                if content:
                    content_bytes = len(content.encode("utf-8"))
                    if total_bytes + content_bytes <= MAX_CONTENT_BYTES:
                        result[file_path] = content
                        total_bytes += content_bytes
            except Exception as e:
                logger.warning("파일 조회 실패: %s — %s", file_path, e)

        return result

    async def _get_file_content(
        self, owner: str, repo: str, path: str
    ) -> Optional[str]:
        """GitHub Contents API로 파일 내용 조회 (base64 디코딩)"""
        url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        response = await request_with_retry(
            "GET", url, headers=self.github.headers
        )
        if response.status_code != 200:
            return None
        data = response.json()
        if data.get("encoding") == "base64" and data.get("content"):
            return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return None

    def _build_prompt(
        self,
        full_name: str,
        description: Optional[str],
        file_paths: list[str],
        files_content: dict[str, str],
    ) -> str:
        """Gemini 분석 프롬프트 생성"""
        tree_lines = file_paths[:500]
        tree_text = "\n".join(tree_lines)
        if len(file_paths) > 500:
            tree_text += f"\n... and {len(file_paths) - 500} more files"

        files_section = ""
        for path, content in files_content.items():
            truncated = content[:10240]
            if len(content) > 10240:
                truncated += "\n... (truncated)"
            files_section += f"\n### {path}\n```\n{truncated}\n```\n"

        return f"""You are a senior software engineer. Analyze the following GitHub repository and provide a comprehensive project analysis.

Repository: {full_name}
{f'Description: {description}' if description else ''}

## File Tree
```
{tree_text}
```

## Key File Contents
{files_section}

## Required Analysis (respond in Korean)

Please provide the analysis in the following structured format:

### 1. 프로젝트 개요
What is this project? What problem does it solve? (2-3 sentences)

### 2. 기술 스택
- Languages, frameworks, libraries, databases, infrastructure tools

### 3. 아키텍처
- High-level architecture pattern (monolith, microservices, MVC, etc.)
- Key modules and how they interact

### 4. 주요 디렉토리 구조
- What each top-level directory contains and its purpose

### 5. 코딩 패턴 및 규칙
- Naming conventions, code style, testing patterns
- How configuration is managed
- Error handling patterns

### 6. 주요 진입점
- Main entry point files and how the application starts
- Key configuration files

### 7. 개발 워크플로우
- How to build, test, and run the project
- Dependencies and setup instructions

Keep the analysis concise but comprehensive. Focus on information that would help a developer quickly understand the codebase and start contributing.
"""

    async def _call_gemini(self, prompt: str) -> str:
        """Gemini API 호출"""
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다")

        url = f"{GEMINI_API_URL}?key={settings.gemini_api_key}"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
        }

        response = await request_with_retry(
            "POST",
            url,
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=60.0,
            max_retries=2,
        )

        if response.status_code != 200:
            error_detail = response.text[:500]
            raise RuntimeError(
                f"Gemini API 오류 ({response.status_code}): {error_detail}"
            )

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini 응답에 candidates가 없습니다")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise RuntimeError("Gemini 응답에 parts가 없습니다")

        return parts[0].get("text", "")
