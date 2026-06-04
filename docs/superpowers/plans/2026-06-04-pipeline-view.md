# 파이프라인 뷰 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mama backend의 공시→신호→주문 실행 흐름을 한 화면에서 추적하는 읽기 전용 "파이프라인" 탭을 frontend에 추가한다.

**Architecture:** 새 페이지 `PipelinePage` 추가 + 기존 `App.tsx`에 탭 항목 1개 끼움. 페이지 컴포넌트가 상태와 페치를 보유(전역 상태 없음). 가상 API 계약 `/api/pipeline*`을 호출하며 backend 미구현 시 기존 에러 패널 패턴으로 표시.

**Tech Stack:** React 18 + TypeScript(strict) + Vite. 기존 `Intl` 기반 `format.ts` 및 글로벌 `styles.css` 토큰 재사용. 신규 의존성 없음.

**Spec 참조:** `docs/superpowers/specs/2026-06-04-pipeline-view-design.md`

**No-test note:** 이 프로젝트엔 단위 테스트 인프라가 없다(`package.json`에 `test` 스크립트 없음). 각 task의 검증은 `npm run typecheck` / `npm run build` / `npm run dev`(브라우저 확인)로 대체한다. CLAUDE.md §3 "작업 완료 기준" 준수.

**프로젝트 루트:** `C:\projects\mama-site` (모든 경로는 이 루트 기준 상대 경로).

---

## Task 1: 도메인 타입 추가 (`src/types.ts`)

**Files:**
- Modify: `src/types.ts` (파일 끝에 추가)

- [ ] **Step 1: 새 타입 5종을 `src/types.ts` 끝에 추가**

`src/types.ts`의 마지막 줄(line 38 `}` 다음) 뒤에 아래 내용을 그대로 붙인다:

```ts

export type SignalAction = "BUY" | "SELL" | "HOLD";

export type ExecutionStatus = "EXECUTED" | "SKIPPED" | "FAILED";

export interface PipelineDisclosure {
  rceptNo: string;
  stockCode: string | null;
  corpName: string;
  reportName: string;
  rceptDt: string;
  fetchedAt: string;
  dartUrl: string | null;
}

export interface PipelineSignal {
  action: SignalAction;
  confidence: number;
  reasoning: string;
  generatedAt: string;
}

export interface PipelineExecution {
  status: ExecutionStatus;
  orderNo: string | null;
  skipReason: string | null;
  executedAt: string | null;
  errorMessage: string | null;
}

export interface PipelineRow {
  disclosure: PipelineDisclosure;
  signal: PipelineSignal | null;
  execution: PipelineExecution | null;
}
```

- [ ] **Step 2: 타입체크로 검증**

Run: `npm run typecheck`
Expected: 에러 없이 종료 (exit 0). 기존 빌드 결과와 동일 — 새 타입은 아직 어디서도 import되지 않음.

- [ ] **Step 3: 커밋**

```
git add src/types.ts
git commit -m "feat(pipeline): add domain types for pipeline view"
```

---

## Task 2: API 함수 추가 (`src/api.ts`)

**Files:**
- Modify: `src/api.ts:1` (import 추가), `src/api.ts` 파일 끝

- [ ] **Step 1: import 라인 확장**

기존 line 1:

```ts
import type { BalanceSummary, JournalEntry } from "./types";
```

다음으로 교체:

```ts
import type { BalanceSummary, JournalEntry, PipelineRow } from "./types";
```

- [ ] **Step 2: 파일 끝에 두 함수 추가**

기존 `fetchBalance` 정의(line 23~25) 뒤에 추가:

```ts

export function fetchPipeline(date: string): Promise<PipelineRow[]> {
  const params = new URLSearchParams({ date });
  return getJson<PipelineRow[]>(`/api/pipeline?${params.toString()}`);
}

export function fetchPipelineDates(): Promise<string[]> {
  return getJson<string[]>("/api/pipeline/dates");
}
```

- [ ] **Step 3: 타입체크로 검증**

Run: `npm run typecheck`
Expected: 에러 없이 종료.

- [ ] **Step 4: 커밋**

