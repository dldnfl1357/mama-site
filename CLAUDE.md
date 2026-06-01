# CLAUDE.md

이 파일은 Claude Code(또는 모든 AI 코딩 도구)가 `mama-site` 프론트엔드 프로젝트에서 작업할 때 따라야 하는 규칙·구조·컨벤션을 정의한다.

---

## 1. 절대 규칙 (Absolute Rules)

**이 규칙들은 어떤 이유로도 무시·우회할 수 없다. 위반이 필요해 보이면 작업을 중단하고 사용자에게 확인을 요청한다.**

1. **프로덕션 DB 직접 쿼리 금지.** 프론트엔드 코드(브라우저 런타임)는 절대 DB에 직접 붙지 않는다. 모든 데이터는 backend의 `/api/...` 엔드포인트를 통해 받는다. SQL·DB 클라이언트 의존성을 추가하는 PR은 거부한다.
2. **시크릿 파일 커밋 금지.** `.env`, `.env.local`, `*.pem`, API 키·토큰·세션 쿠키 값이 들어간 어떤 파일도 절대 `git add` 하지 않는다. `.gitignore`에 누락된 시크릿 파일을 발견하면 즉시 알린다. 토큰을 채팅·코드·커밋 메시지에 평문으로 남기지 않는다.

---

## 2. 아키텍처

```
frontend/
├── index.html              # Vite 진입점 HTML
├── package.json
├── package-lock.json
├── tsconfig.json           # strict: true
├── vite.config.ts          # /api → http://localhost:8080 proxy (dev)
├── .gitignore
├── CLAUDE.md               # ← 이 파일
├── WORKLOG.md              # 작업일지
└── src/
    ├── main.tsx            # React root, StrictMode, 글로벌 CSS import
    ├── App.tsx             # 상단 탭 네비 + 페이지 스위칭
    ├── api.ts              # fetch wrapper (Accept: application/json, 에러 throw)
    ├── types.ts            # JournalEntry, Holding, BalanceSummary 등 API DTO
    ├── format.ts           # KRW · percent · 시간 포매터 (Intl 기반)
    ├── styles.css          # 글로벌 CSS — 변수 토큰, 다크모드, 반응형 카드 변환
    ├── vite-env.d.ts
    └── pages/
        ├── JournalPage.tsx # 매매일지 (날짜별 테이블)
        └── BalancePage.tsx # 계좌잔고 (KPI + 보유종목)
```

**모듈 책임 원칙:**
- `api.ts`는 fetch 어댑터. 비즈니스 로직·상태 보관·재시도 정책을 넣지 않는다.
- `types.ts`는 백엔드 응답 구조의 1:1 거울. 화면 전용 파생 타입은 해당 페이지 안에서 정의.
- `format.ts`는 순수 함수 묶음. React 의존 없음.
- `pages/*`가 상태와 데이터 페치를 보유. 전역 상태 관리 라이브러리(Redux/Zustand 등) 도입 금지(MVP 범위 초과).
- 공용 UI 컴포넌트가 필요해지면 `src/components/`를 만들어 분리. 단, 한 곳에서만 쓰이는 카드/배지는 페이지 파일 내 로컬 컴포넌트로 둔다.

---

## 3. 빌드 & 테스트

### 사전 조건

Node 20+ 권장 (개발 환경: Node 26 / npm 11에서 검증).

### 명령어

| 명령 | 용도 |
|---|---|
| `npm install` | 의존성 설치 (최초 또는 lockfile 변경 후) |
| `npm run dev` | Vite dev 서버 — http://localhost:5173 |
| `npm run typecheck` | `tsc -b --noEmit` 타입체크만 |
| `npm run build` | 타입체크 + 프로덕션 번들 (`dist/`) |
| `npm run preview` | 빌드된 `dist/`를 로컬 정적 서버로 미리보기 |

### 작업 완료 기준

코드 변경 후 다음을 모두 통과한 것을 확인하고 보고한다:
1. `npm run build` 성공 (타입체크 포함)
2. `npm run dev`로 띄워 변경된 화면을 실제 브라우저에서 확인 (`http://localhost:5173`)
3. UI 변경은 반드시 모바일 폭(≤720px)과 데스크톱 폭 양쪽에서 확인 — 테이블 → 카드 변환이 깨지지 않는지

### 백엔드 연동

- dev 서버는 `/api/*` 요청을 `http://localhost:8080`으로 프록시한다.
- 백엔드(별도 repo `mama.git`)가 떠 있지 않으면 fetch는 5xx로 떨어지고 각 페이지의 에러 패널이 표시된다. 이는 정상 동작이며, 백엔드 미동작 자체를 프론트 버그로 보고하지 않는다.

---

## 4. 도메인 컨텍스트

### What

`mama-site`는 **개인용 한국 주식 자동매매 서버(`mama` 백엔드)의 모니터링 UI**다. 매매 실행은 백엔드(KIS API)가 담당하고, 본 프론트엔드는 **읽기 전용 콘솔**로 시작한다.

```
[KIS · DART · Claude]
       │
   mama backend (Spring Boot, mama.git)
       │  /api/journals, /api/account/balance
       ▼
   mama-site frontend (이 repo)
       │
   사용자 (본인 1명)
```

### 두 가지 뷰

1. **매매일지 (`/`, 매매일지 탭)** — 날짜별 매매 기록을 테이블로 확인.
   - 매수/매도 구분, 수량, 단가, 거래대금, 신호 사유
   - 일별 요약(매수 합계 / 매도 합계 / 순현금흐름)
