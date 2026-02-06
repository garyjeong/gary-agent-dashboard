"""동작 예시 자동 생성 서비스"""
import logging
from typing import Optional

from src.services.github_service import GitHubAPIService

logger = logging.getLogger(__name__)


class BehaviorGenerator:
    """리포 구조 분석 후 행동 지침 생성"""

    def __init__(self, github_service: GitHubAPIService):
        self.github_service = github_service

    async def generate(
        self,
        repo_full_name: str,
        issue_title: str,
        issue_description: Optional[str] = None,
    ) -> str:
        """리포 구조를 분석하여 에이전트 행동 지침 생성"""
        try:
            # 리포 구조 가져오기
            owner, repo = repo_full_name.split("/", 1)
            tree = await self.github_service.get_repo_tree(owner, repo)
            file_paths = [item["path"] for item in tree.get("tree", []) if item.get("type") == "blob"]

            # 주요 디렉토리/파일 분석
            has_tests = any("test" in p.lower() for p in file_paths)
            has_src = any(p.startswith("src/") for p in file_paths)
            has_docs = any(p.startswith("docs/") or p.endswith(".md") for p in file_paths)
            languages = self._detect_languages(file_paths)

            # 행동 지침 생성
            lines = [
                f"## 작업 지침: {issue_title}",
                "",
            ]

            if issue_description:
                lines.append(f"**목표**: {issue_description}")
                lines.append("")

            lines.append("### 프로젝트 구조")
            lines.append(f"- **주요 언어**: {', '.join(languages) if languages else '알 수 없음'}")
            if has_src:
                lines.append("- **소스 디렉토리**: `src/`")
            if has_tests:
                lines.append("- **테스트 존재**: 변경 사항에 대한 테스트를 작성하세요")
            if has_docs:
                lines.append("- **문서 존재**: 필요 시 문서를 업데이트하세요")

            lines.append("")
            lines.append("### 작업 절차")
            lines.append("1. 관련 코드를 분석합니다")
            lines.append("2. 변경 사항을 구현합니다")
            if has_tests:
                lines.append("3. 테스트를 작성하고 실행합니다")
            lines.append(f"{'4' if has_tests else '3'}. PR을 생성합니다")

            return "\n".join(lines)

        except Exception as e:
            logger.warning("행동 지침 생성 실패: %s", e)
            return f"## 작업 지침: {issue_title}\n\n관련 코드를 분석하고, 변경 사항을 구현한 뒤 PR을 생성하세요."

    @staticmethod
    def _detect_languages(file_paths: list[str]) -> list[str]:
        """파일 확장자로 주요 언어 감지"""
        ext_map = {
            ".py": "Python",
            ".ts": "TypeScript",
            ".tsx": "TypeScript",
            ".js": "JavaScript",
            ".jsx": "JavaScript",
            ".go": "Go",
            ".rs": "Rust",
            ".java": "Java",
        }
        detected = set()
        for path in file_paths:
            for ext, lang in ext_map.items():
                if path.endswith(ext):
                    detected.add(lang)
        return sorted(detected)
