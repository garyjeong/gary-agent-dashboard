# AGENTS.md — 에이전트 작업 가이드

> 이 문서는 **Claude Code / Cursor Agent** 등 AI 에이전트가 이 프로젝트에서 작업할 때 참고하는 가이드입니다.

---

## 1. 프로젝트 개요

- **프로젝트명**: Gary Agent Dashboard
- **목적**: Jira형 일감 대시보드 + 다중 GitHub 프로젝트 연동 + 작업 큐를 통한 에이전트 자동 작업 + 텔레그램 알림.
- **핵심 흐름**:
  1. 사용자가 대시보드에서 **일감 카드** 생성.
  2. 시스템이 일감 내용 + GitHub 프로젝트 구조를 분석해 **동작 예시** 생성.
  3. 사용자가 **작업 요청** → 작업 큐에 등록.
  4. **에이전트(로컬 워커)** 가 큐에서 일감을 가져와 처리.
  5. 완료 시 **텔레그램 알림** 발송.

---

## 2. 프로젝트 구조 (예상)

```
gary-agent-dashboard/
├── PROJECT.md          # 프로젝트 정의 문서
├── AGENTS.md           # 에이전트 작업 가이드 (본 문서)
├── frontend/           # 프론트엔드 (Next.js/React)
│   ├── src/
│   │   ├── components/ # UI 컴포넌트
│   │   ├── pages/      # 페이지 (App Router 시 app/)
│   │   ├── hooks/      # 커스텀 훅
│   │   ├── services/   # API 호출 로직
│   │   └── styles/     # 스타일
│   └── package.json
├── backend/            # 백엔드 (FastAPI 또는 Node)
│   ├── src/
│   │   ├── routes/     # 라우터/컨트롤러
│   │   ├── services/   # 비즈니스 로직
│   │   ├── models/     # DB 모델/엔티티
│   │   ├── repositories/ # DB 접근 계층
│   │   └── utils/      # 유틸리티
│   └── requirements.txt / package.json
├── worker/             # 로컬 워커 (큐 폴링 + 에이전트 실행)
│   └── ...
└── docker-compose.yml  # (선택) 로컬 개발 환경
```

---

## 3. 코딩 규칙

### 3.1 공통

- **언어**: 한국어 주석/커밋 메시지 권장.
- **Minimal Change**: 필요한 최소 파일/라인만 수정. 전체 파일 재작성 금지.
- **기존 스타일 유지**: 수정 전 해당 영역의 네이밍, import 순서, 폴더 구조를 파악하고 동일 규칙 적용.

### 3.2 프론트엔드

- **React/Next.js** 기반.
- 절대경로 `@/` 사용, 배럴(index) export 권장.
- 서버 상태는 **SWR** 또는 React Query, 전역 클라이언트 상태는 필요 시 Redux/Zustand.
- 토큰/시크릿은 localStorage 저장 금지. 환경변수는 `NEXT_PUBLIC_` 규칙 준수.

### 3.3 백엔드

- **ORM 우선**: Raw Query는 성능 목적일 때만, 사유 명시.
- **패턴 준수**: Repository, Service, DTO, DI(생성자 주입) 기반 구조.
- 트랜잭션 단위 명확히, 커밋/롤백 경계 분리.
- GitHub 토큰·API 키·텔레그램 봇 토큰은 환경변수/시크릿 저장소에만 보관.

### 3.4 테스트

- 사용자가 **"테스트"** 를 명시적으로 요청할 때만 테스트 코드 작성.
- 테스트 파일은 `tests/` 폴더 하위에만 생성.

---

## 4. 에이전트 작업 흐름

### 4.1 큐에서 일감 가져오기

1. `GET /queue/next` 호출 → 다음 처리할 큐 항목 수신(상태가 "처리중"으로 변경됨).
2. 응답 예시:
   ```json
   {
     "id": "queue-123",
     "issueId": "issue-456",
     "title": "로그인 API 버그 수정",
     "description": "...",
     "behaviorExample": "1. src/routes/auth.ts 수정\n2. 테스트 실행\n3. PR 생성",
     "repo": "garyjeong/some-project",
     "priority": "high",
     "status": "in_progress"
   }
   ```

### 4.2 작업 수행

- **behaviorExample** 필드를 참고해 작업 순서·범위 결정.
- 필요 시 해당 GitHub 리포를 clone/pull 후 브랜치 생성.
- 코드 수정 → (요청 시) 테스트 → 커밋 → (요청 시) PR 생성.

### 4.3 완료 보고

1. 작업 완료 후 `PATCH /queue/:id` 호출:
   ```json
   {
     "status": "completed",
     "result": "PR #42 생성 완료. https://github.com/..."
   }
   ```
2. 실패 시:
   ```json
   {
     "status": "failed",
     "result": "에러 메시지 또는 실패 사유"
   }
   ```
3. 서버가 완료 상태를 받으면 **텔레그램 알림** 발송.

---

## 5. 커밋·브랜치 규칙

- **브랜치 네이밍**: `feature/<issue-id>-<짧은설명>`, `fix/<issue-id>-<짧은설명>` 등.
- **커밋 메시지**: 한국어 요약 1줄 + (선택) 본문.
  - 예: `fix: 로그인 API 토큰 검증 오류 수정`
- **PR 생성 시**: 제목에 일감 ID 포함, 본문에 변경 요약 + 테스트 계획.

---

## 6. 주의사항

- **시크릿 노출 금지**: 코드/로그/커밋에 토큰·API 키·PII 포함하지 않는다.
- **추측 구현 금지**: 정보가 부족하면 질문하거나, 큐 API로 "실패" 상태 + 사유 반환.
- **문서 우선**: 작업 전 PROJECT.md, README.md, 기존 코드 스타일 확인 후 진행.
- **서버 실행 금지**: 사용자가 명시적으로 요청하지 않는 한 서버를 실행하지 않는다.

---

## 7. 참고 문서

- [PROJECT.md](./PROJECT.md) — 프로젝트 목적, 기능 정의, 구현 방식 상세.
