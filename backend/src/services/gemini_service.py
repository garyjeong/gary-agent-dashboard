"""Gemini API를 이용한 리포지토리 분석 서비스"""
import base64
import json
import logging
import re
from typing import Optional
from datetime import datetime

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.http_client import request_with_retry
from src.services.github_service import GitHubAPIService
from src.models.connected_repo import ConnectedRepo
from src.models.deep_analysis_suggestion import (
    DeepAnalysisSuggestion,
    SuggestionCategory,
    SuggestionSeverity,
)
from src.models.issue import Issue, IssueStatus, IssuePriority
from src.models.label import Label, issue_labels

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

# ── Phase 2 심층 분석 상수 ─────────────────────────────────
SKIP_DIRS = {
    "node_modules", ".git", "venv", "__pycache__", ".next",
    "dist", "build", ".tox", "coverage", ".mypy_cache",
    "vendor", "target", ".venv", "env", ".env",
}

DEEP_ANALYSIS_EXTENSIONS = {
    "python": {".py"},
    "typescript": {".ts", ".tsx"},
    "javascript": {".js", ".jsx"},
    "go": {".go"},
    "rust": {".rs"},
    "java": {".java"},
    "kotlin": {".kt"},
    "swift": {".swift"},
    "ruby": {".rb"},
    "php": {".php"},
}

MAX_DEEP_CONTENT_BYTES = 300 * 1024  # 300KB
MAX_FILES_TO_ANALYZE = 30
MAX_DEEP_FILE_SIZE = 8192  # 파일당 8KB


