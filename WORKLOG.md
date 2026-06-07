# 작업일지

## 2026-06-07 — 파이프라인 뷰 구현

### 한 일

- 새 탭 **"파이프라인"** 추가 — backend 도메인(공시→신호→주문 실행)을 한 화면에서 추적하는 읽기 전용 뷰. 06-04 세션에서 작성한 `docs/superpowers/plans/2026-06-04-pipeline-view.md`의 Task 1~7을 순서대로 진행.
- 가상 API 계약 `GET /api/pipeline?date=` / `GET /api/pipeline/dates`. backend는 컨트롤러 미노출 상태라 dev 환경에서 ECONNREFUSED → 5xx로 떨어지며 기존 패턴대로 에러 패널 표시.
- 화면 구성: 날짜 선택 + 수집 날짜 pill row + 요약 카드 4종(공시·신호 분포·실행·스킵) + 테이블(수집시각·종목·공시명·신호·실행) + 행 클릭 시 상세(공시명 전체 + 신호 reasoning + DART 링크) 펼침.
- 색상: BUY=빨강, SELL=파랑(증시 컨벤션), HOLD=회색, EXECUTED=중립 진한 텍스트, SKIPPED=회색, FAILED=`--warn` 오렌지.
- 신규 의존성·전역 상태 라이브러리 없음. 기존 `format.ts` 헬퍼와 `styles.css` 토큰 재사용.
- 커밋 5개로 분할 — types / api / page / styles / App wiring + 본 WORKLOG.

### 검증

- `npm run typecheck` ✓ (각 task 종료 시점마다)
- `npm run build` ✓ — JS 151.66 → 157.38 kB(raw, +5.7 kB), gzip 48.66 → 49.85 kB(+1.2 kB). CSS 9.20 → 11.18 kB(+2 kB).
- `npm run dev` 기동 후 `/`(200), `/src/pages/PipelinePage.tsx`(200), `/src/App.tsx`(200) 응답 확인. `/api/pipeline*` 호출은 ECONNREFUSED → 500 — 에러 패널 경로 동작 조건 충족.
- **픽셀 단위 시각 검증은 미수행** — 헤드리스 브라우저 자동화가 없는 환경이라 실제 렌더 확인은 사용자 브라우저에서 추가 점검 필요.

### 결정 / 메모

- backend의 신호·실행 결과는 영속화돼 있지 않지만 프론트 계약은 **풀 파이프라인** 가정으로 단일 endpoint 설계. 추후 backend 측에서 동일 shape으로 채워 넣으면 곧바로 동작.
- 자동 폴링·정렬·필터·인증 게이트는 의도적으로 미구현 (YAGNI, 외부 API 호출량 함정).
- 단위 테스트 인프라는 그대로 부재. typecheck/build + 브라우저 수동 확인으로 검증.

### 다음에 할 일

- [ ] 사용자가 브라우저에서 신규 탭 클릭 시 에러 패널·요약 카드·테이블 카드 변환(≤720px) 시각 확인.
- [ ] backend가 `/api/pipeline*` 엔드포인트를 노출하면 실데이터로 회귀 확인 (행 클릭 → 상세 펼침, BUY/SELL/HOLD 배지 색).
- [ ] 06-03 세션부터 이월된 항목(GitHub PAT 폐기, CI, 인증/접근 제어)은 그대로 미해결.

## 2026-06-04 — 파이프라인 뷰 설계·계획 (구현 보류)

### 한 일

