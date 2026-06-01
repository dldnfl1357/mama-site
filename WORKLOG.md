# 작업일지

## 2026-06-02 — frontend 부트스트랩

### 한 일

**1. 프로젝트 초기 구성**
- `frontend/`에 Vite + React 18 + TypeScript(strict) 스캐폴드
- 의존성: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`
- 별도 라우터·상태관리 라이브러리 미도입 (탭 2개라 `useState`로 충분)

**2. 화면 구현 — 탭 2개로 분리**
- `매매일지` (`src/pages/JournalPage.tsx`)
  - 날짜 선택기 (`<input type="date">`, 미래 날짜 차단)
  - 기록된 날짜 pill row (`/api/journals/dates` 기반, 실패해도 무시)
  - 요약 카드: 매수 건수·금액 / 매도 건수·금액 / 순현금흐름
  - 거래 테이블: 시각 · 종목 · 매수/매도 배지 · 수량 · 단가 · 거래대금 · 사유
- `계좌잔고` (`src/pages/BalancePage.tsx`)
  - KPI 카드: 순자산 / 예수금 / 총평가 / 평가손익(+수익률, 손익에 따라 색상)
  - 보유종목 테이블: 종목 · 수량 · 평균단가 · 현재가 · 평가금액 · 평가손익 · 수익률
  - 모의투자/실계좌 chip, 수동 새로고침 버튼

**3. 반응형·테마**
- `prefers-color-scheme`로 다크 모드 자동 전환 (CSS variable 토큰 한 벌)
- 한국 증시 색상 컨벤션: 상승·매수 = 빨강, 하락·매도 = 파랑
- ≤720px에서 테이블이 카드 그리드로 변형 (`data-label` 기반)
- 숫자는 `font-variant-numeric: tabular-nums` + monospace로 정렬

**4. API 계약(프론트엔드 가정 — 백엔드 미구현)**
```
GET /api/journals?date=YYYY-MM-DD   → JournalEntry[]
GET /api/journals/dates             → string[]   (선택, 실패 무시)
GET /api/account/balance            → BalanceSummary
```
타입은 `src/types.ts`에 정의. Vite dev 서버가 `/api`를 `localhost:8080`으로 프록시.
엔드포인트 부재 시 친화적 에러 패널 표시.

**5. 검증**
- `npm run typecheck` ✓
- `npm run build` ✓ — 출력 151 kB JS (gzip 48.67 kB), 9.2 kB CSS
- `npm run dev` → `http://localhost:5173/` HTTP 200, 한국어 HTML 정상 서빙

**6. Git / 원격**
- `frontend/`를 독립 git repo로 초기화 (`main` 브랜치)
- 초기 커밋 `26cd7ec` — Vite + React 스캐폴드 + 두 페이지
- `origin = https://github.com/dldnfl1357/mama-site.git` (토큰 없는 클린 URL)
- force push로 `mama-site.git`을 frontend-only 히스토리로 정리
- `.git/config` 토큰 잔존 없음 (감사 완료)

### 사고 친 거 / 배운 거

- 처음에 backend 영역까지 손댔다가(`MamaProperties`의 `@NotBlank` 제거, `journal/`·`kis/` 패키지 추가) 사용자 지시로 전부 롤백.
  - **교훈**: "프론트엔드 만들어줘" 요청에 backend 스키마·컨트롤러 추가는 과한 결정. 프론트는 가정된 API 계약에 fetch만 걸고, 백엔드 wiring은 별도 작업으로 분리해야 한다.
- 최상위 repo에서 `git push -u <URL>`을 했더니 `branch.main.remote`에 토큰 포함 URL이 저장되는 사고. 발견 즉시 `branch.main.remote = origin`으로 재설정해 정리.
  - **교훈**: 토큰을 push에 쓸 때는 `-u` 금지. 푸시는 ad-hoc URL로 한 번에 끝내고, upstream은 `git branch --set-upstream-to=origin/main`로 따로 묶기.

### 다음에 할 일

- [ ] **백엔드 wiring** (mama backend repo 영역)
  - `kis/` 패키지: 토큰 캐시 + `inquire-balance` 호출(VTTC8434R, 모의투자 기본)
  - `journal/` 패키지: 매매 실행 로그 저장소(in-memory부터) + 컨트롤러 3종
  - `JournalEntry` 직렬화 포맷이 `src/types.ts`와 일치하는지 검증
- [ ] **CI**: `frontend/`에 typecheck + build를 도는 GitHub Actions
- [ ] **인증/접근 제어**: 단일 사용자 전제라도 외부 노출 시 최소 토큰 필요
- [ ] **GitHub PAT 폐기**: 이번 세션에서 채팅에 노출된 `ghp_…` 토큰은 즉시 회전

### 작업 메모

- 백엔드 분리 후의 디렉토리 가정:
  ```
  /Users/woori/projects/mama/
    backend/   ← mama.git (Spring Boot)
    frontend/  ← mama-site.git (Vite + React)  ← 이 repo
  ```
- 최상위 mama repo에는 내가 만든 커밋 `26d0781`이 남아 있고 frontend 내용이 섞여 있음. 정리 방향이 정해지면 별도로 처리.
