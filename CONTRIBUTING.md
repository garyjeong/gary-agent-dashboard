# 기여 가이드

Gary Agent Dashboard 프로젝트에 기여해 주셔서 감사합니다. 이 문서는 프로젝트의 코딩 규칙, Git 워크플로우, 테스트 가이드를 설명합니다.

---

## 시작하기

### 개발 환경 설정

1. 저장소를 클론합니다.

```bash
git clone https://github.com/garyjeong/gary-agent-dashboard.git
cd gary-agent-dashboard
```

2. 백엔드와 프론트엔드를 각각 설정합니다. 상세 설정 방법은 [README.md](./README.md)를 참고하세요.

3. 새 브랜치를 생성하고 작업합니다.

```bash
git checkout -b feature/내-기능-설명
```

---

## 코드 스타일 가이드

### Python (백엔드)

- **PEP 8** 스타일을 따릅니다.
- 모든 비동기 함수에 **async/await** 패턴을 사용합니다.
- 함수 인자와 반환값에 **타입 힌트**를 반드시 작성합니다.
- 데이터 검증에는 **Pydantic** 모델을 사용합니다.
- ORM을 우선으로 사용하며, Raw Query는 성능 목적일 때만 사유를 명시하여 사용합니다.
- import 순서: 표준 라이브러리 -> 서드파티 -> 로컬 모듈

```python
# 좋은 예
async def get_issue(issue_id: int, db: AsyncSession) -> IssueResponse:
    """일감 상세 조회"""
    issue = await issue_repository.find_by_id(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="일감을 찾을 수 없습니다")
    return IssueResponse.model_validate(issue)

# 나쁜 예 (타입 힌트 누락, docstring 없음)
async def get_issue(issue_id, db):
    issue = await issue_repository.find_by_id(db, issue_id)
    return issue
```

### TypeScript (프론트엔드)

- **strict 모드**를 사용합니다.
- **named export**를 기본으로 사용합니다 (default export는 페이지 컴포넌트에서만).
- **함수형 컴포넌트**만 사용합니다 (클래스 컴포넌트 사용 금지).
- 절대경로 `@/`를 사용합니다.
- 배럴(index) export를 권장합니다.

```typescript
// 좋은 예
export function IssueCard({ issue, onStatusChange }: IssueCardProps) {
  const { mutate } = useIssues();
  // ...
}

// 나쁜 예 (default export, any 타입)
export default function IssueCard(props: any) {
  // ...
}
```

### CSS (스타일링)

- **Tailwind CSS** utility-first 방식을 사용합니다.
- 커스텀 CSS는 최소화하고, Tailwind 유틸리티 클래스를 우선 사용합니다.
- 반복되는 스타일 조합은 컴포넌트로 추출합니다.
- clsx 라이브러리로 조건부 클래스를 관리합니다.

```tsx
// 좋은 예
<button className={clsx(
  'px-4 py-2 rounded-md text-sm font-medium',
  variant === 'primary' && 'bg-primary-600 text-white',
  variant === 'secondary' && 'bg-gray-100 text-gray-700',
  disabled && 'opacity-50 cursor-not-allowed'
)}>
  {children}
</button>
```

---

## Git 워크플로우

### 브랜치 네이밍 규칙

| 접두사 | 용도 | 예시 |
|--------|------|------|
| `feature/` | 새 기능 개발 | `feature/drag-and-drop` |
| `fix/` | 버그 수정 | `fix/login-token-refresh` |
| `refactor/` | 코드 리팩토링 | `refactor/issue-repository` |
| `docs/` | 문서 작업 | `docs/api-usage-guide` |

### 커밋 메시지 형식

```
type: 설명

[선택] 본문 (변경 이유, 상세 내용)
```

**type 목록:**

| type | 설명 |
|------|------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 코드 리팩토링 (기능 변경 없음) |
| `docs` | 문서 추가/수정 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정, 의존성 등 기타 작업 |

**예시:**

```
feat: 드래그 앤 드롭으로 일감 상태 변경 기능 추가
fix: OAuth 콜백에서 토큰 갱신 실패 문제 수정
refactor: 이슈 리포지토리 쿼리 최적화
docs: API 사용 예제 추가
test: 큐 서비스 단위 테스트 작성
chore: Playwright E2E 테스트 설정 추가
```

