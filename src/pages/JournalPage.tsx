import { useEffect, useMemo, useState } from "react";
import { fetchAvailableDates, fetchJournals } from "../api";
import type { JournalEntry } from "../types";
import {
  formatDateLabel,
  formatInteger,
  formatKrw,
  formatTime,
  todayIso,
} from "../format";

export function JournalPage() {
  const [date, setDate] = useState<string>(todayIso());
  const [dates, setDates] = useState<string[]>([]);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAvailableDates()
      .then((list) => {
        if (!cancelled) setDates(list);
      })
      .catch(() => {
        // dates pill row is optional; ignore errors
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchJournals(date)
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setEntries(null);
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

  const totals = useMemo(() => {
    if (!entries) return null;
    let buyAmt = 0;
    let sellAmt = 0;
    let buyN = 0;
    let sellN = 0;
    for (const e of entries) {
      if (e.action === "BUY") {
        buyAmt += e.amount;
        buyN += 1;
      } else {
        sellAmt += e.amount;
        sellN += 1;
      }
    }
    return { buyAmt, sellAmt, buyN, sellN, net: sellAmt - buyAmt };
  }, [entries]);

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">매매일지</h1>
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
        </div>
      </div>

      {dates.length > 0 && (
        <div className="pillrow" role="group" aria-label="기록된 날짜">
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

      {totals && entries && entries.length > 0 && (
        <div className="summary summary--journal">
          <SummaryCard label="매수" value={`${totals.buyN}건 · ${formatKrw(totals.buyAmt)}`} tone="buy" />
          <SummaryCard label="매도" value={`${totals.sellN}건 · ${formatKrw(totals.sellAmt)}`} tone="sell" />
          <SummaryCard
            label="순현금흐름"
            value={formatKrw(totals.net)}
            tone={totals.net > 0 ? "pos" : totals.net < 0 ? "neg" : "flat"}
          />
        </div>
      )}

      {loading && <div className="state state--loading">불러오는 중…</div>}

      {error && !loading && (
        <div className="state state--error">
          <strong>매매일지를 불러올 수 없습니다.</strong>
          <span>{error}</span>
          <small>백엔드 <code>/api/journals</code> 엔드포인트가 구동 중인지 확인하세요.</small>
        </div>
      )}

      {!loading && !error && entries && entries.length === 0 && (
        <div className="state state--empty">
          <strong>{formatDateLabel(date)}</strong>
          <span>이 날짜에 기록된 거래가 없습니다.</span>
        </div>
      )}

      {!loading && !error && entries && entries.length > 0 && (
        <div className="tablewrap" role="region" aria-label="매매일지 테이블">
          <table className="table table--journal">
            <thead>
              <tr>
                <th scope="col">시각</th>
                <th scope="col">종목</th>
                <th scope="col">구분</th>
                <th scope="col" className="num">수량</th>
                <th scope="col" className="num">단가</th>
                <th scope="col" className="num">거래대금</th>
                <th scope="col">사유</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td data-label="시각">{formatTime(e.executedAt)}</td>
                  <td data-label="종목">
                    <div className="cell-stock">
                      <span className="cell-stock__name">{e.name}</span>
                      <span className="cell-stock__symbol">{e.symbol}</span>
                    </div>
                  </td>
                  <td data-label="구분">
                    <span className={`badge badge--${e.action === "BUY" ? "buy" : "sell"}`}>
                      {e.action === "BUY" ? "매수" : "매도"}
                    </span>
                  </td>
                  <td data-label="수량" className="num">{formatInteger(e.quantity)}</td>
                  <td data-label="단가" className="num">{formatKrw(e.price)}</td>
                  <td data-label="거래대금" className="num">{formatKrw(e.amount)}</td>
                  <td data-label="사유" className="reason">{e.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "buy" | "sell" | "pos" | "neg" | "flat";
}) {
  return (
    <div className={`card card--${tone}`}>
      <div className="card__label">{label}</div>
      <div className="card__value">{value}</div>
    </div>
  );
}