2. **계좌잔고 (계좌잔고 탭)** — KIS 계좌 상태.
   - KPI: 순자산 / 예수금 / 총평가금액 / 평가손익(수익률 포함)
   - 보유종목 테이블: 평균단가 · 현재가 · 평가금액 · 평가손익 · 수익률

### 사용자·규제 컨텍스트

- 사용자 = 본인 1명. 타인에게 신호·서비스 제공 없음 → 투자자문업 라이선스 무관.
- 외부에 호스팅·노출하려면 인증(최소 token gate) 추가 필요. 현재 미구현.

### 시각적 컨벤션 — 한국 증시 색상

- **상승·매수 = 빨강(`--pos`, `--buy`)**
- **하락·매도 = 파랑(`--neg`, `--sell`)**
- US/일반 차트 색상(녹·적)과 반대다. 손익 색상 코드를 바꾸자는 PR은 도메인 컨벤션 위반.

### 도메인 함정 (작업 시 항상 의식)

1. **백엔드는 기본 모의투자(`KIS_PAPER_TRADING=true`).** 실제 잔고가 아닐 수 있다. 프론트에서 `paperTrading` 플래그를 chip으로 표시해 모드를 항상 보이게 한다.
2. **숫자는 KRW 정수.** 소수점 표시·반올림 처리를 임의로 바꾸지 않는다. 모든 통화 표시는 `format.ts`의 `formatKrw` / `formatSignedKrw`를 사용.
3. **잔고·매매일지는 시점 데이터.** "최신" 자동 폴링을 도입하기 전, 새로고침 비용(백엔드 KIS 호출량)을 먼저 검토.

---

## 5. 코딩 컨벤션

표준 React + TypeScript 관행을 따른다. 특수한 규칙을 만들지 않는다.

### 네이밍

| 대상 | 규칙 | 예 |
|---|---|---|
| React 컴포넌트 | PascalCase | `JournalPage`, `BalanceCard` |
| 함수·변수 | camelCase | `fetchJournals`, `loading` |
| 타입·인터페이스 | PascalCase | `JournalEntry`, `Holding` |
| 상수 (모듈 스코프) | UPPER_SNAKE_CASE | `API_BASE`, `MAX_RETRY` |
| 파일 — 컴포넌트 | PascalCase.tsx | `JournalPage.tsx` |
| 파일 — 일반 모듈 | camelCase.ts | `api.ts`, `format.ts` |
| CSS 클래스 | BEM-ish, 케밥 | `.tabs__btn--active`, `.card--pos` |
| CSS 변수 | 케밥, `--` 접두 | `--bg`, `--text-muted` |

### 컴포넌트 패턴

- **함수형 컴포넌트 + Hooks.** 클래스 컴포넌트 금지.
- **Props 타입은 inline 객체** (필드 1~2개) 또는 **별도 `interface Props`** (3개 이상). `React.FC` 사용 금지(children 자동 포함 회피).
- **상태는 페이지 컴포넌트 보유.** 전역 상태 관리 라이브러리·context API 도입 금지(MVP 범위). 진짜 필요해지면 사용자에게 먼저 확인.
- **데이터 페치는 `useEffect` + cancellation 패턴.**
  ```ts
  useEffect(() => {
    let cancelled = false;
    fetchX().then((v) => { if (!cancelled) setX(v); });
    return () => { cancelled = true; };
  }, [deps]);
  ```
- **표시 포맷은 `format.ts` 단일 출처.** 컴포넌트 안에서 즉석 `toLocaleString`·`toFixed` 호출 금지.
- **외부 데이터를 표시하는 화면은 세 상태를 모두 처리한다:** 로딩 / 에러 / 빈 데이터. 각 상태에 사용자가 이해 가능한 메시지를 보여준다.
- **CSS는 글로벌 `styles.css` 중앙 집중.** CSS-in-JS·Tailwind 미도입. styled-components 등 런타임 CSS 라이브러리 추가 금지.

### 커밋 메시지 (Conventional Commits)

```
<type>(<scope>): <subject>

[optional body]
```

- `type`: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `build`, `perf`, `style`
- `scope`: 영역 또는 모듈 (`journal`, `balance`, `layout`, `api`, `deps`, `build`)
- `subject`: 50자 이내, 명령형, 마침표 없음, 한국어 가능
- `body`: 필요할 때만, 변경 이유(Why)를 적는다. 무엇을 했는지는 diff가 말해준다.

**예:**
```
feat(journal): add date picker and summary cards
fix(balance): show signed KRW for negative profit/loss
refactor(format): consolidate currency helpers into format.ts
chore(deps): bump vite to 5.4.11
```

### 주석

- 기본은 **주석을 쓰지 않는다.** 잘 지은 이름·작은 함수가 우선.
- 다음 경우에만 주석을 단다:
  - 외부 제약(예: "KIS API는 1초 1회 호출 제한")
  - 직관과 다른 비즈니스 결정의 이유(예: "한국 증시 색상: 상승=빨강")
  - 우회 코드의 근거
- "이 함수는 X를 한다" 같은 What 주석 금지.

### 의존성 추가

새 npm 패키지를 추가하기 전에 다음 질문을 통과해야 한다:
1. 표준 라이브러리·기존 코드로 해결 가능한가?
2. 번들 크기 영향이 작은가? (현재 빌드는 ~150 kB gzip 50 kB)
3. 유지보수자가 활동 중이고 보안 권고가 깨끗한가?

세 가지가 모두 yes일 때만 추가하고, 커밋 메시지에 도입 이유를 남긴다.
