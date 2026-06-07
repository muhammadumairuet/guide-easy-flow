// Deterministic synthetic-but-realistic daily price history for demo stocks.
// Generated with a seeded PRNG so results are stable across reloads.

export interface PricePoint {
  date: string;
  close: number;
}

export interface StockMeta {
  symbol: string;
  name: string;
  sector: string;
  startPrice: number;
  drift: number; // average daily log-return
  vol: number; // daily volatility
  seed: number;
}

export const STOCKS: StockMeta[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", startPrice: 150, drift: 0.0006, vol: 0.016, seed: 11 },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", startPrice: 320, drift: 0.0007, vol: 0.014, seed: 23 },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Semiconductors", startPrice: 280, drift: 0.0014, vol: 0.028, seed: 37 },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Automotive", startPrice: 210, drift: 0.0004, vol: 0.033, seed: 41 },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "E-commerce", startPrice: 130, drift: 0.0006, vol: 0.019, seed: 53 },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", startPrice: 135, drift: 0.0005, vol: 0.017, seed: 67 },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials", startPrice: 145, drift: 0.0004, vol: 0.013, seed: 71 },
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Media", startPrice: 95, drift: 0.0002, vol: 0.018, seed: 89 },
];

// Mulberry32 seeded PRNG
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal-distributed noise
function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const DAYS = 400;

export function generateHistory(meta: StockMeta): PricePoint[] {
  const rng = mulberry32(meta.seed);
  const points: PricePoint[] = [];
  let price = meta.startPrice;
  const today = new Date();
  // include a couple of regime cycles for more interesting patterns
  for (let i = DAYS; i >= 1; i--) {
    const cycle = Math.sin((DAYS - i) / 28) * 0.0008; // momentum waves
    const ret = meta.drift + cycle + gaussian(rng) * meta.vol;
    price = price * Math.exp(ret);
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    points.push({ date: d.toISOString().slice(0, 10), close: Math.round(price * 100) / 100 });
  }
  return points;
}

const cache = new Map<string, PricePoint[]>();

export function getHistory(symbol: string): PricePoint[] {
  if (cache.has(symbol)) return cache.get(symbol)!;
  const meta = STOCKS.find((s) => s.symbol === symbol);
  if (!meta) throw new Error(`Unknown symbol: ${symbol}`);
  const hist = generateHistory(meta);
  cache.set(symbol, hist);
  return hist;
}

export type DataSource = "sample" | "live";

const liveCache = new Map<string, PricePoint[]>();

// Fetches real market data via the server route. Throws on failure so callers
// can fall back to sample data.
export async function fetchLiveHistory(symbol: string): Promise<PricePoint[]> {
  if (liveCache.has(symbol)) return liveCache.get(symbol)!;
  const res = await fetch(`/api/public/quotes?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Live data unavailable (${res.status})`);
  const json = (await res.json()) as { points?: PricePoint[]; error?: string };
  if (!json.points || json.points.length < 60) {
    throw new Error(json.error || "Live data unavailable");
  }
  liveCache.set(symbol, json.points);
  return json.points;
}
