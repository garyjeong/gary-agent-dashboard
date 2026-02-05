# Gary Agent Dashboard - 개선 TODO

> 분석 일시: 2026-02-05
> 버전: Python 3.12 + FastAPI 0.115.0 + Next.js 16 + React 19

---

## 1. 보안 (HIGH Priority)

### 1.1 세션 관리 개선
- [ ] 메모리 기반 세션을 Redis 또는 JWT로 교체
- [ ] 세션 타임아웃 관리 구현
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

## 2. 에러 처리 (HIGH Priority)

### 2.1 백엔드 에러 핸들링
- [ ] 공통 에러 응답 모델 (`ErrorResponse`) 정의
- [ ] 글로벌 예외 핸들러 추가
- [ ] GitHub API 재귀 호출 시 무한 루프 방지
- **파일**: `backend/src/services/github_service.py:160-188`

### 2.2 프론트엔드 에러 표시
- [ ] Toast 컴포넌트 구현
- [ ] API 호출 실패 시 사용자에게 알림
- [ ] 네트워크 에러, 타임아웃 처리
- **파일**: `frontend/src/components/issues/IssueBoard.tsx:40-44`

### 2.3 타임아웃 및 재시도
- [ ] httpx 클라이언트 타임아웃 설정
- [ ] 네트워크 실패 시 재시도 로직 (exponential backoff)
- **파일**: `backend/src/services/github_service.py`, `backend/src/services/telegram_service.py`

---

## 3. 기능 구현 (MEDIUM Priority)

### 3.1 일감 상세보기
- [ ] `GET /api/issues/{id}` 응답에 queue_items 포함
- [ ] `frontend/src/app/issues/[id]/page.tsx` 페이지 생성
- [ ] 작업 이력 타임라인 표시

### 3.2 페이지네이션 UI
- [ ] 페이지 컨트롤 컴포넌트 구현
- [ ] URL 쿼리 파라미터로 페이지 상태 유지
- **파일**: `frontend/src/components/issues/IssueBoard.tsx`

### 3.3 필터링 UI
- [ ] 상태, 우선순위, 리포별 필터 컴포넌트
- [ ] URL 쿼리 파라미터로 필터 상태 유지
- **파일**: `frontend/src/components/issues/IssueFilters.tsx` (신규)

### 3.4 검색 기능
- [ ] 백엔드: `search` 파라미터 추가 (제목/설명 검색)
- [ ] 프론트엔드: 검색 입력 컴포넌트
- **파일**: `backend/src/routes/issues.py`, `backend/src/repositories/issue_repository.py`

### 3.5 큐 통계 API
- [ ] `GET /api/queue/stats` 엔드포인트 추가
- [ ] 대시보드에 큐 상태 위젯 표시
- **파일**: `backend/src/routes/queue.py`

### 3.6 동작 예시 자동 생성
- [ ] `BehaviorGenerator` 서비스 구현
- [ ] 리포 구조 분석 후 행동 지침 생성
- **파일**: `backend/src/services/behavior_generator.py` (신규)

---

## 4. UX 개선 (MEDIUM Priority)

### 4.1 로딩 상태
- [ ] 상태 변경 시 로딩 인디케이터
- [ ] 버튼 disabled 상태 표시
- **파일**: `frontend/src/components/issues/IssueCard.tsx`

### 4.2 Optimistic Update
- [ ] 상태 변경 시 즉시 UI 반영
- [ ] 실패 시 롤백 처리
- **파일**: `frontend/src/components/issues/IssueBoard.tsx`

### 4.3 SWR 설정 최적화
- [ ] `refreshInterval: 5000` 제거
- [ ] `revalidateOnFocus`, `dedupingInterval` 설정
- **파일**: `frontend/src/hooks/useIssues.ts:24-30`

---

## 5. 아키텍처 개선 (MEDIUM Priority)

### 5.1 의존성 주입 중앙화
- [ ] `backend/src/dependencies.py` 생성
- [ ] 서비스 초기화 로직 통합
- **파일**: 각 라우터 파일

### 5.2 프론트엔드 상태 관리
- [ ] Zustand 또는 Context 도입
- [ ] 필터 상태 전역화
- **파일**: `frontend/src/lib/store.ts` (신규)

### 5.3 컴포넌트 분리
- [ ] `IssueModal` → `CreateIssueModal` + `EditIssueModal` 분리
- **파일**: `frontend/src/components/issues/IssueModal.tsx`

### 5.4 트랜잭션 관리
- [ ] 큐 상태 업데이트와 알림 전송 트랜잭션 처리
- **파일**: `backend/src/services/queue_service.py:66-94`

### 5.5 쿼리 최적화
- [ ] 필터 조건 중복 제거
- [ ] WHERE 절 빌더 함수 추출
- **파일**: `backend/src/repositories/issue_repository.py:29-58`

---

## 6. 테스트 (HIGH Priority)

### 6.1 백엔드 테스트
- [ ] `requirements-dev.txt` 생성 (pytest, pytest-asyncio)
- [ ] `tests/test_issue_service.py` 작성
- [ ] `tests/test_queue_service.py` 작성
- [ ] `tests/test_auth.py` 작성

### 6.2 프론트엔드 테스트
- [ ] Jest + React Testing Library 설정
- [ ] 컴포넌트 단위 테스트 작성
- [ ] Hook 테스트 작성

### 6.3 E2E 테스트
- [ ] Playwright 설정
- [ ] 핵심 사용자 플로우 테스트

---

## 7. 문서화 (HIGH Priority)

### 7.1 API 문서
- [ ] FastAPI docs 설정 (`/api/docs`, `/api/redoc`)
- [ ] 각 엔드포인트에 상세 docstring 추가
- **파일**: `backend/src/main.py`, 각 라우터 파일

### 7.2 README
- [ ] 프로젝트 루트 `README.md` 작성
- [ ] 환경 설정 가이드
- [ ] API 사용 예제

### 7.3 개발 가이드
- [ ] `CONTRIBUTING.md` 작성
- [ ] 코드 스타일 가이드
- [ ] Git 워크플로우

---

## 8. 타입 안전성 (LOW Priority)

### 8.1 백엔드
- [ ] GitHub API 응답 타입 정의 (`GithubRepo`, `GithubUser` 등)
- [ ] 서비스 반환 타입 구체화
- **파일**: `backend/src/services/github_service.py:132-152`

### 8.2 프론트엔드
- [ ] API 에러 응답 타입 정의 (`QueueError`, `QueueResponse<T>`)
- **파일**: `frontend/src/types/queue.ts`

---

## 우선순위 요약

| Priority | 카테고리 | 예상 작업량 |
|----------|---------|-----------|
| HIGH | 보안 강화 | 1주 |
| HIGH | 테스트 기반 구축 | 1주 |
| HIGH | 문서화 | 3일 |
| MEDIUM | 기능 구현 | 1주 |
| MEDIUM | UX 개선 | 3일 |
| MEDIUM | 아키텍처 개선 | 1주 |
| LOW | 타입 안전성 | 2일 |

---

## 완료된 항목

- [x] Python 3.12 업그레이드
- [x] FastAPI 0.115.0 업그레이드
- [x] Next.js 16 + React 19 업그레이드
- [x] PostgreSQL 로컬 환경 설정
- [x] fly.io 배포 설정 파일 생성