### Pull Request 프로세스

1. 작업 브랜치에서 변경사항을 커밋합니다.
2. `main` 브랜치로 Pull Request를 생성합니다.
3. PR 제목은 커밋 메시지 형식을 따릅니다.
4. PR 본문에 변경 요약과 테스트 계획을 작성합니다.
5. 코드 리뷰를 받은 후 머지합니다.

**PR 본문 템플릿:**

```markdown
## 변경 사항
- 변경 내용 요약

## 테스트 계획
- [ ] 테스트 항목 1
- [ ] 테스트 항목 2
```

---

## 테스트

### 백엔드 테스트 (pytest)

백엔드 테스트는 `backend/tests/` 디렉토리에 작성합니다.

```bash
cd backend
source venv/bin/activate

# 테스트 의존성 설치
pip install -r requirements-dev.txt

# 전체 테스트 실행
pytest

# 특정 파일 테스트
pytest tests/test_issue_service.py

# 상세 출력
pytest -v
```

**테스트 파일 구조:**

```
backend/tests/
├── conftest.py              # 공통 픽스처 (DB 세션, 테스트 데이터)
├── test_auth.py             # 인증 테스트
├── test_issue_service.py    # 일감 서비스 테스트
└── test_queue_service.py    # 큐 서비스 테스트
```

### 프론트엔드 테스트 (Jest + React Testing Library)

프론트엔드 단위 테스트는 `frontend/src/__tests__/` 또는 각 컴포넌트와 같은 디렉토리에 작성합니다.

```bash
cd frontend

# 테스트 실행
npm test

# Watch 모드
npm test -- --watch
```

### E2E 테스트 (Playwright)

E2E 테스트는 `frontend/e2e/` 디렉토리에 작성합니다.

```bash
cd frontend

# Playwright 브라우저 설치 (최초 1회)
npx playwright install

# E2E 테스트 실행
npm run e2e

# 브라우저를 띄워서 실행
npm run e2e:headed

# 특정 파일만 실행
npx playwright test e2e/app.spec.ts

# 테스트 리포트 보기
npx playwright show-report
```

**테스트 작성 예시:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('일감 관리', () => {
  test('일감 목록이 표시되어야 한다', async ({ page }) => {
    await page.goto('/issues');
    await expect(page.locator('[data-testid="issue-board"]')).toBeVisible();
  });
});
```

---

## 아키텍처 개요

### 백엔드 레이어 구조

```
Route (라우터) -> Service (비즈니스 로직) -> Repository (DB 접근)
```

- **Route**: HTTP 요청/응답 처리, 입력 검증 (Pydantic 스키마)
- **Service**: 비즈니스 로직 처리, 트랜잭션 관리
- **Repository**: 순수 DB 접근 로직 (SQLAlchemy ORM)

### 프론트엔드 구조

```
Page (App Router) -> Component -> Hook -> Service/API
```

- **Page**: Next.js App Router 페이지 (`src/app/`)
- **Component**: 재사용 가능한 UI 컴포넌트 (`src/components/`)
- **Hook**: 데이터 페칭 및 상태 관리 (`src/hooks/`)
- **Service**: API 호출 로직 (`src/services/`)
- **Store**: 전역 클라이언트 상태 (`src/lib/store.ts`, Zustand)

### 주요 데이터 흐름

```
사용자 조작
  -> React 컴포넌트 이벤트
    -> Custom Hook (SWR mutate)
      -> API 호출 (fetcher)
        -> FastAPI Route
          -> Service
            -> Repository
              -> PostgreSQL
```

---

## 주의사항

- **시크릿 노출 금지**: 코드, 로그, 커밋에 토큰, API 키, 개인정보를 포함하지 마세요.
- **환경변수**: 프론트엔드에서 사용하는 환경변수는 반드시 `NEXT_PUBLIC_` 접두사를 붙여야 합니다.
- **최소 변경 원칙**: 필요한 최소한의 파일과 라인만 수정하세요. 전체 파일을 재작성하지 마세요.
- **기존 스타일 유지**: 수정 전 해당 영역의 네이밍, import 순서, 폴더 구조를 파악하고 동일한 규칙을 적용하세요.
