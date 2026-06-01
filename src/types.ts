export type TradeAction = "BUY" | "SELL";

export interface JournalEntry {
  id: string;
  executedAt: string;
  symbol: string;
  name: string;
  action: TradeAction;
  quantity: number;
  price: number;
  amount: number;
  reason: string | null;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  evaluationAmount: number;
  profitLoss: number;
  profitLossRate: number;
}

export interface BalanceSummary {
  accountNo: string;
  paperTrading: boolean;
  source: string;
  fetchedAt: string;
  deposit: number;
  totalPurchaseAmount: number;
  totalEvaluationAmount: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
  netAsset: number;
  holdings: Holding[];
}
