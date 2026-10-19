import "server-only";

import { CRYPTO_ASSETS, FIAT_CURRENCIES } from "@/lib/crypto-assets.mjs";

export type MarketPrice = { amount: string | null; updatedAt: string | null; cachedAt?: string | null; status: "fresh" | "stale" | "unavailable" };
export type MarketPriceResult = { currency: string; prices: Record<string, MarketPrice>; error?: string };
export type MarketData = { symbol: string; image: string | null; currentPrice: string; marketCap: string | null; totalVolume: string | null; priceChange24h: string | null; updatedAt: string | null };
export type HistoricalPeriod = number | "max";
export type HistoricalPriceResult = { currency: string; symbol: string; days: HistoricalPeriod; prices: Array<{ timestamp: string; price: string }>; error?: string };

const assets = new Map<string, (typeof CRYPTO_ASSETS)[number]>(CRYPTO_ASSETS.map((asset) => [asset.symbol, asset]));
function decimalString(value: number) {
  const text = String(value);
  if (!/[eE]/.test(text)) return text;
  const [coefficient, exponentText] = text.toLowerCase().split("e");
  const exponent = Number(exponentText);
  const [whole, fraction = ""] = coefficient.split(".");
  const digits = `${whole}${fraction}`;
  const point = whole.length + exponent;
  if (point <= 0) return `0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return `${digits}${"0".repeat(point - digits.length)}`;
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}
const normalizeCurrency = (value: string) => value.toUpperCase();
function validCurrency(currency: string) { return FIAT_CURRENCIES.some((code) => code === currency); }
function validSymbols(symbols: string[]) { return [...new Set(symbols.map((symbol) => symbol.toUpperCase()))].filter((symbol) => assets.has(symbol)); }
function key() { return process.env.COINGECKO_API_KEY; }
function url(path: string, query: Record<string, string>) {
  const result = new URL(`https://api.coingecko.com/api/v3${path}`);
  for (const [name, value] of Object.entries(query)) result.searchParams.set(name, value);
  return result;
}
async function cgFetch<T>(requestUrl: URL, revalidate: number): Promise<T> {
  const apiKey = key();
  if (!apiKey) throw new Error("CoinGecko API key is not configured on the server.");
  const response = await fetch(requestUrl, { headers: { "x-cg-demo-api-key": apiKey }, next: { revalidate } });
  if (!response.ok) throw new Error(response.status === 429 ? "CoinGecko rate limit reached. Try again shortly." : "CoinGecko market data is temporarily unavailable.");
  return response.json() as Promise<T>;
}

export async function getCurrentPrice(symbol: string, currency: string) {
  const result = await getCurrentPrices([symbol], currency);
  return result.prices[symbol.toUpperCase()] ?? { amount: null, updatedAt: null, status: "unavailable" as const };
}

export async function getCurrentPrices(symbols: string[], currency: string): Promise<MarketPriceResult> {
  const fiat = normalizeCurrency(currency);
  if (!validCurrency(fiat)) return { currency: fiat, prices: {}, error: "Unsupported market currency." };
  const selected = validSymbols(symbols);
  if (!selected.length) return { currency: fiat, prices: {}, error: "Select at least one supported crypto asset." };
  try {
    const data = await cgFetch<Record<string, Record<string, number> & { last_updated_at?: number }>>(
      url("/simple/price", { ids: selected.map((symbol) => assets.get(symbol)!.coingeckoId).join(","), vs_currencies: fiat.toLowerCase(), include_last_updated_at: "true", precision: "full" }), 60,
    );
    const prices: MarketPriceResult["prices"] = {};
    for (const symbol of selected) {
      const coin = data[assets.get(symbol)!.coingeckoId];
      const amount = coin?.[fiat.toLowerCase()];
      if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
        const updatedAt = typeof coin?.last_updated_at === "number" ? new Date(coin.last_updated_at * 1000).toISOString() : null;
        const isStale = updatedAt != null && Date.now() - new Date(updatedAt).getTime() > 5 * 60_000;
        prices[symbol] = { amount: decimalString(amount), updatedAt, status: isStale ? "stale" : "fresh" };
      }
    }
    return { currency: fiat, prices, ...(Object.keys(prices).length < selected.length ? { error: "Some requested prices are unavailable from CoinGecko." } : {}) };
  } catch (error) {
    return { currency: fiat, prices: {}, error: error instanceof Error ? error.message : "CoinGecko market data is temporarily unavailable." };
  }
}

