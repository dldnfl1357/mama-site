import { useEffect, useState } from "react";
import { fetchBalance } from "../api";
import type { BalanceSummary } from "../types";
import {
  formatInteger,
  formatKrw,
  formatPercent,
  formatSignedKrw,
} from "../format";

export function BalancePage() {
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchBalance()
      .then(setBalance)
      .catch((err: Error) => {
        setBalance(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">계좌잔고</h1>
        <div className="page__controls">
          {balance && (
            <span className={`chip chip--${balance.paperTrading ? "paper" : "live"}`}>
              {balance.paperTrading ? "모의투자" : "실계좌"}
            </span>
          )}
          <button type="button" className="btn" onClick={load} disabled={loading}>
            새로고침
          </button>
        </div>
      </div>

      {loading && <div className="state state--loading">불러오는 중…</div>}

      {error && !loading && (
        <div className="state state--error">
          <strong>잔고를 불러올 수 없습니다.</strong>
          <span>{error}</span>
          <small>백엔드 <code>/api/account/balance</code> 엔드포인트와 KIS 자격증명을 확인하세요.</small>
        </div>
      )}

      {balance && !loading && !error && (
        <>
          <div className="summary summary--balance">
            <BalanceCard label="순자산" value={formatKrw(balance.netAsset)} />
            <BalanceCard label="예수금" value={formatKrw(balance.deposit)} />
            <BalanceCard label="총 평가금액" value={formatKrw(balance.totalEvaluationAmount)} />
            <BalanceCard
              label="평가손익"
              value={formatSignedKrw(balance.totalProfitLoss)}
              sub={formatPercent(balance.totalProfitLossRate)}
              tone={pnlTone(balance.totalProfitLoss)}
            />
          </div>

          <div className="meta">
            <span>계좌 {balance.accountNo}</span>
            <span>· 조회 {new Date(balance.fetchedAt).toLocaleString("ko-KR")}</span>
            {balance.source && <span>· {balance.source}</span>}
          </div>

          <h2 className="section-title">보유종목 ({balance.holdings.length})</h2>

          {balance.holdings.length === 0 ? (
            <div className="state state--empty">
              <strong>보유 중인 종목이 없습니다.</strong>
              <span>예수금만 있는 상태입니다.</span>
            </div>
          ) : (
            <div className="tablewrap" role="region" aria-label="보유종목 테이블">
              <table className="table table--holdings">
                <thead>
                  <tr>
                    <th scope="col">종목</th>
                    <th scope="col" className="num">수량</th>
                    <th scope="col" className="num">평균단가</th>
                    <th scope="col" className="num">현재가</th>
                    <th scope="col" className="num">평가금액</th>
                    <th scope="col" className="num">평가손익</th>
                    <th scope="col" className="num">수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {balance.holdings.map((h) => {
                    const tone = pnlTone(h.profitLoss);
                    return (
                      <tr key={h.symbol}>
                        <td data-label="종목">
                          <div className="cell-stock">
                            <span className="cell-stock__name">{h.name}</span>
                            <span className="cell-stock__symbol">{h.symbol}</span>
                          </div>
                        </td>
                        <td data-label="수량" className="num">{formatInteger(h.quantity)}</td>
                        <td data-label="평균단가" className="num">{formatKrw(h.averagePrice)}</td>
                        <td data-label="현재가" className="num">{formatKrw(h.currentPrice)}</td>
                        <td data-label="평가금액" className="num">{formatKrw(h.evaluationAmount)}</td>
                        <td data-label="평가손익" className={`num pnl--${tone}`}>
                          {formatSignedKrw(h.profitLoss)}
                        </td>
                        <td data-label="수익률" className={`num pnl--${tone}`}>
                          {formatPercent(h.profitLossRate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function pnlTone(v: number): "pos" | "neg" | "flat" {
  if (v > 0) return "pos";
  if (v < 0) return "neg";
  return "flat";
}

function BalanceCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg" | "flat";
}) {
  return (
    <div className={`card${tone ? ` card--${tone}` : ""}`}>
      <div className="card__label">{label}</div>
      <div className="card__value">{value}</div>
      {sub && <div className="card__sub">{sub}</div>}
    </div>
  );
}
