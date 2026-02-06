# DEPLOY-TODO.md — Fly.io 배포 작업 목록

## 개요

- **배포 대상**: Backend (FastAPI) + Frontend (Next.js)
- **데이터베이스**: Fly.io PostgreSQL (최저사양)
- **사용자**: 단일 사용자 (본인 전용)

---

## Phase 1: 데이터베이스 변경 (SQLite → PostgreSQL)

### 1.1 Backend 코드 수정
- [x] `requirements.txt`에 `asyncpg` 추가
- [x] `config.py` - DATABASE_URL 환경변수로 PostgreSQL 지원 (기존 코드 유지, 환경변수로 전환)
- [ ] (선택) `database.py` - 연결 풀 설정 추가
- [x] SQLite 전용 문법 사용 여부 확인 → 없음

### 1.2 로컬 테스트
- [ ] Docker로 PostgreSQL 로컬 실행 (테스트용)
- [ ] 마이그레이션 테스트

---

## Phase 2: Dockerfile 생성

### 2.1 Backend Dockerfile
- [x] `backend/Dockerfile` 생성
  - Python 3.11-slim 베이스 이미지
  - requirements.txt 설치
  - uvicorn 실행

### 2.2 Frontend Dockerfile
- [x] `frontend/Dockerfile` 생성
  - Node.js 20-alpine 베이스 이미지
  - 멀티 스테이지 빌드 (builder + runner)
  - standalone 모드로 실행

---

## Phase 3: Fly.io 설정

### 3.1 Backend 배포 설정
- [x] `backend/fly.toml` 생성
  - app: gary-dashboard-api
  - region: nrt (Tokyo)
  - 내부 포트 8000
  - 헬스체크 경로: `/health`

### 3.2 Frontend 배포 설정
- [x] `frontend/fly.toml` 생성
  - app: gary-dashboard-web
  - region: nrt (Tokyo)
  - 내부 포트 3000

### 3.3 PostgreSQL 생성
- [ ] `fly postgres create` 실행 (최저사양: shared-cpu-1x, 256MB)
- [ ] Backend 앱에 PostgreSQL 연결 (`fly postgres attach`)

---

## Phase 4: 환경변수 설정

### 4.1 Backend Secrets
```bash
fly secrets set -a gary-dashboard-api \
  DATABASE_URL="postgres://..." \
  API_KEY="<생성한 API 키>" \
  GITHUB_CLIENT_ID="<GitHub OAuth Client ID>" \
  GITHUB_CLIENT_SECRET="<GitHub OAuth Client Secret>" \
  TELEGRAM_BOT_TOKEN="<텔레그램 봇 토큰>" \
  TELEGRAM_CHAT_ID="<텔레그램 채팅 ID>" \
  CORS_ORIGINS="https://gary-dashboard-web.fly.dev"
```

### 4.2 Frontend 환경변수
- [x] `.env.example` 생성
- [ ] fly.toml의 build.args에 NEXT_PUBLIC_API_URL 설정됨 (배포 시 확인)

### 4.3 GitHub OAuth 콜백 URL 업데이트
- [ ] GitHub OAuth App 설정에서 콜백 URL 변경
  - `https://gary-dashboard-api.fly.dev/api/auth/github/callback`

---

## Phase 5: 코드 개선 (배포 안정성)

### 5.1 헬스체크 엔드포인트
- [x] `GET /health` 엔드포인트 (이미 구현됨)
  - 응답: `{"status": "ok"}`

### 5.2 로깅 개선
- [x] `print()` → `logging` 모듈로 변경
  - `telegram_service.py`
  - `queue_service.py`

### 5.3 에러 처리
- [x] (선택) 전역 예외 핸들러 추가 — `main.py`에 ValidationError + global exception handler 구현됨
- [ ] (선택) 프로덕션 환경에서 스택 트레이스 숨김

---

## Phase 6: 배포 실행

### 6.1 Backend 배포
```bash
cd backend
fly launch  # 최초 배포
fly deploy  # 이후 배포
```

### 6.2 Frontend 배포
```bash
cd frontend
fly launch  # 최초 배포
fly deploy  # 이후 배포
```

### 6.3 배포 확인
- [ ] Backend API 문서 접근: `https://gary-dashboard-api.fly.dev/docs`
- [ ] Frontend 접근: `https://gary-dashboard-web.fly.dev`
- [ ] GitHub 로그인 테스트
- [ ] 일감 생성/수정/삭제 테스트
- [ ] 작업 요청 → 텔레그램 알림 테스트

---

## 예상 비용 (Fly.io)

| 리소스 | 사양 | 예상 비용 |
|--------|------|----------|
| Backend | shared-cpu-1x, 256MB | 무료 티어 내 |
| Frontend | shared-cpu-1x, 256MB | 무료 티어 내 |
| PostgreSQL | shared-cpu-1x, 256MB, 1GB | ~$1.94/월 |

> Fly.io 무료 티어: 3개 shared-cpu-1x VM, 3GB 영구 스토리지 포함

---

## 참고 명령어

```bash
# Fly.io CLI 설치
brew install flyctl

# 로그인
fly auth login

# PostgreSQL 생성
fly postgres create --name gary-dashboard-db --region nrt --vm-size shared-cpu-1x --initial-cluster-size 1 --volume-size 1

# 앱에 DB 연결
fly postgres attach gary-dashboard-db -a gary-dashboard-api

# 로그 확인
fly logs -a <app-name>

# SSH 접속
fly ssh console -a <app-name>
```
