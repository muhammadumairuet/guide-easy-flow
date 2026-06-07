// Simple localStorage-backed watchlist of stock symbols. Local only, no account.

const KEY = "stocksight.watchlist";

export function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(symbols: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(symbols));
  } catch {
    /* ignore quota errors */
  }
}

export function addToWatchlist(symbol: string): string[] {
  const list = getWatchlist();
  if (!list.includes(symbol)) list.push(symbol);
  saveWatchlist(list);
  return list;
}

export function removeFromWatchlist(symbol: string): string[] {
  const list = getWatchlist().filter((s) => s !== symbol);
  saveWatchlist(list);
  return list;
}
