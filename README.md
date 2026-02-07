# Gary Agent Dashboard

Jira 스타일의 일감(이슈/태스크) 관리 대시보드로, 다중 GitHub 프로젝트와 연동하여 에이전트(Claude Code, Cursor Agent 등)에게 작업을 자동으로 할당하고 관리합니다. 작업 완료 시 텔레그램 알림을 발송합니다.

---

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| **백엔드** | Python | 3.12+ |
| | FastAPI | 0.115.0 |
| | SQLAlchemy | 2.0.36 |
| | Pydantic | 2.10.0 |
| | asyncpg | 0.30.0 |
| | PyJWT | 2.9.0 |
| | httpx | 0.28.0 |
| **프론트엔드** | Next.js | 16 |
| | React | 19 |
| | TypeScript | 5.7 |
| | Tailwind CSS | 3.4 |
| | Zustand | 5.0 |
| | SWR | 2.3 |
| | @dnd-kit | 6.3 |
| **데이터베이스** | PostgreSQL | 16 |
| **인프라** | Docker Compose | (개발 환경 DB) |

---

## 사전 요구사항

- **Python** 3.12 이상
- **Node.js** 20 이상
- **PostgreSQL** 15 이상 (또는 Docker)
- **Git**

---

## 환경 설정

### 1. 저장소 클론

```bash
git clone https://github.com/garyjeong/gary-agent-dashboard.git
cd gary-agent-dashboard
```

### 2. 데이터베이스 설정

PostgreSQL을 직접 실행하거나, Docker Compose를 사용합니다.

**Docker Compose 사용 (권장):**

```bash
docker-compose up -d
```

이 명령으로 PostgreSQL 16 컨테이너가 실행됩니다 (사용자: `gary`, 비밀번호: `gary1234`, DB: `dashboard`, 포트: `5432`).

**직접 설치한 PostgreSQL 사용:**

```bash
createdb dashboard
```

### 3. 백엔드 설정

```bash
cd backend

# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일을 편집하여 환경변수를 설정합니다
```

### 4. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 편집하여 API URL을 설정합니다
```

### 5. 실행

**백엔드 실행:**

```bash
cd backend
source venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**프론트엔드 실행:**

```bash
cd frontend
npm run dev
```

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서 (Swagger): http://localhost:8000/api/docs
- API 문서 (ReDoc): http://localhost:8000/api/redoc

---

## 환경변수 참조

### 백엔드 (`backend/.env`)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `sqlite+aiosqlite:///./data/app.db` |
| `JWT_SECRET_KEY` | JWT 토큰 서명 비밀키 | `change-me-in-production` |
| `JWT_ALGORITHM` | JWT 알고리즘 | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 액세스 토큰 만료 시간 (분) | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 리프레시 토큰 만료 시간 (일) | `7` |
| `GITHUB_CLIENT_ID` | GitHub OAuth 앱 Client ID | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth 앱 Client Secret | |
| `GEMINI_API_KEY` | Google Gemini API Key | |
| `API_KEY` | 큐 API 인증용 API Key | |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 | |
| `TELEGRAM_CHAT_ID` | 텔레그램 채팅 ID | |
| `CORS_ORIGINS` | CORS 허용 오리진 (쉼표 구분) | `http://localhost:3000` |
| `HOST` | 서버 호스트 | `0.0.0.0` |
| `PORT` | 서버 포트 | `8000` |
| `DEBUG` | 디버그 모드 | `false` |

### 프론트엔드 (`frontend/.env.local`)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_URL` | 백엔드 API URL | `http://localhost:8000` |

---

## API 사용 예시

### 인증 (GitHub OAuth)

GitHub OAuth를 통해 로그인합니다.

```bash
# 1. GitHub OAuth 인증 URL 요청
GET /api/auth/github/login

# 2. GitHub에서 인증 후 콜백
GET /api/auth/github/callback?code={authorization_code}

# 3. 응답으로 JWT 토큰 수신
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}

# 4. 이후 API 요청 시 Authorization 헤더에 토큰 포함
Authorization: Bearer {access_token}
```

### 일감 CRUD