- 사용자 요청: 상위 폴더 `mama`(backend) 코드를 보고 frontend에 알맞은 기능을 추가.
- backend 점검: `mama/src/main/java/com/serveone/mama/` 트리에 `dart`, `llm`, `signal`, `kis`, `executor` 모듈 존재. 단, **`@RestController` / `@*Mapping` 0개** — 아직 HTTP 엔드포인트를 노출하지 않는 상태. 기존 frontend의 `/api/journals*`, `/api/account/balance`도 backend엔 미구현(가상 계약 위에서 동작 중).
- backend에 있지만 frontend에 없는 도메인 정리: 공시(DART, 영속화), 신호(LLM 결과, 영속화 안 됨), 주문 실행 결과(영속화 안 됨).
- 브레인스토밍 결과 **공시→신호→주문 실행을 한 화면에서 추적하는 "파이프라인" 탭**을 새로 만들기로 결정. 조회 축은 기존 매매일지와 같은 **날짜별 피드**. 계약은 **풀 파이프라인 단일 endpoint** 가정.
- 문서 2종 작성:
  - `docs/superpowers/specs/2026-06-04-pipeline-view-design.md` — 설계 명세 (API 계약, 화면 구성, 색상 컨벤션, 의도적 미구현).
  - `docs/superpowers/plans/2026-06-04-pipeline-view.md` — 7개 task로 분할된 구현 계획 (타입→API→페이지→스타일→탭 연결→브라우저 검증→WORKLOG).

### 결정 / 메모

- **CLAUDE.md 절대 규칙 #1** 재확인: 이 repo에서 backend 작업·계획은 적지 않는다. `/api/pipeline*`은 가상 계약만 정의하고, 미구현 시 기존 패턴대로 에러 패널 표시.
- **단위 테스트 인프라 부재** — `package.json`에 `test` 스크립트 없음. 검증은 `npm run typecheck` + `npm run build` + 브라우저(데스크톱·≤720px) 수동 확인.
- **`--warn` 토큰은 이미 `styles.css:16`에 존재** — spec 초안의 "신규 토큰 1개 추가"는 plan에서 제거.
- 자동 폴링·정렬·필터·인증 게이트는 의도적 미구현 (YAGNI, 외부 API 호출량 함정).
- 색상은 한국 증시 컨벤션 그대로: BUY=빨강, SELL=파랑, HOLD=중립 회색. 실행 상태 배지(EXECUTED/SKIPPED/FAILED)는 증시 색상과 분리해 텍스트·`--warn` 사용.

### 보류 / 다음에 할 일

- [ ] **파이프라인 뷰 구현** — `docs/superpowers/plans/2026-06-04-pipeline-view.md`의 Task 1~7 순서대로 진행.
- [ ] backend가 `/api/pipeline*` 엔드포인트를 노출하면 실데이터로 회귀 확인. 그 시점까지는 새 탭이 에러 패널만 표시.
- [ ] 06-03 세션부터 이월된 항목들(GitHub PAT 폐기, CI, 인증/접근 제어)은 그대로 미해결.

## 2026-06-03 — 문서 범위 정리 (frontend 전용)

### 한 일

- 사용자 지시: "frontend 폴더에서 작업할 때는 backend를 생각하지 말아줘. 모든 문서에 반영해."
- **CLAUDE.md**
  - 절대 규칙 #1로 "이 repo는 frontend 전용" 추가. backend 작업·계획 금지, API 서버는 외부 의존성으로만 참조.
  - "백엔드 연동" 섹션 → "API 서버 연동"으로 리네임. 표현을 외부 시스템 톤으로 통일.
  - 도메인 컨텍스트의 아키텍처 다이어그램에서 backend 박스를 외부 시스템 묶음으로 일반화.
  - 도메인 함정 항목들의 "백엔드" 표현을 "API 서버 / 외부 API"로 정리.
- **WORKLOG.md**
  - "다음에 할 일"에서 "백엔드 wiring" 항목 삭제 (이 repo 범위 밖).
  - "작업 메모"에서 외부 repo 관련 잔존 메모 제거.
  - 부트스트랩 회고에서 backend 패키지 이름을 일반화.

- **UI 에러 패널**
  - `JournalPage.tsx`/`BalancePage.tsx`의 "백엔드 …" 문구를 "API 서버의 …"로 톤 통일.
  - `BalancePage`에서 "KIS 자격증명을 확인하세요" 표현은 외부 시스템 책임이라 삭제.
