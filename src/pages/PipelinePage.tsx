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