```bash
# 일감 목록 조회 (필터/정렬/페이지네이션)
GET /api/issues?status=todo&priority=high&page=1&limit=20

# 일감 생성
POST /api/issues
Content-Type: application/json
{
  "title": "로그인 API 버그 수정",
  "description": "OAuth 콜백에서 토큰 갱신 실패",
  "priority": "high",
  "status": "todo",
  "repo": "garyjeong/some-project",
  "label_ids": [1, 2]
}

# 일감 상세 조회
GET /api/issues/{id}

# 일감 수정
PATCH /api/issues/{id}
Content-Type: application/json
{
  "status": "in_progress"
}

# 일감 삭제
DELETE /api/issues/{id}
```

### 작업 큐 관리

```bash
# 작업 요청 등록 (일감을 큐에 추가, 담당 에이전트 타입 지정 가능)
POST /api/issues/{id}/work-request
Content-Type: application/json
{
  "assigned_agent_type": "claude_code"   # 선택: gemini_pro, claude_code 등
}

# 다음 처리할 큐 항목 조회 (에이전트/워커 전용, agent_type 필터)
GET /api/queue/next?agent_type=claude_code
X-API-Key: {api_key}

# 큐 항목 상태 업데이트
PATCH /api/queue/{id}
X-API-Key: {api_key}
Content-Type: application/json
{
  "status": "completed",
  "result": "PR #42 생성 완료"
}

# 워커용 리포 분석 결과 조회 (기본 분석 + 심층 분석)
GET /api/queue/repo-analysis/{owner}/{repo}
X-API-Key: {api_key}

# 큐 통계 조회
GET /api/queue/stats
```

### GitHub 연동

```bash
# 연결된 리포지토리 목록 조회
GET /api/github/repos

# 리포지토리 이슈 목록 조회
GET /api/github/repos/{owner}/{repo}/issues
```

---

## 프로젝트 구조

