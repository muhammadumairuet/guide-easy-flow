import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  LineChart as LineChartIcon,
  Play,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { OnboardingDialog } from "@/components/OnboardingDialog";
import { MetricCard } from "@/components/MetricCard";
import { AnalysisCharts } from "@/components/AnalysisCharts";
import { Button } from "@/components/ui/button";
import { STOCKS } from "@/lib/stock-data";
import { runAnalysis, type AnalysisResult, type ModelKind } from "@/lib/predictor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockSight — AI Stock Direction Predictor" },
      {
        name: "description",
        content:
          "Predict tomorrow's stock direction with in-browser machine learning. Pick a stock, choose a model, and get a clear UP or DOWN call with confidence and backtests.",
      },
      { property: "og:title", content: "StockSight — AI Stock Direction Predictor" },
      {
        property: "og:description",
        content: "In-browser ML that predicts stock direction with confidence scores, accuracy metrics, and strategy backtests.",
      },
    ],
  }),
  component: Index,
});

const MODELS: { id: ModelKind; name: string; desc: string }[] = [
  { id: "logistic", name: "Logistic Regression", desc: "Trains on technical indicators" },
  { id: "momentum", name: "Momentum", desc: "Follows recent trend strength" },
];

function Index() {
  const [showGuide, setShowGuide] = useState(true);
  const [symbol, setSymbol] = useState(STOCKS[0].symbol);
  const [model, setModel] = useState<ModelKind>("logistic");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const selectedStock = STOCKS.find((s) => s.symbol === symbol)!;

  async function handleRun() {
    setRunning(true);
    setProgress(0);
    setResult(null);
    setLogLines([`▶ Starting analysis for ${symbol} using ${model === "logistic" ? "Logistic Regression" : "Momentum"}…`]);
    try {
      const res = await runAnalysis(symbol, model, (pct, msg) => {
        setProgress(pct);
        setLogLines((prev) => [...prev, `• ${msg}`]);
      });
      setResult(res);
      setLogLines((prev) => [...prev, "✓ Analysis complete."]);
    } catch (e) {
      setLogLines((prev) => [...prev, `✗ Error: ${(e as Error).message}`]);
    } finally {
      setRunning(false);
    }
  }

  const up = result?.direction === "UP";

  return (
    <div className="min-h-screen" style={{ backgroundImage: "var(--gradient-glow)" }}>
      <OnboardingDialog open={showGuide} onClose={() => setShowGuide(false)} />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold leading-tight text-foreground">StockSight</p>
              <p className="text-[11px] leading-tight text-muted-foreground">AI direction predictor</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowGuide(true)} className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            How it works
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7">
        {/* Hero */}
        <section className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Will it close <span className="text-success">up</span> or <span className="text-destructive">down</span> tomorrow?
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pick a stock and a model, then run an in-browser machine-learning analysis. You get a plain-English
            prediction, confidence score, accuracy metrics, and a strategy backtest.
          </p>
        </section>

        {/* Controls */}
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 lg:grid-cols-[1.2fr_1.4fr_auto]">
          {/* Stock picker */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stock
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              disabled={running}
              className="w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {STOCKS.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">{selectedStock.sector}</p>
          </div>

          {/* Model picker */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  disabled={running}
                  className={`rounded-lg border p-2.5 text-left transition-colors disabled:opacity-50 ${
                    model === m.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary hover:border-muted-foreground"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Run */}
          <div className="flex items-end">
            <Button onClick={handleRun} disabled={running} size="lg" className="w-full gap-2 lg:w-auto">
              <Play className="h-4 w-4" />
              {running ? "Analyzing…" : "Run Analysis"}
            </Button>
          </div>
        </section>

        {/* Progress + log */}
        <AnimatePresence>
          {(running || logLines.length > 0) && !result && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden rounded-2xl border border-border bg-card p-5"
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Activity className="h-4 w-4 text-primary" />
                Activity
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="mt-3 max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-muted-foreground">
                {logLines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
              {/* Prediction banner */}
              <div
                className={`flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between ${
                  up ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                      up ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {up ? <ArrowUpRight className="h-8 w-8" /> : <ArrowDownRight className="h-8 w-8" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prediction for {result.symbol}</p>
                    <p className="text-2xl font-bold text-foreground">
                      Likely to close{" "}
                      <span className={up ? "text-success" : "text-destructive"}>
                        {up ? "UP ▲" : "DOWN ▼"}
                      </span>{" "}
                      tomorrow
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last close ${result.lastClose.toFixed(2)} · {result.model === "logistic" ? "Logistic Regression" : "Momentum"} model
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</p>
                  <p className={`text-4xl font-bold tabular-nums ${up ? "text-success" : "text-destructive"}`}>
                    {(result.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard
                  label="Accuracy"
                  value={`${(result.accuracy * 100).toFixed(1)}%`}
                  sub="on hold-out test set"
                  icon={Target}
                  tone={result.accuracy >= 0.5 ? "success" : "destructive"}
                  delay={0.05}
                />
                <MetricCard
                  label="F1 Score"
                  value={result.f1.toFixed(2)}
                  sub="precision & recall balance"
                  icon={LineChartIcon}
                  delay={0.1}
                />
                <MetricCard
                  label="Strategy Return"
                  value={`${(result.strategyReturn * 100).toFixed(1)}%`}
                  sub="model-driven long/flat"
                  icon={TrendingUp}
                  tone={result.strategyReturn >= 0 ? "success" : "destructive"}
                  delay={0.15}
                />
                <MetricCard
                  label="Buy & Hold"
                  value={`${(result.buyHoldReturn * 100).toFixed(1)}%`}
                  sub="baseline comparison"
                  icon={Wallet}
                  tone={result.buyHoldReturn >= 0 ? "success" : "destructive"}
                  delay={0.2}
                />
              </div>

              <AnalysisCharts result={result} />

              <p className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                ⚠️ Educational demo using simulated sample data. This is not financial advice — do not trade real
                money based on these predictions.
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        {!result && !running && logLines.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LineChartIcon className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">Ready when you are</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Choose a stock and model above, then hit <span className="font-medium text-foreground">Run Analysis</span> to see your prediction.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        StockSight · In-browser ML demo · Built for learning, not trading
      </footer>
    </div>
  );
}
