import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Copy,
  Database,
  FileDown,
  LineChart as LineChartIcon,
  Play,
  Star,
  Target,
  TrendingUp,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { OnboardingDialog } from "@/components/OnboardingDialog";
import { MetricCard } from "@/components/MetricCard";
import { AnalysisCharts } from "@/components/AnalysisCharts";
import { Button } from "@/components/ui/button";
import { STOCKS, type DataSource } from "@/lib/stock-data";
import { runAnalysis, type AnalysisResult, type ModelKind } from "@/lib/predictor";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";
import { buildTextSummary, downloadPdfReport } from "@/lib/report";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockSight — AI Stock Direction Predictor" },
      {
        name: "description",
        content:
          "Predict tomorrow's stock direction with in-browser machine learning. Pick a stock, choose sample or live data and a model, and get a clear UP or DOWN call with confidence and backtests.",
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
  const [dataSource, setDataSource] = useState<DataSource>("sample");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const selectedStock = STOCKS.find((s) => s.symbol === symbol)!;
  const inWatchlist = watchlist.includes(symbol);

  async function handleRun(runSymbol = symbol) {
    setRunning(true);
    setProgress(0);
    setResult(null);
    setLogLines([
      `▶ Starting analysis for ${runSymbol} using ${model === "logistic" ? "Logistic Regression" : "Momentum"} (${dataSource === "live" ? "live data" : "sample data"})…`,
    ]);
    try {
      const res = await runAnalysis(runSymbol, model, dataSource, (pct, msg) => {
        setProgress(pct);
        setLogLines((prev) => [...prev, `• ${msg}`]);
      });
      setResult(res);
      setLogLines((prev) => [...prev, "✓ Analysis complete."]);
      if (res.liveFallback) {
        toast.warning("Live data unavailable — used sample data instead.");
      }
    } catch (e) {
      setLogLines((prev) => [...prev, `✗ Error: ${(e as Error).message}`]);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  function toggleWatchlist() {
    if (inWatchlist) {
      setWatchlist(removeFromWatchlist(symbol));
    } else {
      setWatchlist(addToWatchlist(symbol));
      toast.success(`${symbol} added to your watchlist`);
    }
  }

  function pickWatchStock(s: string) {
    setSymbol(s);
    handleRun(s);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard
      .writeText(buildTextSummary(result, result.dataSource === "live" ? "Live market data" : "Sample data"))
      .then(() => toast.success("Summary copied to clipboard"))
      .catch(() => toast.error("Could not copy"));
  }

  function handlePdf() {
    if (!result) return;
    downloadPdfReport(result, result.dataSource === "live" ? "Live market data" : "Sample data");
  }

  const up = result?.direction === "UP";

  return (
    <div className="min-h-screen bg-background">
      <OnboardingDialog open={showGuide} onClose={() => setShowGuide(false)} />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-lg font-bold leading-tight text-foreground">StockSight</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowGuide(true)} className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            How it works
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Hero */}
        <section className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Will it close <span className="text-success">up</span> or <span className="text-destructive">down</span>?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
            Pick a stock, choose your data and model, then run a one-click analysis.
          </p>
        </section>

        {/* Watchlist strip */}
        {watchlist.length > 0 && (
          <section className="mb-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Star className="h-3.5 w-3.5" /> Watchlist
            </p>
            <div className="flex flex-wrap gap-2">
              {watchlist.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-sm"
                >
                  <button
                    onClick={() => pickWatchStock(s)}
                    disabled={running}
                    className="font-medium text-foreground hover:text-primary disabled:opacity-50"
                  >
                    {s}
                  </button>
                  <button
                    onClick={() => setWatchlist(removeFromWatchlist(s))}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label={`Remove ${s}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Controls */}
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
          {/* Stock */}
          <div>
            <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Stock</span>
              <button
                onClick={toggleWatchlist}
                disabled={running}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                  inWatchlist
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Star className={`h-3 w-3 ${inWatchlist ? "fill-current" : ""}`} />
                {inWatchlist ? "In watchlist" : "Add to watchlist"}
              </button>
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

          {/* Data source */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Data source
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "sample", name: "Sample data", desc: "Always works offline", icon: Database },
                { id: "live", name: "Live market data", desc: "Real recent prices", icon: Wifi },
              ] as const).map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDataSource(d.id)}
                  disabled={running}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors disabled:opacity-50 ${
                    dataSource === d.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary hover:border-muted-foreground"
                  }`}
                >
                  <d.icon className="mt-0.5 h-4 w-4 text-primary" />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{d.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{d.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
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
          <Button onClick={() => handleRun()} disabled={running} size="lg" className="w-full gap-2">
            <Play className="h-4 w-4" />
            {running ? "Analyzing…" : "Run Analysis"}
          </Button>
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
                      Last close ${result.lastClose.toFixed(2)} · {result.model === "logistic" ? "Logistic Regression" : "Momentum"} ·{" "}
                      {result.dataSource === "live" ? "live data" : "sample data"}
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

              {/* Export actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handlePdf} className="gap-1.5">
                  <FileDown className="h-4 w-4" />
                  Download PDF report
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                  <Copy className="h-4 w-4" />
                  Copy summary
                </Button>
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
                ⚠️ Educational demo. This is not financial advice — do not trade real money based on these predictions.
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
              Choose your options above, then hit <span className="font-medium text-foreground">Run Analysis</span> to see your prediction.
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