```
gary-agent-dashboard/
├── README.md                 # 프로젝트 설명 (본 문서)
├── CONTRIBUTING.md           # 기여 가이드
├── AGENTS.md                 # 에이전트 작업 가이드
├── PROJECT.md                # 프로젝트 정의 문서
├── TODO.md                   # 개발 진행 체크리스트
├── docker-compose.yml        # 로컬 PostgreSQL 컨테이너
│
├── backend/                  # 백엔드 (Python/FastAPI)
│   ├── requirements.txt      # Python 의존성
│   ├── src/
│   │   ├── main.py           # FastAPI 앱 엔트리포인트
│   │   ├── config.py         # 환경변수 설정 (Pydantic Settings)
│   │   ├── database.py       # SQLAlchemy 비동기 DB 연결
│   │   ├── auth.py           # JWT 인증 유틸리티
│   │   ├── crypto.py         # 토큰 암호화 (Fernet)
│   │   ├── dependencies.py   # FastAPI 의존성 주입
│   │   ├── http_client.py    # httpx 클라이언트 설정
│   │   ├── models/           # SQLAlchemy ORM 모델
│   │   │   ├── issue.py      # 일감 모델
│   │   │   ├── label.py      # 라벨 모델
│   │   │   ├── connected_repo.py # 연결된 리포 + 분석 결과 모델
│   │   │   ├── queue_item.py # 큐 항목 모델 (assigned_agent_type 포함)
│   │   │   ├── setting.py    # 설정 모델
│   │   │   └── user.py       # 사용자 모델
│   │   ├── schemas/          # Pydantic 스키마 (요청/응답)
│   │   │   ├── auth.py       # 인증 스키마
│   │   │   ├── error.py      # 에러 응답 스키마
│   │   │   ├── github.py     # GitHub 스키마
│   │   │   ├── issue.py      # 일감 스키마
│   │   │   ├── label.py      # 라벨 스키마
│   │   │   ├── queue.py      # 큐 스키마
│   │   │   └── settings.py   # 설정 스키마
│   │   ├── routes/           # API 라우터
│   │   │   ├── auth.py       # 인증 (GitHub OAuth, JWT)
│   │   │   ├── github.py     # GitHub 연동
│   │   │   ├── issues.py     # 일감 CRUD
│   │   │   ├── labels.py     # 라벨 관리
│   │   │   ├── queue.py      # 작업 큐
│   │   │   └── settings.py   # 텔레그램 템플릿 설정
│   │   ├── repositories/     # DB 접근 계층
│   │   │   ├── issue_repository.py
│   │   │   └── queue_repository.py
│   │   ├── services/         # 비즈니스 로직
│   │   │   ├── behavior_generator.py  # 동작 예시 자동 생성
│   │   │   ├── gemini_service.py      # Gemini AI 분석 (Flash/Pro)
│   │   │   ├── github_service.py      # GitHub API 연동
│   │   │   ├── issue_service.py       # 일감 비즈니스 로직
│   │   │   ├── queue_service.py       # 큐 비즈니스 로직
│   │   │   └── telegram_service.py    # 텔레그램 알림
│   │   └── types/            # 타입 정의
│   │       └── github.py     # GitHub API 응답 타입
│   └── tests/                # 백엔드 테스트
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_issue_service.py
│       └── test_queue_service.py
│
├── frontend/                 # 프론트엔드 (Next.js/React)
│   ├── package.json
│   ├── playwright.config.ts  # E2E 테스트 설정
│   ├── e2e/                  # E2E 테스트 (Playwright)
│   │   └── app.spec.ts
│   └── src/
│       ├── app/              # Next.js App Router
│       │   ├── layout.tsx    # 루트 레이아웃
│       │   ├── page.tsx      # 메인 페이지 (대시보드)
│       │   ├── providers.tsx # 전역 프로바이더
│       │   ├── globals.css   # 전역 스타일
│       │   ├── login/        # 로그인 페이지
│       │   ├── auth/callback/ # OAuth 콜백
│       │   ├── issues/       # 일감 관리 페이지
│       │   ├── github/       # GitHub 연동 페이지
│       │   └── settings/     # 설정 페이지
│       ├── components/       # React 컴포넌트
│       │   ├── ui/           # 공통 UI (Button, Input, Modal, Toast 등)
│       │   ├── layout/       # 레이아웃 (Header, Sidebar)
│       │   └── issues/       # 일감 관련 (Board, Card, Column, Modal)
│       ├── hooks/            # 커스텀 훅
│       │   ├── useAuth.ts    # 인증 상태
│       │   ├── useIssues.ts  # 일감 데이터 (SWR)
│       │   ├── useLabels.ts  # 라벨 데이터
│       │   └── useRepos.ts   # 리포지토리 데이터
│       ├── lib/              # 유틸리티
│       │   ├── fetcher.ts    # API 클라이언트
│       │   ├── store.ts      # Zustand 전역 상태
│       │   └── timeUtils.ts  # 시간 유틸리티
│       ├── services/         # API 호출 로직
│       │   └── issueService.ts
│       └── types/            # TypeScript 타입 정의
│           ├── auth.ts
│           ├── error.ts
│           ├── github.ts
│           ├── issue.ts
│           └── queue.ts
│
└── worker/                   # 로컬 워커 (큐 폴링 + 에이전트 실행)
    ├── main.py               # 워커 엔트리포인트
    ├── api_client.py         # 백엔드 API 클라이언트
    ├── agent.py              # 에이전트 실행기
    ├── config.py             # 워커 설정
    └── requirements.txt      # 워커 의존성
```

---

## 핵심 흐름

1. **GitHub OAuth 로그인** -- 사용자가 GitHub 계정으로 인증합니다.
2. **프로젝트 연결 + 기본 분석** -- GitHub 리포를 연결하면 **Gemini Flash**가 리포 트리·주요 파일을 자동 분석합니다.
3. **심층 분석** -- **Gemini Pro**가 소스 코드 품질/보안/성능을 분석하고 개선 제안을 생성합니다.
4. **일감 생성** -- 대시보드에서 일감 카드를 생성하면, **Gemini Flash**가 프로젝트 구조를 기반으로 작업 계획(동작 예시)을 자동 생성합니다.
5. **드래그 앤 드롭** -- 일감 카드를 드래그하여 상태를 변경합니다 (Todo -> In Progress -> Done).
6. **작업 요청** -- 일감에 대한 작업 요청을 등록하면, 담당 에이전트 타입(`assigned_agent_type`)과 함께 작업 큐에 추가됩니다.
7. **에이전트 처리** -- 로컬 워커가 `agent_type` 필터로 자신의 큐 항목을 가져와 **Claude Code**로 자동 처리합니다.
8. **텔레그램 알림** -- 작업 완료 시 설정된 텔레그램 봇으로 알림을 발송합니다.

---

## 라이선스

이 프로젝트는 비공개 프로젝트입니다.
