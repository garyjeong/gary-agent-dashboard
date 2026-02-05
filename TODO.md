# Gary Agent Dashboard - 개선 TODO

> 분석 일시: 2026-02-05
> 버전: Python 3.12 + FastAPI 0.115.0 + Next.js 16 + React 19

---

## 1. 보안 (HIGH Priority)

### 1.1 세션 관리 개선
- [ ] 메모리 기반 세션을 JWT로 교체
- [ ] 세션 타임아웃 관리 구현 (7일 → 갱신 토큰 방식)
- [ ] `secure=True` 쿠키 옵션 추가 (HTTPS 환경)
- **파일**: `backend/src/routes/auth.py:14-58`

### 1.2 입력 검증 강화
- [ ] GitHub owner/repo 경로 검증 (Path Traversal 방지)
- [ ] Telegram 메시지 템플릿 이스케이프 처리
- [ ] Pydantic validator 추가
- **파일**: `backend/src/routes/github.py:92-102`, `backend/src/services/telegram_service.py:136-152`

### 1.3 API 인증 구현
- [ ] `/api/queue/*` 엔드포인트에 API Key 인증 추가
- [ ] `X-API-Key` 헤더 검증 미들웨어 구현
- **파일**: `backend/src/routes/queue.py:19-32`

### 1.4 GitHub 토큰 암호화
- [ ] 데이터베이스 저장 시 토큰 암호화
- [ ] Fernet 또는 유사 라이브러리 사용
- **파일**: `backend/src/models/user.py`

### 1.5 CORS 설정 강화
- [ ] `allow_methods`, `allow_headers` 명시적 지정
- **파일**: `backend/src/main.py:30-36`

---

## 2. 디자인 개선 (HIGH Priority)

### 2.1 UI 스타일 리뉴얼
- [ ] Linear/Notion 스타일 적용 (기능 중심, 깔끔한 여백)
- [ ] 라이트 모드 전용 디자인
- [ ] 반응형 레이아웃 (모바일 완전 지원)
- [ ] 컬러 팔레트 정의 (primary, secondary, accent)
- [ ] 타이포그래피 체계화 (heading, body, caption)

### 2.2 일감 카드 리디자인
- [ ] 리포지토리 이름 표시 (아이콘 + 텍스트)
- [ ] 생성일/수정일 표시 (상대 시간: "2시간 전")
- [ ] 대기 중인 큐 상태 배지 표시
- [ ] 우선순위 컬러 인디케이터
- [ ] 라벨/태그 표시 영역

### 2.3 대시보드 개선
- [ ] 리포지토리별 상태별 일감 수 통계 카드
- [ ] 컴팩트한 통계 요약 헤더
- [ ] 빈 상태 일러스트레이션

### 2.4 컴포넌트 라이브러리
- [ ] Button, Input, Select, Modal 등 기본 컴포넌트 통일
- [ ] shadcn/ui 또는 커스텀 컴포넌트 시스템
- **파일**: `frontend/src/components/ui/` (신규)

---

## 3. 핵심 기능 (HIGH Priority)

### 3.1 드래그 앤 드롭
- [ ] 일감 카드 드래그로 상태 변경 (To Do → In Progress → Done)
- [ ] @dnd-kit/core 또는 react-beautiful-dnd 사용
- [ ] 드래그 중 시각적 피드백 (그림자, 투명도)
- [ ] 터치 디바이스 지원
- **파일**: `frontend/src/components/issues/IssueBoard.tsx`, `frontend/src/components/issues/IssueColumn.tsx`

### 3.2 라벨/태그 시스템
- [ ] 백엔드: `labels` 테이블 생성 (id, name, color)
- [ ] 백엔드: `issue_labels` 다대다 관계 테이블
- [ ] 프론트엔드: 라벨 선택 UI (멀티셀렉트)
- [ ] 프론트엔드: 라벨별 필터링
- [ ] 기본 라벨: bug (빨강), feature (파랑), refactor (노랑), docs (초록)
- **파일**: `backend/src/models/label.py` (신규), `frontend/src/components/issues/LabelSelector.tsx` (신규)

