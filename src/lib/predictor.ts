// Lightweight, fully client-side prediction engine.
// Implements a logistic-regression classifier trained with gradient descent
// on technical-indicator features, plus a simple momentum model, metrics,
// and a backtest of a long/flat trading strategy.

import { getHistory, fetchLiveHistory, type DataSource, type PricePoint } from "./stock-data";

export type ModelKind = "logistic" | "momentum";

export interface Indicators {
  ret1: number;
  ret5: number;
  rsi: number;
  smaGap: number; // (price - SMA20) / SMA20
  vol: number; // rolling volatility
}

export interface AnalysisResult {
  symbol: string;
  model: ModelKind;
  direction: "UP" | "DOWN";
  confidence: number; // 0..1
  lastClose: number;
  accuracy: number;
  f1: number;
  strategyReturn: number; // total return of strategy
  buyHoldReturn: number;
  equityCurve: { date: string; strategy: number; buyHold: number }[];
  confusion: { tp: number; tn: number; fp: number; fn: number };
  priceSeries: { date: string; close: number }[];
  dataSource: DataSource;
  liveFallback: boolean; // true if live was requested but sample was used
}

function sma(values: number[], i: number, n: number): number {
  if (i < n - 1) return values[i];
  let sum = 0;
  for (let k = i - n + 1; k <= i; k++) sum += values[k];
  return sum / n;
}