```
git add src/api.ts
git commit -m "feat(pipeline): add fetchPipeline / fetchPipelineDates"
```

---

## Task 3: 페이지 컴포넌트 작성 (`src/pages/PipelinePage.tsx`)

**Files:**
- Create: `src/pages/PipelinePage.tsx`

- [ ] **Step 1: 새 파일 생성 — 페이지 컴포넌트 전체 작성**

파일 내용 전체:

```tsx
import { useEffect, useMemo, useState } from "react";
import { fetchPipeline, fetchPipelineDates } from "../api";
import type {
  ExecutionStatus,
  PipelineExecution,
  PipelineRow,
  PipelineSignal,
  SignalAction,
} from "../types";
import { formatDateLabel, formatTime, todayIso } from "../format";

export function PipelinePage() {
  const [date, setDate] = useState<string>(todayIso());
  const [dates, setDates] = useState<string[]>([]);
  const [rows, setRows] = useState<PipelineRow[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = (target: string) => {
    setLoading(true);
    setError(null);
    setExpanded(null);
    fetchPipeline(target)
      .then(setRows)
      .catch((err: Error) => {
        setRows(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetchPipelineDates()
      .then((list) => {
        if (!cancelled) setDates(list);
      })
      .catch(() => {
        // pill row is optional
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded(null);
    fetchPipeline(date)
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setRows(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const summary = useMemo(() => {
    if (!rows) return null;
    let buy = 0;
    let sell = 0;
    let hold = 0;
    let executed = 0;
    let skipped = 0;
    for (const r of rows) {
      if (r.signal) {
        if (r.signal.action === "BUY") buy += 1;
        else if (r.signal.action === "SELL") sell += 1;
        else hold += 1;
      }
      if (r.execution?.status === "EXECUTED") executed += 1;
      else if (r.execution?.status === "SKIPPED") skipped += 1;
    }
    return { total: rows.length, buy, sell, hold, executed, skipped };
  }, [rows]);

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">파이프라인</h1>
        <div className="page__controls">
          <label className="datepicker">
            <span className="datepicker__label">날짜</span>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button type="button" className="btn" onClick={() => load(date)} disabled={loading}>
            새로고침
          </button>
        </div>
      </div>

      {dates.length > 0 && (
        <div className="pillrow" role="group" aria-label="수집된 날짜">
          {dates.map((d) => (
            <button
              key={d}
              type="button"
              className={`pill${d === date ? " pill--active" : ""}`}
              onClick={() => setDate(d)}
            >
              {formatDateLabel(d)}
            </button>
          ))}
        </div>
      )}

      {summary && rows && rows.length > 0 && (
        <div className="summary summary--pipeline">
          <SummaryCard label="공시" value={`${summary.total}건`} />
          <SummaryCard
            label="신호"
            value={`BUY ${summary.buy} · SELL ${summary.sell} · HOLD ${summary.hold}`}
          />
          <SummaryCard label="실행" value={`${summary.executed}건`} />
          <SummaryCard label="스킵" value={`${summary.skipped}건`} />
        </div>
      )}

      {loading && <div className="state state--loading">불러오는 중…</div>}

      {error && !loading && (
        <div className="state state--error">
          <strong>파이프라인 데이터를 불러올 수 없습니다.</strong>
          <span>{error}</span>
          <small>
            API 서버의 <code>/api/pipeline</code> 엔드포인트가 구동 중인지 확인하세요.
          </small>
        </div>
      )}

      {!loading && !error && rows && rows.length === 0 && (
        <div className="state state--empty">
          <strong>{formatDateLabel(date)}</strong>
          <span>이 날짜에 수집된 공시가 없습니다.</span>
        </div>
      )}

      {!loading && !error && rows && rows.length > 0 && (
        <div className="tablewrap" role="region" aria-label="파이프라인 테이블">
          <table className="table table--pipeline">
            <thead>
              <tr>
                <th scope="col">수집시각</th>
                <th scope="col">종목</th>
                <th scope="col">공시명</th>
                <th scope="col">신호</th>
                <th scope="col">실행</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = expanded === r.disclosure.rceptNo;
                return (
                  <PipelineTableRow
                    key={r.disclosure.rceptNo}
                    row={r}
                    open={isOpen}
                    onToggle={() => setExpanded(isOpen ? null : r.disclosure.rceptNo)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PipelineTableRow({
  row,
  open,
  onToggle,
}: {
  row: PipelineRow;
  open: boolean;
  onToggle: () => void;
}) {
  const { disclosure, signal, execution } = row;
  return (
    <>
      <tr
        className={`row-clickable${open ? " row-clickable--open" : ""}`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <td data-label="수집시각">{formatTime(disclosure.fetchedAt)}</td>
        <td data-label="종목">
          <div className="cell-stock">
            <span className="cell-stock__name">{disclosure.corpName}</span>
            {disclosure.stockCode && (
              <span className="cell-stock__symbol">{disclosure.stockCode}</span>
            )}
          </div>
        </td>
        <td data-label="공시명" className="reason">
          <span className="report-name">{disclosure.reportName}</span>
        </td>
        <td data-label="신호">
          <SignalBadge signal={signal} />
        </td>
        <td data-label="실행">
          <ExecutionCell execution={execution} />
        </td>
      </tr>
      {open && (
        <tr className="row-detail">
          <td colSpan={5}>
            <DetailPanel row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

function SignalBadge({ signal }: { signal: PipelineSignal | null }) {
  if (!signal) return <span className="cell-empty">—</span>;
  const tone: Record<SignalAction, string> = {
    BUY: "buy",
    SELL: "sell",
    HOLD: "hold",
  };
  const label: Record<SignalAction, string> = {
    BUY: "매수",
    SELL: "매도",
    HOLD: "관망",
  };
  const pct = Math.round(signal.confidence * 100);
  return (
    <span className="signal">
      <span className={`badge badge--${tone[signal.action]}`}>{label[signal.action]}</span>
      <span className="signal__confidence">{pct}%</span>
    </span>
  );
}

function ExecutionCell({ execution }: { execution: PipelineExecution | null }) {
  if (!execution) return <span className="cell-empty">—</span>;
  const tone: Record<ExecutionStatus, string> = {
    EXECUTED: "executed",
    SKIPPED: "skipped",
    FAILED: "failed",
  };
  const label: Record<ExecutionStatus, string> = {
    EXECUTED: "실행",
    SKIPPED: "스킵",
    FAILED: "실패",
  };
  const detail =
    execution.status === "EXECUTED"
      ? execution.orderNo ?? ""
      : execution.status === "SKIPPED"
      ? execution.skipReason ?? ""
      : execution.errorMessage ?? "";
  return (
    <span className="execution">
      <span className={`badge badge--${tone[execution.status]}`}>{label[execution.status]}</span>
      {detail && <span className="execution__detail">{detail}</span>}
    </span>
  );
}

function DetailPanel({ row }: { row: PipelineRow }) {
  const { disclosure, signal } = row;
  return (
    <div className="detail">
      <div className="detail__block">
        <div className="detail__label">공시명</div>
        <div className="detail__value">{disclosure.reportName}</div>
      </div>
      {signal && (
        <div className="detail__block">
          <div className="detail__label">신호 사유</div>
          <div className="detail__value">{signal.reasoning}</div>
        </div>
      )}
      {disclosure.dartUrl && (
        <div className="detail__block">
          <a
            className="detail__link"
            href={disclosure.dartUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            DART에서 보기 ↗
          </a>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="card__label">{label}</div>
      <div className="card__value card__value--compact">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없이 종료. (이 시점에서 페이지 자체는 어디서도 import되지 않지만 strict 타입체크는 통과.)

- [ ] **Step 3: 커밋**

```
git add src/pages/PipelinePage.tsx
git commit -m "feat(pipeline): add PipelinePage component"
```

---

## Task 4: 글로벌 스타일 추가 (`src/styles.css`)

**Files:**
- Modify: `src/styles.css` (기존 `.summary--balance` 규칙 뒤·`.badge--sell` 뒤·`.state--error` 뒤 등에 끼움)

신규 토큰은 추가하지 않는다 (`--warn`은 이미 line 16에 정의됨).

- [ ] **Step 1: 파이프라인 요약 카드 그리드 추가**

`src/styles.css`에서 다음 줄을 찾는다 (line 343~345 근처):

```css
.summary--balance {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

바로 뒤에 추가:

```css

.summary--pipeline {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.card__value--compact {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}
```

- [ ] **Step 2: HOLD·실행·스킵·실패 배지와 셀 표시 스타일 추가**

`src/styles.css`에서 다음 규칙을 찾는다 (line 470~473 근처):

```css
.badge--sell {
  background: color-mix(in oklab, var(--sell) 14%, transparent);
  color: var(--sell);
}
```

바로 뒤에 추가:

```css

.badge--hold {
  background: var(--surface-2);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.badge--executed {
  background: color-mix(in oklab, var(--text) 10%, transparent);
  color: var(--text);
}

.badge--skipped {
  background: var(--surface-2);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.badge--failed {
  background: color-mix(in oklab, var(--warn) 18%, transparent);
  color: var(--warn);
}

.signal,
.execution {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.signal__confidence {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-muted);
}

.execution__detail {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-empty {
  color: var(--text-dim);
}

.report-name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}
```

- [ ] **Step 3: 행 펼침과 상세 패널 스타일 추가**

같은 파일에서 다음 규칙을 찾는다 (line 422~424 근처):

```css
.table tbody tr:hover {
  background: color-mix(in oklab, var(--surface-2) 60%, transparent);
}
```

바로 뒤에 추가:

```css

.row-clickable {
  cursor: pointer;
}

.row-clickable--open {
  background: color-mix(in oklab, var(--surface-2) 70%, transparent);
}

.row-detail td {
  background: var(--surface-2);
  padding: 0;
}

.detail {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px dashed var(--border);
}

.detail__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}

.detail__value {
  color: var(--text);
  white-space: pre-wrap;
  line-height: 1.55;
}

.detail__link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.detail__link:hover {
  text-decoration: underline;
}
```

- [ ] **Step 4: 모바일(≤720px)에서 상세 패널·공시명 자연스러운 카드 변환 보정**

같은 파일에서 다음 규칙을 찾는다 (line 615~627 근처, 즉 `.table tbody td.reason` 블록과 그 다음 `::before` 블록):

```css
  .table tbody td.reason {
    grid-column: 1 / -1;
    text-align: left;
    padding-top: 8px;
    margin-top: 6px;
    border-top: 1px dashed var(--border);
  }

  .table tbody td.reason::before {
    display: block;
    padding-bottom: 2px;
  }
```

이 두 블록 바로 뒤(같은 `@media` 블록 안)에 추가:

```css

  .row-detail {
    background: transparent;
    border: 0;
    box-shadow: none;
    padding: 0;
    margin-top: -6px;
  }

  .row-detail td {
    padding: 0;
    background: transparent;
  }

  .row-detail .detail {
    border-top: 0;
    padding: 4px 0 8px;
  }

  .report-name {
    -webkit-line-clamp: unset;
  }

  .signal,
  .execution {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .execution__detail {
    max-width: 100%;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }
```

- [ ] **Step 5: 빌드로 CSS 유효성 확인**

Run: `npm run build`
Expected: 에러 없이 종료. 출력 CSS 크기가 약간 증가 (기존 ~9.2 kB → ~10 kB 내외 — 정확한 값은 기록).

- [ ] **Step 6: 커밋**

```
git add src/styles.css
git commit -m "feat(pipeline): add styles for pipeline summary/badges/detail"
```

---

## Task 5: `App.tsx`에 탭 연결

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: import 추가**

기존 `src/App.tsx:2-3`:

```tsx
import { JournalPage } from "./pages/JournalPage";
import { BalancePage } from "./pages/BalancePage";
```

다음으로 교체:

```tsx
import { JournalPage } from "./pages/JournalPage";
import { BalancePage } from "./pages/BalancePage";
import { PipelinePage } from "./pages/PipelinePage";
```

- [ ] **Step 2: Tab 유니온과 TABS 배열에 항목 추가**

기존 `src/App.tsx:5-10`:

```tsx
type Tab = "journal" | "balance";

const TABS: { id: Tab; label: string }[] = [
  { id: "journal", label: "매매일지" },
  { id: "balance", label: "계좌잔고" },
];
```

다음으로 교체:

```tsx
type Tab = "journal" | "balance" | "pipeline";

const TABS: { id: Tab; label: string }[] = [
  { id: "journal", label: "매매일지" },
  { id: "balance", label: "계좌잔고" },
  { id: "pipeline", label: "파이프라인" },
];
```

- [ ] **Step 3: 라우팅 분기 교체**

기존 `src/App.tsx:42`:

```tsx
{tab === "journal" ? <JournalPage /> : <BalancePage />}
```

다음으로 교체:

```tsx
{tab === "journal" ? (
  <JournalPage />
) : tab === "balance" ? (
  <BalancePage />
) : (
  <PipelinePage />
)}
```

- [ ] **Step 4: 빌드 + 타입체크**

Run: `npm run build`
Expected: 성공. dist 디렉토리 생성. 출력 JS는 약간 증가(약 +6~8 kB 수준, gzip 후 +2~3 kB).

- [ ] **Step 5: 커밋**

```
git add src/App.tsx
git commit -m "feat(pipeline): wire pipeline tab into App"
```

---

## Task 6: 브라우저 수동 검증 (CLAUDE.md §3 작업 완료 기준)

**Files:** 없음 (검증 단계).

이 task는 코드 변경이 없으며 브라우저 확인만 한다. 사용자가 자신의 머신에서 직접 수행하거나, 에이전트가 `npm run dev`를 백그라운드로 띄우고 결과를 보고하는 형태로 진행한다.

- [ ] **Step 1: dev 서버 기동**

Run (백그라운드 가능): `npm run dev`
Expected stdout: `Local: http://localhost:5173/` 출력 후 대기 상태.

- [ ] **Step 2: 데스크톱 폭에서 신규 탭 진입 확인**

`http://localhost:5173/` 접속 → 상단 탭에 **"파이프라인"** 가 노출. 클릭 시:
- 페이지 타이틀 "파이프라인" 표시
- 날짜 선택기 및 "새로고침" 버튼 노출
- API 미구현 상태이므로 **에러 패널** 표시:
  - "파이프라인 데이터를 불러올 수 없습니다."
  - `API 서버의 /api/pipeline 엔드포인트가 구동 중인지 확인하세요.`
- 콘솔에 unexpected 에러(예: 잘못된 type 경고) 없음.

- [ ] **Step 3: 기존 탭 회귀 없음 확인**

매매일지·계좌잔고 탭으로 이동 → 기존 동작 동일(에러 패널이 각자의 endpoint 이름으로 나타남). 탭 활성화 표시(`tabs__btn--active`) 잘 토글.

- [ ] **Step 4: 모바일 폭(≤720px) 확인**

브라우저 dev tools로 폭을 ≤720px로 줄이거나 휴대전화로 LAN 접속(`npm run dev -- --host 0.0.0.0`로 재기동 후 LAN IP 접속):
- 상단 탭 3개가 가로로 균등 분포 (`.tabs__btn { flex: 1 }` 기존 미디어쿼리).
- 에러 패널·요약 카드·테이블 카드 변환 깨짐 없음.
- 매매일지·계좌잔고 탭의 카드 그리드 변환도 회귀 없음.

- [ ] **Step 5 (조건부): 데이터가 있는 상태도 확인하고 싶다면**

backend가 실제로 떠 있고 `/api/pipeline?date=...`가 응답한다면:
- 요약 카드 4종, 테이블 5컬럼이 정상 렌더되는지 확인.
- 행 클릭 → 상세 패널 펼침/접힘 동작.
- BUY/SELL/HOLD 배지 색상이 한국 증시 컨벤션(빨강/파랑/회색) 준수.

backend 미구현이면 이 step은 skip 가능. 사실상 본 task의 핵심은 Step 2~4의 에러 패널·반응형 회귀 검증.

- [ ] **Step 6: dev 서버 종료**

백그라운드 PID 종료 또는 사용자 머신에서 Ctrl+C.

---

## Task 7: WORKLOG 갱신 + 최종 커밋

**Files:**
- Modify: `WORKLOG.md` (파일 맨 위 추가)

- [ ] **Step 1: WORKLOG에 새 섹션 추가**

`WORKLOG.md`의 line 1 `# 작업일지` 다음, 첫 `## 2026-06-03 — ...` 섹션 바로 앞에 아래를 끼워 넣는다:

```markdown

## 2026-06-04 — 파이프라인 뷰 추가

### 한 일

- 새 탭 **"파이프라인"** 추가 — backend 도메인(공시→신호→주문 실행)을 한 화면에서 추적하는 읽기 전용 뷰.
- 가상 API 계약 `GET /api/pipeline?date=` / `GET /api/pipeline/dates`. backend는 아직 컨트롤러가 없어 미구현이며, 기존 패턴대로 5xx → 에러 패널 표시.
- 화면 구성: 날짜 선택 + 수집 날짜 pill row + 요약 카드 4종(공시·신호 분포·실행·스킵) + 테이블(수집시각·종목·공시명·신호·실행) + 행 클릭 시 상세(공시명 전체 + 신호 reasoning + DART 링크) 펼침.
- 색상: BUY=빨강, SELL=파랑(증시 컨벤션), HOLD=회색, EXECUTED=중립 진한 텍스트, SKIPPED=회색, FAILED=`--warn` 오렌지.
- 신규 의존성·전역 상태 라이브러리 없음. 기존 `format.ts` 헬퍼와 `styles.css` 토큰 재사용.

### 결정 / 메모

- backend의 신호·실행 결과는 영속화돼 있지 않지만 프론트 계약은 **풀 파이프라인** 가정으로 단일 endpoint 설계. 추후 backend 측에서 동일 shape으로 채워 넣으면 곧바로 동작.
- 자동 폴링·정렬·필터·인증 게이트는 의도적으로 미구현 (YAGNI, 외부 API 호출량 함정).
- 단위 테스트 인프라는 그대로 부재. typecheck/build + 브라우저 수동 확인으로 검증.

### 다음에 할 일

- backend가 `/api/pipeline*` 엔드포인트를 노출하면 실데이터로 다시 회귀 확인.
- 데이터가 많아지면 정렬·필터 도입 검토 (현재는 미도입).
```

- [ ] **Step 2: 커밋**

```
git add WORKLOG.md
git commit -m "docs(worklog): log pipeline view addition"
```

- [ ] **Step 3: 최종 상태 확인**

Run: `git status` / `git log --oneline -8`
Expected:
- working tree clean
- 직전 6개 커밋이 이 plan의 Task 1~7 순서로 쌓여 있음.

---

## 참고: 가정·제약

- **CLAUDE.md 절대 규칙 #1 준수**: backend 코드/스키마/할 일을 작성하지 않는다. `/api/pipeline*`은 가상 계약일 뿐 backend repo에 어떤 작업도 계획하지 않는다. 만약 사용자가 실데이터로 검증하고 싶다면 그 의사가 명시될 때 별도 안내.
- **시크릿 커밋 금지**: 본 작업은 시크릿을 다루지 않음. `.env*` 변경 없음.
- **번들 영향**: 신규 페이지 추가로 JS 약 +6~8 kB(raw) 예상. gzip 후 +2~3 kB. 기존 ~150 kB 대비 미미.

## 참고: 파일별 변경 요약

| 파일 | 변경 |
|---|---|
| `src/types.ts` | 신규 타입 5종 추가 (Task 1) |
| `src/api.ts` | import 갱신 + `fetchPipeline` / `fetchPipelineDates` 추가 (Task 2) |
| `src/pages/PipelinePage.tsx` | **신규 파일** (Task 3) |
| `src/styles.css` | summary--pipeline, 배지 4종, 행 펼침, 상세 패널, 모바일 보정 (Task 4) |
| `src/App.tsx` | import + Tab union + TABS + 라우팅 분기 (Task 5) |
| `WORKLOG.md` | 2026-06-04 세션 추가 (Task 7) |
