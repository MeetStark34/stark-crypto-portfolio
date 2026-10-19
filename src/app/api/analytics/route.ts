import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getPortfolioTransactions } from "@/lib/transactions";
import { getHistoricalFxRates } from "@/lib/fx-rates";
import { convertTransactionsAtHistoricalFx, monthlyFlows, monthlyPerformance, capitalContributionSeries } from "@/lib/currency-conversion.mjs";
import { getHistoricalPrices } from "@/lib/coingecko";
import { getMarketPricesForUser } from "@/lib/market-data";
import { calculatePortfolio } from "@/lib/portfolio-calculations.mjs";
import { buildPortfolioHistory } from "@/lib/portfolio-history.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view analytics." }, { status: 401, headers });
  const currency = (request.nextUrl.searchParams.get("currency") ?? "EUR").toUpperCase();
  if (!["EUR", "USD", "INR"].includes(currency)) return NextResponse.json({ error: "Choose EUR, USD, or INR." }, { status: 400, headers });
  const result = await getPortfolioTransactions();
  if (result.error) return NextResponse.json({ error: result.error }, { status: 503, headers });
  if (!result.transactions.length) return NextResponse.json({ currency, summary: null, performance: [], monthly: [], contributions: [], historyError: null }, { headers });

  try {
    const firstDate = result.transactions.reduce((date, tx) => tx.occurred_at.slice(0, 10) < date ? tx.occurred_at.slice(0, 10) : date, result.transactions[0].occurred_at.slice(0, 10));
    const today = new Date().toISOString().slice(0, 10);
    const symbols = [...new Set(result.transactions.map((transaction) => transaction.asset_symbol))];
    const needsFx = result.transactions.some((transaction) => transaction.fiat_currency !== currency);
    const [fxHistory, marketHistory, quotes] = await Promise.all([
      needsFx ? getHistoricalFxRates(firstDate, today) : Promise.resolve({}),
      Promise.all(symbols.map(async (symbol) => [symbol, await getHistoricalPrices(symbol, currency, "max")] as const)),
      getMarketPricesForUser(supabase, user.id, symbols, currency),
    ]);
    const converted = convertTransactionsAtHistoricalFx(result.transactions, currency, fxHistory);
    const [summary] = calculatePortfolio(converted, { [currency]: quotes.prices });
    const flows = monthlyFlows(result.transactions, currency, fxHistory);
    const failedMarket = marketHistory.find(([, data]) => data.error || data.prices.length === 0);
    const performance = failedMarket ? [] : buildPortfolioHistory(result.transactions, Object.fromEntries(marketHistory.map(([symbol, data]) => [symbol, data.prices] as const)), 50000);
    const monthly = monthlyPerformance(performance, flows);
    const contributions = capitalContributionSeries(monthly);
    const historyError = failedMarket?.[1].error ?? (failedMarket ? `Historical prices for ${failedMarket[0]} are unavailable.` : null);
    return NextResponse.json({ currency, summary, performance: monthly.map((row) => ({ month: row.month, value: row.endValue })), monthly, contributions, historyError, fxDate: Object.keys(fxHistory).sort().at(-1) ?? null, quoteError: quotes.error ?? null }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analytics data is temporarily unavailable." }, { status: 502, headers });
  }
}