### 3.3 일감 상세 모달 개선
- [ ] 에이전트 작업 이력 타임라인 표시
- [ ] 마크다운 설명 렌더링 (react-markdown)
- [ ] 동작 예시 편집 (인라인 에디터)
- [ ] GitHub PR 링크 표시 (있는 경우)
- [ ] 모달 크기 확대 (더 많은 정보)
- **파일**: `frontend/src/components/issues/IssueDetailModal.tsx` (신규)

### 3.4 리포지토리별 필터링
- [ ] 대시보드에서 리포지토리 선택 드롭다운
- [ ] 선택된 리포 기준으로 일감 필터
- [ ] URL 쿼리 파라미터로 상태 유지

---

## 4. 에러 처리 (HIGH Priority)

### 4.1 백엔드 에러 핸들링
- [ ] 공통 에러 응답 모델 (`ErrorResponse`) 정의
- [ ] 글로벌 예외 핸들러 추가
- [ ] GitHub API 재귀 호출 시 무한 루프 방지
- **파일**: `backend/src/services/github_service.py:160-188`

### 4.2 프론트엔드 에러 표시
- [ ] Toast 컴포넌트 구현 (성공/에러/경고)
- [ ] API 호출 실패 시 사용자에게 알림
- [ ] 네트워크 에러, 타임아웃 처리
- **파일**: `frontend/src/components/ui/Toast.tsx` (신규)

### 4.3 타임아웃 및 재시도
- [ ] httpx 클라이언트 타임아웃 설정
- [ ] 네트워크 실패 시 재시도 로직 (exponential backoff)
- **파일**: `backend/src/services/github_service.py`, `backend/src/services/telegram_service.py`

---

## 5. 기능 구현 (MEDIUM Priority)

### 5.1 페이지네이션 UI
- [ ] 페이지 컨트롤 컴포넌트 구현
- [ ] URL 쿼리 파라미터로 페이지 상태 유지
- **파일**: `frontend/src/components/issues/IssueBoard.tsx`

### 5.2 검색 기능
- [ ] 백엔드: `search` 파라미터 추가 (제목/설명 검색)
- [ ] 프론트엔드: 검색 입력 컴포넌트 (디바운스 적용)
- **파일**: `backend/src/routes/issues.py`, `backend/src/repositories/issue_repository.py`

### 5.3 큐 통계 API
- [ ] `GET /api/queue/stats` 엔드포인트 추가
- [ ] 대시보드에 큐 상태 위젯 표시
- **파일**: `backend/src/routes/queue.py`

### 5.4 동작 예시 자동 생성
- [ ] `BehaviorGenerator` 서비스 구현
- [ ] 리포 구조 분석 후 행동 지침 생성
- **파일**: `backend/src/services/behavior_generator.py` (신규)

### 5.5 GitHub PR 연동
- [ ] 일감에 PR URL 필드 추가
- [ ] PR 생성 시 자동 연결 (에이전트 작업 결과)
- [ ] PR 상태 표시 (open, merged, closed)
- **파일**: `backend/src/models/issue.py`, `frontend/src/components/issues/IssueCard.tsx`

---

## 6. UX 개선 (MEDIUM Priority)

### 6.1 로딩 상태
- [ ] 상태 변경 시 로딩 인디케이터
- [ ] 버튼 disabled 상태 표시
- [ ] 스켈레톤 로딩 UI
- **파일**: `frontend/src/components/issues/IssueCard.tsx`

### 6.2 Optimistic Update
- [ ] 상태 변경 시 즉시 UI 반영
- [ ] 실패 시 롤백 처리
- **파일**: `frontend/src/components/issues/IssueBoard.tsx`

### 6.3 데이터 페칭 최적화
- [ ] `refreshInterval: 5000` 제거 (수동 새로고침만)
- [ ] 새로고침 버튼 눈에 띄게 배치
- [ ] 마지막 업데이트 시간 표시
- **파일**: `frontend/src/hooks/useIssues.ts:24-30`

### 6.4 빈 상태 처리
- [ ] 일감이 없을 때 안내 메시지
- [ ] 첫 일감 생성 유도 CTA
- **파일**: `frontend/src/components/issues/IssueColumn.tsx`

---

## 7. 아키텍처 개선 (MEDIUM Priority)

### 7.1 의존성 주입 중앙화
- [ ] `backend/src/dependencies.py` 생성
- [ ] 서비스 초기화 로직 통합
- **파일**: 각 라우터 파일

