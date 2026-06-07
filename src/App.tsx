import { useState } from "react";
import { JournalPage } from "./pages/JournalPage";
import { BalancePage } from "./pages/BalancePage";
import { PipelinePage } from "./pages/PipelinePage";

type Tab = "journal" | "balance" | "pipeline";

const TABS: { id: Tab; label: string }[] = [
  { id: "journal", label: "매매일지" },
  { id: "balance", label: "계좌잔고" },
  { id: "pipeline", label: "파이프라인" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("journal");

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__mark">m</span>
            <span className="brand__name">mama</span>
            <span className="brand__sub">자동매매 콘솔</span>
          </div>
          <nav className="tabs" role="tablist" aria-label="섹션">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`tabs__btn${tab === t.id ? " tabs__btn--active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="content">
        {tab === "journal" ? (
          <JournalPage />
        ) : tab === "balance" ? (
          <BalancePage />
        ) : (
          <PipelinePage />
        )}
      </main>
    </div>
  );
}