function rsi(closes: number[], i: number, n = 14): number {
  if (i < n) return 50;
  let gains = 0;
  let losses = 0;
  for (let k = i - n + 1; k <= i; k++) {
    const diff = closes[k] - closes[k - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (gains + losses === 0) return 50;
  const rs = gains / (losses || 1e-9);
  return 100 - 100 / (1 + rs);
}

function rollingVol(closes: number[], i: number, n = 10): number {
  if (i < n) return 0;
  const rets: number[] = [];
  for (let k = i - n + 1; k <= i; k++) rets.push(Math.log(closes[k] / closes[k - 1]));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance);
}

function buildFeatures(history: PricePoint[]) {
  const closes = history.map((p) => p.close);
  const rows: { x: number[]; y: number; idx: number }[] = [];
  for (let i = 20; i < closes.length - 1; i++) {
    const ret1 = closes[i] / closes[i - 1] - 1;
    const ret5 = closes[i] / closes[i - 5] - 1;
    const r = (rsi(closes, i) - 50) / 50;
    const smaGap = (closes[i] - sma(closes, i, 20)) / sma(closes, i, 20);
    const vol = rollingVol(closes, i) * 10;
    const y = closes[i + 1] > closes[i] ? 1 : 0; // next day up?
    rows.push({ x: [ret1 * 10, ret5 * 5, r, smaGap * 10, vol], y, idx: i });
  }
  return { rows, closes };
}

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

// Standardize features for stable gradient descent
function standardize(rows: { x: number[]; y: number; idx: number }[]) {
  const n = rows[0].x.length;
  const means = new Array(n).fill(0);
  const stds = new Array(n).fill(0);
  for (const r of rows) r.x.forEach((v, j) => (means[j] += v));
  means.forEach((_, j) => (means[j] /= rows.length));
  for (const r of rows) r.x.forEach((v, j) => (stds[j] += (v - means[j]) ** 2));
  stds.forEach((_, j) => (stds[j] = Math.sqrt(stds[j] / rows.length) || 1));
  return { means, stds };
}

function trainLogistic(rows: { x: number[]; y: number; idx: number }[]) {
  const { means, stds } = standardize(rows);
  const dim = rows[0].x.length;
  const w = new Array(dim).fill(0);
  let b = 0;
  const lr = 0.1;
  const epochs = 300;
  const norm = (x: number[]) => x.map((v, j) => (v - means[j]) / stds[j]);
  for (let e = 0; e < epochs; e++) {
    const gw = new Array(dim).fill(0);
    let gb = 0;
    for (const r of rows) {
      const xn = norm(r.x);
      const p = sigmoid(xn.reduce((a, v, j) => a + v * w[j], b));
      const err = p - r.y;
      xn.forEach((v, j) => (gw[j] += err * v));
      gb += err;
    }
    for (let j = 0; j < dim; j++) w[j] -= (lr * gw[j]) / rows.length;
    b -= (lr * gb) / rows.length;
  }
  const predict = (x: number[]) => sigmoid(norm(x).reduce((a, v, j) => a + v * w[j], b));
  return { predict };
}

function momentumPredict(x: number[]): number {
  // x = [ret1*10, ret5*5, rsi, smaGap*10, vol]
  const score = 0.5 * x[1] + 0.3 * x[3] + 0.2 * x[2];
  return sigmoid(score);
}

export async function runAnalysis(
  symbol: string,
  model: ModelKind,
  dataSource: DataSource = "sample",
  onProgress?: (pct: number, msg: string) => void,
): Promise<AnalysisResult> {
  const step = (pct: number, msg: string) =>
    new Promise<void>((res) => {
      onProgress?.(pct, msg);
      setTimeout(res, 180);
    });

  await step(10, `Loading ${symbol} price history…`);
  let history: PricePoint[];
  let liveFallback = false;
  if (dataSource === "live") {
    try {
      await step(18, "Fetching live market data…");
      history = await fetchLiveHistory(symbol);
    } catch {
      liveFallback = true;
      await step(18, "Live data unavailable — using sample data instead.");
      history = getHistory(symbol);
    }
  } else {
    history = getHistory(symbol);
  }

  await step(30, "Engineering technical indicators (RSI, SMA, volatility)…");
  const { rows, closes } = buildFeatures(history);

  const splitIdx = Math.floor(rows.length * 0.7);
  const train = rows.slice(0, splitIdx);
  const test = rows.slice(splitIdx);

  await step(55, model === "logistic" ? "Training logistic regression…" : "Computing momentum signals…");
  const predictor = model === "logistic" ? trainLogistic(train) : { predict: momentumPredict };

  await step(75, "Backtesting strategy on hold-out data…");
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  let stratEq = 1;
  let bhEq = 1;
  const equityCurve: AnalysisResult["equityCurve"] = [];
  for (const r of test) {
    const p = predictor.predict(r.x);
    const pred = p >= 0.5 ? 1 : 0;
    if (pred === 1 && r.y === 1) tp++;
    else if (pred === 0 && r.y === 0) tn++;
    else if (pred === 1 && r.y === 0) fp++;
    else fn++;
    const dayRet = closes[r.idx + 1] / closes[r.idx] - 1;
    if (pred === 1) stratEq *= 1 + dayRet; // long when predicting up, else flat
    bhEq *= 1 + dayRet;
    equityCurve.push({
      date: history[r.idx + 1].date,
      strategy: Math.round(stratEq * 10000) / 100,
      buyHold: Math.round(bhEq * 10000) / 100,
    });
  }

  const total = tp + tn + fp + fn;
  const accuracy = total ? (tp + tn) / total : 0;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  await step(92, "Generating tomorrow's prediction…");
  const lastRow = rows[rows.length - 1];
  const lastProb = predictor.predict(lastRow.x);
  const direction = lastProb >= 0.5 ? "UP" : "DOWN";
  const confidence = direction === "UP" ? lastProb : 1 - lastProb;

  await step(100, "Done.");

  return {
    symbol,
    model,
    direction,
    confidence,
    lastClose: closes[closes.length - 1],
    accuracy,
    f1,
    strategyReturn: stratEq - 1,
    buyHoldReturn: bhEq - 1,
    equityCurve,
    confusion: { tp, tn, fp, fn },
    priceSeries: history.slice(-90).map((p) => ({ date: p.date, close: p.close })),
  };
}
