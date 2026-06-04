# 파이프라인 뷰 설계 (mama-site frontend)

작성일: 2026-06-04

## 목적

mama backend의 도메인(공시 → 신호 → 주문 실행) 흐름을 사용자가 한 화면에서 추적할 수 있는 **읽기 전용 파이프라인 뷰**를 frontend에 추가한다. 기존 두 탭(매매일지·계좌잔고)을 건드리지 않고 세 번째 탭으로 공존시킨다.

## 비목표

- backend의 코드·스키마·엔드포인트 추가 계획을 이 문서에 적지 않는다(CLAUDE.md 절대 규칙 #1). 가상 계약만 정의하고, backend 미구현 시 프론트가 에러 패널을 표시하는 기존 패턴을 그대로 따른다.
- 정렬·필터·검색·자동 폴링·인증/토큰 게이트는 본 작업 범위 밖.
- 단위 테스트 인프라 도입은 본 작업 범위 밖(현재 `package.json`에 `test` 스크립트 없음).

## 아키텍처

- 새 탭 **"파이프라인"** 추가. 기존 매매일지·계좌잔고 그대로 유지.
- 새 페이지: `src/pages/PipelinePage.tsx`. 페이지 컴포넌트가 상태와 데이터 페치를 보유한다. 전역 상태 관리 도입 없음.
- 라우팅·탭 전환은 기존 `App.tsx`의 `Tab` 유니온·`TABS` 배열·삼항 분기에 항목 1개 추가하는 방식.
- CSS는 글로벌 `src/styles.css`에 추가(기존 토큰·BEM-ish 네이밍 유지). 신규 토큰 1개: `--warn`(주문 실패 경고색).

## API 계약 (가상)

```
GET /api/pipeline?date=YYYY-MM-DD → PipelineRow[]
GET /api/pipeline/dates           → string[]   (선택, 실패 무시 — 기존 /api/journals/dates 패턴)
```

`PipelineRow`:

```ts
type SignalAction = "BUY" | "SELL" | "HOLD";
type ExecutionStatus = "EXECUTED" | "SKIPPED" | "FAILED";

interface Disclosure {
  rceptNo: string;          // PK
  stockCode: string | null; // 비상장사는 null
  corpName: string;
  reportName: string;
  rceptDt: string;          // YYYY-MM-DD
  fetchedAt: string;        // ISO timestamp
  dartUrl: string | null;
}

interface SignalDto {
  action: SignalAction;
  confidence: number;       // 0~1
  reasoning: string;
  generatedAt: string;
}

interface ExecutionDto {
  status: ExecutionStatus;
  orderNo: string | null;
  skipReason: string | null;
  executedAt: string | null;
  errorMessage: string | null;
}

interface PipelineRow {
  disclosure: Disclosure;
  signal: SignalDto | null;     // 신호 미생성 = null
  execution: ExecutionDto | null; // 주문 실행 시도 없음 = null
}
```

타입은 `src/types.ts`에 추가. 기존 DTO와 같은 모듈에 두되 새 타입은 파일 하단에 묶는다.

### backend 미구현 시 동작

`/api/pipeline*`이 5xx로 떨어지면 페이지의 에러 패널이 표시된다. 이는 정상 동작이며, backend 변경이 필요하다는 신호. 별도 mocking·feature flag를 두지 않는다.

## 화면 구성

### 상단 컨트롤

- 날짜 선택(`<input type="date">`, `max=오늘`).
- 수집된 날짜 pill row — `/api/pipeline/dates` 호출. 실패 시 행 자체 숨김(기존 매매일지 패턴 동일).
- 새로고침 버튼.

### 요약 카드 (4개)

- 공시 N건 (전체 행 수)
- 신호 분포: `BUY x · SELL y · HOLD z` (signal이 null이 아닌 행만 카운트)
- 실행 N건 (`execution.status === "EXECUTED"`)
- 스킵 N건 (`execution.status === "SKIPPED"` 만 카운트. HOLD·저신뢰 등으로 executor가 스킵한 명시적 케이스. `execution == null`은 "실행 시도 자체 없음"이라 별도 의미고 카운트에 섞지 않는다.)

### 메인 테이블

| 컬럼 | 내용 |
|---|---|
| 수집시각 | `fetchedAt` HH:mm |
| 종목 | `stockCode` + `corpName` (코드 없으면 회사명만, `data-label`은 "종목") |
| 공시명 | `reportName` (긴 텍스트는 줄임표; 행 펼침 시 전체 보임) |
| 신호 | 배지 + `confidence%`. null이면 "—" |
| 실행 | 배지 + `orderNo` 또는 `skipReason` 또는 `errorMessage`. null이면 "—" |

#### 행 펼침

행 클릭 시 아래 영역 펼침:
- 공시명 전체 텍스트
- `signal.reasoning` 전체 텍스트(있을 때)
- `dartUrl`이 있으면 "DART에서 보기" 링크(새 탭)

펼침은 페이지 로컬 상태(현재 펼친 `rceptNo` 한 개만).

### 상태 처리 (3종)

- 로딩 — 기존 페이지의 로딩 표시 패턴 재사용.
- 에러 — "API 서버의 …" 톤 패널.
- 빈 데이터 — "이 날짜에 수집된 공시가 없습니다."

### 반응형 (≤720px)

테이블 → 카드 그리드로 변환. `data-label` 기반 — 기존 styles.css 패턴 재사용. 행 펼침 영역은 카드 내부 하단에 배치.

## 색상 (한국 증시 컨벤션 준수)

- 신호 배지
  - BUY: `--buy`(빨강) — 기존 토큰
  - SELL: `--sell`(파랑) — 기존 토큰
  - HOLD: 회색 중립 — 기존 `--text-muted` 또는 신규 토큰 없이 처리
- 실행 상태 배지(증시 색상과 충돌 방지)
  - EXECUTED: 강조 텍스트(`--text` 또는 동일 톤)
  - SKIPPED: 중립 회색
  - FAILED: **신규 토큰** `--warn` (오렌지 계열) — 다크·라이트 모두 정의

## 코드 변경 (요약)

- 추가: `src/pages/PipelinePage.tsx`
- 수정:
  - `src/types.ts` — 새 타입 5개 추가
  - `src/api.ts` — `fetchPipeline(date)`, `fetchPipelineDates()` 2개 함수 추가
  - `src/App.tsx` — `Tab` 유니온·`TABS`·라우팅 분기에 `pipeline` 항목 추가
  - `src/styles.css` — 행 펼침·신호/실행 배지·`--warn` 토큰 추가

## 검증 기준 (작업 완료 기준 — CLAUDE.md §3 준수)

1. `npm run typecheck` 성공.
2. `npm run build` 성공.
3. `npm run dev` 띄워서:
   - 새 탭 진입 → 에러 패널 표시(backend 미구현 가정).
   - 날짜 선택·새로고침 동작.
   - 데스크톱·모바일(≤720px) 양쪽 레이아웃 확인.
4. 기존 매매일지·계좌잔고 탭 회귀 없음(렌더·반응형 변환).

## 의도적 미구현 (YAGNI)

- 자동 폴링 — 외부 API 호출량 위험.
- 정렬·필터·검색 — 실 사용 피드백 후 결정.
- 무한 스크롤 — 하루치 공시는 보통 작음.
- 인증/토큰 게이트 — 별도 PR.
- 단위 테스트 — 프로젝트 전반에 인프라 부재. 도입은 별도 결정.
- 신호·실행을 각각 펼쳐 보는 상세 모달 — 행 펼침으로 충분.

## WORKLOG 갱신

작업 완료 후 `WORKLOG.md`에 2026-06-04 세션 추가:
- 결정 근거: backend 도메인을 끝-끝 추적 가능한 단일 뷰 도입.
- 가상 계약 명시 — backend 변경 필요 시 사용자에게 알리고 frontend 작업은 거기서 멈추는 절대 규칙 #1 재확인.
- 의도적 미구현 목록.