export async function getMarketData(symbols: string[], currency: string): Promise<{ currency: string; data: Record<string, MarketData>; error?: string }> {
  const fiat = normalizeCurrency(currency);
  if (!validCurrency(fiat)) return { currency: fiat, data: {}, error: "Unsupported market currency." };
  const selected = validSymbols(symbols);
  if (!selected.length) return { currency: fiat, data: {}, error: "Select at least one supported crypto asset." };
  try {
    const rows = await cgFetch<Array<{ id: string; image?: string; current_price?: number; market_cap?: number; total_volume?: number; price_change_percentage_24h?: number; last_updated?: string }>>(
      url("/coins/markets", { vs_currency: fiat.toLowerCase(), ids: selected.map((symbol) => assets.get(symbol)!.coingeckoId).join(","), price_change_percentage: "24h" }), 300,
    );
    const data: Record<string, MarketData> = {};
    for (const row of rows) {
      const symbol = selected.find((item) => assets.get(item)!.coingeckoId === row.id);
      if (symbol && typeof row.current_price === "number" && Number.isFinite(row.current_price) && row.current_price > 0) data[symbol] = { symbol, image: row.image ?? null, currentPrice: decimalString(row.current_price), marketCap: row.market_cap == null ? null : decimalString(row.market_cap), totalVolume: row.total_volume == null ? null : decimalString(row.total_volume), priceChange24h: row.price_change_percentage_24h == null ? null : decimalString(row.price_change_percentage_24h), updatedAt: row.last_updated ?? null };
    }
    return { currency: fiat, data, ...(Object.keys(data).length < selected.length ? { error: "Some requested market data is unavailable from CoinGecko." } : {}) };
  } catch (error) { return { currency: fiat, data: {}, error: error instanceof Error ? error.message : "CoinGecko market data is temporarily unavailable." }; }
}

export async function getHistoricalPrices(symbol: string, currency: string, days: HistoricalPeriod): Promise<HistoricalPriceResult> {
  const fiat = normalizeCurrency(currency);
  const normalizedSymbol = symbol.toUpperCase();
  if (!validCurrency(fiat)) return { currency: fiat, symbol: normalizedSymbol, days, prices: [], error: "Unsupported market currency." };
  if (!assets.has(normalizedSymbol)) return { currency: fiat, symbol: normalizedSymbol, days, prices: [], error: "Unsupported crypto asset." };
  if (days !== "max" && ![1, 7, 14, 30, 90, 180, 365, 730].includes(days)) return { currency: fiat, symbol: normalizedSymbol, days, prices: [], error: "Choose a supported historical period." };
  try {
    const result = await cgFetch<{ prices?: Array<[number, number]> }>(url(`/coins/${assets.get(normalizedSymbol)!.coingeckoId}/market_chart`, { vs_currency: fiat.toLowerCase(), days: String(days), precision: "full" }), 1800);
    return { currency: fiat, symbol: normalizedSymbol, days, prices: (result.prices ?? []).filter(([timestamp, price]) => Number.isFinite(timestamp) && Number.isFinite(price) && price > 0).map(([timestamp, price]) => ({ timestamp: new Date(timestamp).toISOString(), price: decimalString(price) })) };
  } catch (error) { return { currency: fiat, symbol: normalizedSymbol, days, prices: [], error: error instanceof Error ? error.message : "Historical prices are temporarily unavailable." }; }
}