### 7.2 프론트엔드 상태 관리
- [ ] Zustand 도입
- [ ] 필터 상태 전역화
- **파일**: `frontend/src/lib/store.ts` (신규)

### 7.3 컴포넌트 분리
- [ ] `IssueModal` → `CreateIssueModal` + `EditIssueModal` 분리
- **파일**: `frontend/src/components/issues/IssueModal.tsx`

### 7.4 트랜잭션 관리
- [ ] 큐 상태 업데이트와 알림 전송 트랜잭션 처리
- **파일**: `backend/src/services/queue_service.py:66-94`

### 7.5 쿼리 최적화
- [ ] 필터 조건 중복 제거
- [ ] WHERE 절 빌더 함수 추출
- **파일**: `backend/src/repositories/issue_repository.py:29-58`

---

## 8. 테스트 (MEDIUM Priority)

### 8.1 백엔드 테스트
- [ ] `requirements-dev.txt` 생성 (pytest, pytest-asyncio)
- [ ] `tests/test_issue_service.py` 작성
- [ ] `tests/test_queue_service.py` 작성
- [ ] `tests/test_auth.py` 작성

### 8.2 프론트엔드 테스트
- [ ] Jest + React Testing Library 설정
- [ ] 컴포넌트 단위 테스트 작성
- [ ] Hook 테스트 작성

### 8.3 E2E 테스트
- [ ] Playwright 설정
- [ ] 핵심 사용자 플로우 테스트

---

## 9. 문서화 (LOW Priority)

### 9.1 API 문서
- [ ] FastAPI docs 설정 (`/api/docs`, `/api/redoc`)
- [ ] 각 엔드포인트에 상세 docstring 추가
- **파일**: `backend/src/main.py`, 각 라우터 파일

### 9.2 README
- [ ] 프로젝트 루트 `README.md` 작성
- [ ] 환경 설정 가이드
- [ ] API 사용 예제

### 9.3 개발 가이드
- [ ] `CONTRIBUTING.md` 작성
- [ ] 코드 스타일 가이드
- [ ] Git 워크플로우

---

## 10. 타입 안전성 (LOW Priority)

### 10.1 백엔드
- [ ] GitHub API 응답 타입 정의 (`GithubRepo`, `GithubUser` 등)
- [ ] 서비스 반환 타입 구체화
- **파일**: `backend/src/services/github_service.py:132-152`

### 10.2 프론트엔드
- [ ] API 에러 응답 타입 정의 (`QueueError`, `QueueResponse<T>`)
- **파일**: `frontend/src/types/queue.ts`

---

## 우선순위 요약

| Priority | 카테고리 | 주요 항목 |
|----------|---------|----------|
| **HIGH** | 보안 | JWT 세션, 입력 검증, API 인증 |
| **HIGH** | 디자인 | Linear 스타일, 반응형, 카드 리디자인 |
| **HIGH** | 핵심 기능 | 드래그 앤 드롭, 라벨/태그, 상세 모달 |
| **HIGH** | 에러 처리 | Toast UI, 글로벌 에러 핸들러 |
| MEDIUM | 기능 구현 | 검색, 페이지네이션, PR 연동 |
| MEDIUM | UX 개선 | Optimistic Update, 로딩 상태 |
| MEDIUM | 아키텍처 | Zustand, 컴포넌트 분리 |
| MEDIUM | 테스트 | 단위 테스트, E2E 테스트 |
| LOW | 문서화 | API 문서, README |
| LOW | 타입 안전성 | 타입 정의 강화 |

---

## 기술 스택 결정

### 인증
- **GitHub OAuth 유지** (인증 + GitHub 리포 접근 권한)
- JWT로 세션 관리 개선

### 드래그 앤 드롭
- **@dnd-kit/core** (권장) - 가볍고, 터치 지원, 접근성 우수

### 마크다운 렌더링
- **react-markdown** + remark-gfm

### 상태 관리
- **Zustand** (간단하고 보일러플레이트 적음)

### UI 컴포넌트
- 커스텀 컴포넌트 시스템 (shadcn/ui 스타일 참고)

---

## 완료된 항목

- [x] Python 3.12 업그레이드
- [x] FastAPI 0.115.0 업그레이드
- [x] Next.js 16 + React 19 업그레이드
- [x] PostgreSQL 로컬 환경 설정
- [x] fly.io 배포 설정 파일 생성
