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
