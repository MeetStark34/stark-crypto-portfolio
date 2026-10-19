import { NextRequest, NextResponse } from "next/server";
import { getHistoricalPrices, type HistoricalPeriod } from "@/lib/coingecko";
import { buildPortfolioHistory } from "@/lib/portfolio-history.mjs";
import { isSupabaseConfigured } from "@/lib/env";
import { getPortfolioTransactions } from "@/lib/transactions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const periods: Record<string, HistoricalPeriod> = { "1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, ALL: "max" };

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view portfolio performance." }, { status: 401, headers });
  const range = (request.nextUrl.searchParams.get("range") ?? "1M").toUpperCase();
  const days = periods[range];
  if (days == null) return NextResponse.json({ error: "Choose a supported chart range." }, { status: 400, headers });
  const currency = (request.nextUrl.searchParams.get("currency") ?? "EUR").toUpperCase();
  const result = await getPortfolioTransactions();
  if (result.error) return NextResponse.json({ error: result.error }, { status: 503, headers });
  if (!["EUR", "USD", "INR"].includes(currency)) return NextResponse.json({ error: "Unsupported display currency." }, { status: 400, headers });
  const transactions = result.transactions;
  if (!transactions.length) return NextResponse.json({ error: `No ${currency} purchases are recorded.` }, { status: 404, headers });
  const symbols = [...new Set(transactions.map((transaction) => transaction.asset_symbol))];
  const historyResults = await Promise.all(symbols.map(async (symbol) => [symbol, await getHistoricalPrices(symbol, currency, days)] as const));
  const failed = historyResults.find(([, history]) => history.error || !history.prices.length);
  if (failed) return NextResponse.json({ error: failed[1].error ?? `Historical prices for ${failed[0]} are unavailable.` }, { status: 502, headers });
  const points = buildPortfolioHistory(transactions, Object.fromEntries(historyResults.map(([symbol, history]) => [symbol, history.prices] as const)));
  if (!points.length) return NextResponse.json({ error: "There is not enough price history to value your holdings in this range." }, { status: 404, headers });
  return NextResponse.json({ currency, range, points }, { headers });
}
