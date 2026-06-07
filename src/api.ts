import type { BalanceSummary, JournalEntry, PipelineRow } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`);
  }
  return (await response.json()) as T;
}

export function fetchJournals(date: string): Promise<JournalEntry[]> {
  const params = new URLSearchParams({ date });
  return getJson<JournalEntry[]>(`/api/journals?${params.toString()}`);
}

export function fetchAvailableDates(): Promise<string[]> {
  return getJson<string[]>("/api/journals/dates");
}

export function fetchBalance(): Promise<BalanceSummary> {
  return getJson<BalanceSummary>("/api/account/balance");
}

export function fetchPipeline(date: string): Promise<PipelineRow[]> {
  const params = new URLSearchParams({ date });
  return getJson<PipelineRow[]>(`/api/pipeline?${params.toString()}`);
}

export function fetchPipelineDates(): Promise<string[]> {
  return getJson<string[]>("/api/pipeline/dates");
}
