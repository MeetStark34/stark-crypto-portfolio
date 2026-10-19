import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentPrices, type MarketPriceResult } from "@/lib/coingecko";

type SnapshotRow = { asset_symbol: string; fiat_currency: string; current_price: string; price_updated_at: string | null; cached_at: string };
const CACHE_SELECT = "asset_symbol,fiat_currency,current_price::text,price_updated_at,cached_at";

/** Fetch live prices and retain the last valid user-scoped snapshot on upstream failure. */
export async function getMarketPricesForUser(supabase: SupabaseClient, userId: string, symbols: string[], currency: string): Promise<MarketPriceResult> {
  const normalized = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))];
  const live = await getCurrentPrices(normalized, currency);
  const valid = Object.entries(live.prices).filter(([, price]) => price.amount != null && Number(price.amount) > 0);
  if (valid.length) {
    const rows = valid.map(([asset_symbol, price]) => ({ user_id: userId, asset_symbol, fiat_currency: live.currency, current_price: price.amount, price_updated_at: price.updatedAt, cached_at: new Date().toISOString() }));
    await supabase.from("portfolio_market_cache").upsert(rows, { onConflict: "user_id,asset_symbol,fiat_currency" });
  }
  if (!live.error && valid.length === normalized.length) return live;

  const { data } = await supabase.from("portfolio_market_cache").select(CACHE_SELECT).eq("user_id", userId).eq("fiat_currency", live.currency).in("asset_symbol", normalized);
  const cached = new Map(((data ?? []) as unknown as SnapshotRow[]).map((row) => [row.asset_symbol, row]));
  const prices = { ...live.prices };
  for (const symbol of normalized) {
    if (prices[symbol]?.amount) continue;
    const row = cached.get(symbol);
    prices[symbol] = row ? { amount: row.current_price, updatedAt: row.price_updated_at, cachedAt: row.cached_at, status: "stale" } : { amount: null, updatedAt: null, status: "unavailable" };
  }
  return { currency: live.currency, prices, ...(live.error ? { error: live.error } : {}) };
}