- **`.gitignore`**: `.claude/` 추가 — 로컬 Claude Code 설정이 untracked로 남는 문제 해결.
- **검증·배포**
  - `npm run build` ✓ — 출력 동일(151.66 kB JS / 9.20 kB CSS).
  - `npm run dev -- --host 0.0.0.0`로 LAN 노출(`http://172.30.1.7:5173/`), 모바일에서 에러 패널 문구·반응형 카드 변환 확인.
  - 커밋 `b9b3821 docs: scope this repo to frontend only` → `origin/main`에 push (ad-hoc URL, `-u` 미사용, git config 토큰 잔존 없음).

### 결정 / 메모

- API 계약(`/api/journals`, `/api/account/balance`) 참조는 유지 — frontend가 호출 대상을 알아야 함. 서버 측 구현·스키마 변경 계획은 이 문서에 적지 않는다.
- LAN 노출(`--host 0.0.0.0`)은 일회성 모바일 점검용. `vite.config.ts`에 상시 host 설정을 박지 않는다(개발 머신을 의도치 않게 같은 Wi-Fi에 노출).

### 사고 친 거 / 배운 거

- **PAT 평문 노출 사고 (2건)**:
  1. `gh auth status --show-token` 출력을 sed로 마스킹할 때 `gh[op]_` 패턴만 잡고 fine-grained PAT(`github_pat_…`)는 누락 → 채팅에 평문 노출.
  2. 위 사고로 push가 막힌 뒤 사용자가 새 classic PAT(`ghp_…`)을 채팅에 붙여 push 진행 → 두 번째 토큰도 평문 잔존.
  - **교훈**: 토큰을 다루는 명령 출력은 마스킹 정규식이 모든 PAT 포맷(`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`)을 커버하는지 사전에 검증. 더 단순하게는 토큰을 출력에 노출시킬 가능성이 있는 명령(`--show-token`) 자체를 피한다.

### 다음에 할 일

- [ ] **GitHub PAT 폐기 (urgent)**: 채팅에 평문 노출된 토큰 3개 모두 revoke 후 새 토큰 발급
  - 06-02 세션: `ghp_…` (당시 push에 사용)
  - 06-03 세션 #1: `github_pat_11AM47RZI0…` (`gh auth status` 출력 마스킹 실패)
  - 06-03 세션 #2: `ghp_3G3fMiad221f8L…` (오늘 push에 사용)
  - 새 fine-grained PAT 발급 시 `dldnfl1357/mama-site`에 **Contents: Read and write** 권한 명시(없으면 push 403)
- [ ] **CI**: `frontend/`에 typecheck + build를 도는 GitHub Actions
- [ ] **인증/접근 제어**: 단일 사용자 전제라도 외부 노출 시 최소 토큰 필요 (frontend 측 처리만)

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

**4. API 계약(프론트엔드가 호출하는 외부 API)**
```
GET /api/journals?date=YYYY-MM-DD   → JournalEntry[]
GET /api/journals/dates             → string[]   (선택, 실패 무시)
GET /api/account/balance            → BalanceSummary
```
타입은 `src/types.ts`에 정의. Vite dev 서버가 `/api`를 `localhost:8080`으로 프록시.
서버가 응답하지 않으면 친화적 에러 패널 표시.

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

- 처음에 frontend 작업 요청에 외부 시스템 영역까지 손댔다가 사용자 지시로 전부 롤백.
  - **교훈**: "프론트엔드 만들어줘" 요청은 frontend repo 안에서만 해결한다. 프론트는 가정된 API 계약에 fetch만 걸고, 그 너머는 이 repo 작업 범위가 아니다.
- 최상위 repo에서 `git push -u <URL>`을 했더니 `branch.main.remote`에 토큰 포함 URL이 저장되는 사고. 발견 즉시 `branch.main.remote = origin`으로 재설정해 정리.
  - **교훈**: 토큰을 push에 쓸 때는 `-u` 금지. 푸시는 ad-hoc URL로 한 번에 끝내고, upstream은 `git branch --set-upstream-to=origin/main`로 따로 묶기.
