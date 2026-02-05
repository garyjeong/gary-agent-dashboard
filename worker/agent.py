"""에이전트 실행 모듈"""
import os
import subprocess
import tempfile
from pathlib import Path
from config import config


class AgentRunner:
    """에이전트 실행기"""
    
    def __init__(self):
        self.work_dir = Path(config.WORK_DIR)
        self.work_dir.mkdir(parents=True, exist_ok=True)
    
    async def run(self, queue_item: dict) -> tuple[bool, str]:
        """
        큐 아이템을 처리하고 결과 반환
        
        Returns:
            (성공여부, 결과메시지)
        """
        issue = queue_item.get("issue", {})
        issue_id = issue.get("id")
        title = issue.get("title", "제목 없음")
        description = issue.get("description", "")
        repo_full_name = issue.get("repo_full_name")
        behavior_example = issue.get("behavior_example", "")
        
        print(f"\n{'='*60}")
        print(f"[에이전트] 작업 시작")
        print(f"  - 일감 ID: {issue_id}")
        print(f"  - 제목: {title}")
        print(f"  - 리포: {repo_full_name or '미지정'}")
        print(f"{'='*60}\n")
        
        # 프롬프트 생성
        prompt = self._build_prompt(
            title=title,
            description=description,
            repo_full_name=repo_full_name,
            behavior_example=behavior_example,
        )
        
        # 에이전트 타입에 따라 실행
        if config.AGENT_TYPE == "claude_code":
            return await self._run_claude_code(prompt, repo_full_name)
        elif config.AGENT_TYPE == "cursor":
            return await self._run_cursor(prompt, repo_full_name)
        else:
            return False, f"지원하지 않는 에이전트 타입: {config.AGENT_TYPE}"
    
    def _build_prompt(
        self,
        title: str,
        description: str,
        repo_full_name: str | None,
        behavior_example: str,
    ) -> str:
        """에이전트에게 전달할 프롬프트 생성"""
        prompt_parts = [
            f"# 작업 요청: {title}",
            "",
        ]
        
        if description:
            prompt_parts.extend([
                "## 설명",
                description,
                "",
            ])
        
        if repo_full_name:
            prompt_parts.extend([
                "## 대상 리포지토리",
                f"- {repo_full_name}",
                "",
            ])
        
        if behavior_example:
            prompt_parts.extend([
                "## 수행할 작업",
                behavior_example,
                "",
            ])
        
        prompt_parts.extend([
            "## 지침",
            "- 위 작업을 수행해주세요.",
            "- 작업 완료 후 변경 사항을 커밋해주세요.",
            "- PR 생성이 필요하면 PR을 생성해주세요.",
        ])
        
        return "\n".join(prompt_parts)
    
    async def _run_claude_code(
        self,
        prompt: str,
        repo_full_name: str | None,
    ) -> tuple[bool, str]:
        """Claude Code (claude 명령어) 실행"""
        try:
            # 작업 디렉토리 결정
            if repo_full_name:
                repo_dir = self.work_dir / repo_full_name.replace("/", "_")
                
                # 리포가 없으면 클론
                if not repo_dir.exists():
                    print(f"[에이전트] 리포 클론 중: {repo_full_name}")
                    clone_result = subprocess.run(
                        ["git", "clone", f"https://github.com/{repo_full_name}.git", str(repo_dir)],
                        capture_output=True,
                        text=True,
                    )
                    if clone_result.returncode != 0:
                        return False, f"리포 클론 실패: {clone_result.stderr}"
                else:
                    # 최신 상태로 pull
                    subprocess.run(
                        ["git", "pull"],
                        cwd=str(repo_dir),
                        capture_output=True,
                    )
                
                work_path = repo_dir
            else:
                work_path = self.work_dir
            
            # 프롬프트를 임시 파일에 저장
            with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
                f.write(prompt)
                prompt_file = f.name
            
            print(f"[에이전트] Claude Code 실행 중...")
            print(f"  - 작업 디렉토리: {work_path}")
            print(f"  - 프롬프트 파일: {prompt_file}")
            
            # Claude Code 실행
            # claude 명령어가 설치되어 있어야 함
            result = subprocess.run(
                ["claude", "-p", prompt_file, "--dangerously-skip-permissions"],
                cwd=str(work_path),
                capture_output=True,
                text=True,
                timeout=600,  # 10분 타임아웃
            )
            
            # 임시 파일 삭제
            os.unlink(prompt_file)
            
            if result.returncode == 0:
                output = result.stdout or "작업 완료"
                return True, output[-2000:] if len(output) > 2000 else output
            else:
                error = result.stderr or result.stdout or "알 수 없는 오류"
                return False, error[-2000:] if len(error) > 2000 else error
                
        except subprocess.TimeoutExpired:
            return False, "작업 시간 초과 (10분)"
        except FileNotFoundError:
            return False, "claude 명령어를 찾을 수 없습니다. Claude Code CLI를 설치해주세요."
        except Exception as e:
            return False, f"실행 오류: {str(e)}"
    
    async def _run_cursor(
        self,
        prompt: str,
        repo_full_name: str | None,
    ) -> tuple[bool, str]:
        """Cursor Agent 실행 (CLI 모드)"""
        # Cursor는 CLI 모드가 제한적이므로 프롬프트 파일 생성 후 안내
        try:
            if repo_full_name:
                repo_dir = self.work_dir / repo_full_name.replace("/", "_")
                
                if not repo_dir.exists():
                    print(f"[에이전트] 리포 클론 중: {repo_full_name}")
                    clone_result = subprocess.run(
                        ["git", "clone", f"https://github.com/{repo_full_name}.git", str(repo_dir)],
                        capture_output=True,
                        text=True,
                    )
                    if clone_result.returncode != 0:
                        return False, f"리포 클론 실패: {clone_result.stderr}"
                
                work_path = repo_dir
            else:
                work_path = self.work_dir
            
            # 프롬프트 파일 생성
            prompt_file = work_path / "TASK.md"
            prompt_file.write_text(prompt)
            
            print(f"[에이전트] Cursor 작업 준비 완료")
            print(f"  - 작업 디렉토리: {work_path}")
            print(f"  - 프롬프트 파일: {prompt_file}")
            
            # Cursor 열기 (비동기로 열고 바로 반환)
            subprocess.Popen(
                ["cursor", str(work_path)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            
            return True, f"Cursor에서 작업 디렉토리를 열었습니다.\nTASK.md 파일의 내용을 확인하고 Agent에게 전달해주세요.\n\n경로: {work_path}"
            
        except FileNotFoundError:
            return False, "cursor 명령어를 찾을 수 없습니다. Cursor를 설치해주세요."
        except Exception as e:
            return False, f"실행 오류: {str(e)}"