class GeminiAnalysisService:
    """리포지토리 분석 서비스 (Gemini API)"""

    def __init__(self, github_service: GitHubAPIService):
        self.github = github_service

    async def analyze_repo(
        self, repo_id: int, db: AsyncSession, auto_deep_analysis: bool = True
    ) -> None:
        """Phase 1: 리포지토리를 분석하고 결과를 DB에 저장"""
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

            logger.info("Phase 1 분석 완료: %s (id=%d)", repo.full_name, repo_id)

            # Phase 2 자동 체이닝
            if auto_deep_analysis:
                await self.analyze_repo_deep(repo_id, db)

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

    # ── Phase 2: 심층 분석 ──────────────────────────────────

    async def analyze_repo_deep(self, repo_id: int, db: AsyncSession) -> None:
        """Phase 2: 소스 코드 심층 분석 + 개선 제안 생성"""
        result = await db.execute(
            select(ConnectedRepo).where(ConnectedRepo.id == repo_id)
        )
        repo = result.scalar_one_or_none()
        if not repo:
            logger.error("ConnectedRepo not found: id=%d", repo_id)
            return

        repo.deep_analysis_status = "analyzing"
        repo.deep_analysis_error = None
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

            # 핵심 소스 파일 선택
            selected_files = self._select_deep_analysis_files(
                file_paths, repo.language
            )

            if not selected_files:
                repo.deep_analysis_status = "completed"
                repo.deep_analysis_result = "분석할 소스 코드 파일이 없습니다."
                repo.deep_analyzed_at = datetime.utcnow()
                await db.commit()
                return

            # 파일 내용 수집
            files_content = await self._fetch_deep_files(
                owner, repo_name, selected_files
            )

            # 프롬프트 생성 + Gemini 호출
            prompt = self._build_deep_prompt(
                repo.full_name, repo.description,
                repo.analysis_result, files_content,
            )
            raw_response = await self._call_gemini(prompt)

            # 응답 파싱
            suggestions_data, markdown_report = self._parse_deep_response(
                raw_response
            )

            # 기존 제안 삭제
            await db.execute(
                delete(DeepAnalysisSuggestion).where(
                    DeepAnalysisSuggestion.connected_repo_id == repo_id
                )
            )

            # 새 제안 저장
            new_suggestions = []
            for s in suggestions_data:
                suggestion = DeepAnalysisSuggestion(
                    connected_repo_id=repo_id,
                    category=SuggestionCategory(s["category"]),
                    severity=SuggestionSeverity(s["severity"]),
                    title=s["title"][:255],
                    description=s["description"],
                    affected_files=json.dumps(
                        s.get("affected_files", []), ensure_ascii=False
                    ),
                    suggested_fix=s.get("suggested_fix"),
                )
                db.add(suggestion)
                new_suggestions.append((suggestion, s))
            await db.flush()

            # 제안 → Issue 자동 생성
            severity_priority_map = {
                "critical": IssuePriority.HIGH,
                "high": IssuePriority.HIGH,
                "medium": IssuePriority.MEDIUM,
                "low": IssuePriority.LOW,
            }
            category_labels = {
                "code_quality": "코드 품질",
                "security": "보안",
                "performance": "성능",
                "architecture": "아키텍처",
                "testing": "테스트",
                "documentation": "문서화",
            }

            issue_count = 0
            for suggestion, s_data in new_suggestions:
                cat_label = category_labels.get(s_data["category"], s_data["category"])
                desc_parts = [
                    f"## 카테고리: {cat_label}",
                    f"**심각도:** {s_data['severity']}",
                    "",
                    s_data["description"],
                ]
                affected = s_data.get("affected_files", [])
                if affected:
                    desc_parts.append("")
                    desc_parts.append("### 영향 파일")
                    for f in affected:
                        desc_parts.append(f"- `{f}`")
                if s_data.get("suggested_fix"):
                    desc_parts.append("")
                    desc_parts.append("### 수정 제안")
                    desc_parts.append(s_data["suggested_fix"])
                desc_parts.append("")
                desc_parts.append("---")
                desc_parts.append("*AI 심층 분석에 의해 자동 생성된 이슈입니다.*")

                new_issue = Issue(
                    title=s_data["title"][:255],
                    description="\n".join(desc_parts),
                    status=IssueStatus.TODO,
                    priority=severity_priority_map.get(
                        s_data["severity"], IssuePriority.MEDIUM
                    ),
                    repo_full_name=repo.full_name,
                )
                db.add(new_issue)
                await db.flush()
                suggestion.issue_id = new_issue.id
                issue_count += 1

            repo.deep_analysis_status = "completed"
            repo.deep_analysis_result = markdown_report
            repo.deep_analysis_error = None
            repo.deep_analyzed_at = datetime.utcnow()
            await db.commit()

            logger.info(
                "심층 분석 완료: %s (id=%d, 제안 %d개, 이슈 %d개 자동 생성)",
                repo.full_name, repo_id, len(suggestions_data), issue_count,
            )

        except Exception as e:
            logger.exception("심층 분석 실패: %s (id=%d)", repo.full_name, repo_id)
            repo.deep_analysis_status = "failed"
            repo.deep_analysis_error = str(e)[:2000]
            repo.deep_analyzed_at = datetime.utcnow()
            await db.commit()

    def _select_deep_analysis_files(
        self, all_paths: list[str], language: Optional[str]
    ) -> list[str]:
        """심층 분석할 핵심 소스 파일 선택 (우선순위 정렬)"""
        # SKIP_DIRS 필터링
        valid_paths = [
            p for p in all_paths
            if not any(skip in p.split("/") for skip in SKIP_DIRS)
        ]

        # 언어별 확장자 결정
        source_extensions: set[str] = set()
        if language:
            lang_lower = language.lower()
            for key, exts in DEEP_ANALYSIS_EXTENSIONS.items():
                if key in lang_lower or lang_lower in key:
                    source_extensions.update(exts)

        if not source_extensions:
            # 기본 확장자
            source_extensions = {
                ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java",
            }

        # 소스 파일 필터링
        source_files = [
            p for p in valid_paths
            if any(p.endswith(ext) for ext in source_extensions)
        ]

        # 우선순위 디렉토리
        priority_dirs = {
            "src/", "app/", "lib/", "services/", "routes/",
            "components/", "api/", "core/", "utils/", "hooks/",
            "modules/", "controllers/", "middleware/",
        }

        def priority_score(path: str) -> int:
            score = 0
            for d in priority_dirs:
                if d in path:
                    score += 2
            # 테스트 파일 낮은 우선순위
            if "test" in path.lower() or "spec" in path.lower():
                score -= 3
            # 설정/타입 파일 낮은 우선순위
            if path.endswith((".d.ts", "config.ts", "config.js", "config.py")):
                score -= 1
            # 깊이에 따른 가산점 (핵심 로직일 가능성)
            score += min(path.count("/"), 3)
            return score

        source_files.sort(key=priority_score, reverse=True)
        return source_files[:MAX_FILES_TO_ANALYZE]

    async def _fetch_deep_files(
        self, owner: str, repo: str, selected_paths: list[str]
    ) -> dict[str, str]:
        """심층 분석용 파일 내용 수집 (300KB 제한)"""
        result: dict[str, str] = {}
        total_bytes = 0

        for path in selected_paths:
            if total_bytes >= MAX_DEEP_CONTENT_BYTES:
                break
            try:
                content = await self._get_file_content(owner, repo, path)
                if content:
                    content_bytes = len(content.encode("utf-8"))
                    if total_bytes + content_bytes <= MAX_DEEP_CONTENT_BYTES:
                        result[path] = content
                        total_bytes += content_bytes
            except Exception as e:
                logger.warning("심층 분석 파일 조회 실패: %s — %s", path, e)

        return result

    def _build_deep_prompt(
        self,
        full_name: str,
        description: Optional[str],
        phase1_result: Optional[str],
        files_content: dict[str, str],
    ) -> str:
        """Phase 2 심층 분석 프롬프트 생성"""
        files_section = ""
        for path, content in files_content.items():
            truncated = content[:MAX_DEEP_FILE_SIZE]
            if len(content) > MAX_DEEP_FILE_SIZE:
                truncated += "\n... (truncated)"
            files_section += f"\n### {path}\n```\n{truncated}\n```\n"

        phase1_section = ""
        if phase1_result:
            # Phase 1 결과 요약 (3000자 제한)
            phase1_section = f"""
## Phase 1 프로젝트 개요
{phase1_result[:3000]}
"""

        return f"""You are a senior software architect performing a deep code review.
Analyze the source code and identify concrete improvement opportunities.

Repository: {full_name}
{f'Description: {description}' if description else ''}
{phase1_section}

## Source Code ({len(files_content)} files)
{files_section}

## 분석 지침

위 소스 코드를 철저히 분석하여 다음 영역의 개선 사항을 찾아주세요:

1. **코드 품질** — 중복 코드, 복잡한 로직, 네이밍 문제, DRY 위반
2. **보안** — 인젝션 취약점, 인증/인가 문제, 민감 정보 노출, 입력 검증 부족
3. **성능** — N+1 쿼리, 불필요한 연산, 캐싱 부재, 메모리 누수 가능성
4. **아키텍처** — 관심사 분리, 결합도, 확장성, 설계 패턴 개선
5. **테스트** — 테스트 커버리지 부족, 엣지 케이스 미처리
6. **문서화** — API 문서 부족, 복잡한 로직 설명 부재

## 응답 형식

먼저 마크다운으로 심층 분석 리포트를 작성하세요.
각 카테고리별로 발견한 문제를 설명하고 구체적인 코드 위치를 언급하세요.

리포트 끝에 반드시 아래 형식의 JSON 블록을 포함하세요.
각 제안은 실행 가능하고 구체적이어야 합니다.

```json
[
  {{
    "category": "code_quality|security|performance|architecture|testing|documentation",
    "severity": "low|medium|high|critical",
    "title": "간결한 제안 제목 (최대 100자)",
    "description": "문제에 대한 상세 설명과 왜 중요한지",
    "affected_files": ["경로/파일1.py", "경로/파일2.ts"],
    "suggested_fix": "구체적인 수정 방법 또는 단계"
  }}
]
```

- 5~15개의 실행 가능한 제안을 생성하세요
- severity 순으로 정렬 (critical > high > medium > low)
- 모든 텍스트는 한국어로 작성 (파일 경로와 category/severity 값 제외)
- JSON은 반드시 유효한 JSON이어야 합니다
"""

    # ── 일감 AI 자동 생성 ──────────────────────────────────

    async def generate_work_plan(
        self, issue_id: int, db: AsyncSession
    ) -> None:
        """일감의 제목, 우선순위, 카테고리, 작업 계획을 AI로 자동 생성"""
        result = await db.execute(
            select(Issue).where(Issue.id == issue_id)
        )
        issue = result.scalar_one_or_none()
        if not issue:
            logger.error("Issue not found: id=%d", issue_id)
            return

        issue.ai_plan_status = "generating"
        await db.commit()

        try:
            # 사용 가능한 라벨 목록 조회
            label_result = await db.execute(select(Label))
            available_labels = list(label_result.scalars().all())
            label_names = [l.name for l in available_labels]
            label_map = {l.name: l.id for l in available_labels}

            # 리포 컨텍스트 수집
            repo_context = ""
            if issue.repo_full_name:
                try:
                    owner, repo_name = issue.repo_full_name.split("/", 1)
                    tree_data = await self.github.get_repo_tree(owner, repo_name)
                    file_paths = [
                        item["path"]
                        for item in tree_data.get("tree", [])
                        if item.get("type") == "blob"
                    ]
                    tree_text = "\n".join(file_paths[:300])
                    if len(file_paths) > 300:
                        tree_text += f"\n... 외 {len(file_paths) - 300}개 파일"
                    repo_context = f"""
## 리포지토리 정보
- 리포지토리: {issue.repo_full_name}

### 파일 구조
```
{tree_text}
```
"""
                except Exception as e:
                    logger.warning(
                        "리포 구조 조회 실패: %s — %s", issue.repo_full_name, e
                    )

            prompt = f"""당신은 소프트웨어 개발 프로젝트 매니저입니다.
사용자가 아래 설명을 입력하여 일감(task)을 등록했습니다.
이 설명을 분석하여 일감의 메타데이터와 상세 작업 계획을 생성해주세요.

## 사용자 입력
{issue.description or '(설명 없음)'}
{repo_context}

## 생성해야 할 항목

응답은 반드시 아래 형식을 따르세요.

**먼저** 다음 JSON 블록을 출력하세요:

```json
{{
  "title": "간결한 일감 제목 (최대 80자, 한국어)",
  "priority": "low|medium|high",
  "labels": ["사용 가능한 라벨 중 선택"]
}}
```

- **title**: 설명의 핵심을 담은 간결한 제목
- **priority**: 작업의 긴급도/복잡도 기반 (high=긴급하거나 복잡, medium=보통, low=간단)
- **labels**: 다음 라벨 중 해당하는 것을 선택: {json.dumps(label_names, ensure_ascii=False)}

**그 다음** 마크다운으로 작업 계획을 작성하세요:

### 작업 계획
1. 구체적인 단계별 작업 내용
2. 각 단계에서 수정해야 할 파일이나 모듈 언급
3. 기술적 고려사항 포함

### 예상 동작
- 구현 완료 후 시스템의 예상 동작
- 사용자 시나리오 관점의 기대 결과

### 체크리스트
- [ ] 구현 확인 항목
- [ ] 테스트 항목

### 주의사항
- 구현 시 주의할 점

**중요**: 모든 텍스트는 한국어로, 구체적이고 실행 가능하게 작성하세요.
"""

            raw_result = await self._call_gemini(prompt)

            # JSON 블록 파싱
            json_match = re.search(
                r"```json\s*\n(.*?)\n\s*```", raw_result, re.DOTALL
            )

            if json_match:
                try:
                    meta = json.loads(json_match.group(1))
                    # 제목 업데이트
                    if meta.get("title"):
                        issue.title = str(meta["title"])[:255]
                    # 우선순위 업데이트
                    priority_val = meta.get("priority", "medium")
                    priority_map = {
                        "low": IssuePriority.LOW,
                        "medium": IssuePriority.MEDIUM,
                        "high": IssuePriority.HIGH,
                    }
                    if priority_val in priority_map:
                        issue.priority = priority_map[priority_val]
                    # 라벨 업데이트
                    ai_labels = meta.get("labels", [])
                    if ai_labels and isinstance(ai_labels, list):
                        matched_label_ids = [
                            label_map[name]
                            for name in ai_labels
                            if name in label_map
                        ]
                        if matched_label_ids:
                            # 기존 라벨 제거 후 새 라벨 연결
                            await db.execute(
                                issue_labels.delete().where(
                                    issue_labels.c.issue_id == issue.id
                                )
                            )
                            for lid in matched_label_ids:
                                await db.execute(
                                    issue_labels.insert().values(
                                        issue_id=issue.id, label_id=lid
                                    )
                                )
                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning("AI 메타데이터 파싱 실패: %s", e)

            # 마크다운 작업 계획 (JSON 블록 이후)
            markdown_plan = raw_result
            if json_match:
                markdown_plan = raw_result[json_match.end():].strip()

            issue.behavior_example = markdown_plan
            issue.ai_plan_status = "completed"
            await db.commit()

            logger.info(
                "AI 일감 생성 완료: issue_id=%d, title=%s",
                issue_id, issue.title,
            )

        except Exception as e:
            logger.exception("AI 일감 생성 실패: issue_id=%d", issue_id)
            issue.ai_plan_status = "failed"
            await db.commit()

    def _parse_deep_response(
        self, raw_response: str
    ) -> tuple[list[dict], str]:
        """Gemini 응답을 마크다운 리포트 + JSON 제안 목록으로 분리"""
        valid_categories = {c.value for c in SuggestionCategory}
        valid_severities = {s.value for s in SuggestionSeverity}

        # JSON 블록 추출
        json_match = re.search(
            r"```json\s*\n(.*?)\n\s*```", raw_response, re.DOTALL
        )

        suggestions: list[dict] = []
        if json_match:
            try:
                parsed = json.loads(json_match.group(1))
                if isinstance(parsed, list):
                    for s in parsed:
                        if (
                            isinstance(s, dict)
                            and s.get("category") in valid_categories
                            and s.get("severity") in valid_severities
                            and s.get("title")
                            and s.get("description")
                        ):
                            suggestions.append(s)
            except json.JSONDecodeError:
                logger.warning("심층 분석 JSON 파싱 실패")

        # 마크다운 리포트 (JSON 블록 이전 부분)
        markdown_report = raw_response
        if json_match:
            markdown_report = raw_response[: json_match.start()].rstrip()

        return suggestions, markdown_report
