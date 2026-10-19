import { CircleHelp, ShieldCheck } from "lucide-react";
import { TransactionManager } from "./transaction-manager";
import { PortfolioReport } from "./portfolio-report";
import { getPortfolioTransactions } from "@/lib/transactions";
import { createClient } from "@/lib/supabase/server";
import { getMarketPricesForUser } from "@/lib/market-data";
import { getMarketData } from "@/lib/coingecko";
import { calculatePortfolio } from "@/lib/portfolio-calculations.mjs";
import type { MarketPriceResult } from "@/lib/coingecko";
import { getHistoricalFxRates } from "@/lib/fx-rates";
import { convertTransactionsAtHistoricalFx } from "@/lib/currency-conversion.mjs";

export default async function PortfolioPage() {
  const { transactions, error } = await getPortfolioTransactions();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: settings } = user ? await supabase.from("portfolio_settings").select("display_currency").eq("user_id", user.id).maybeSingle() : { data: null };
  const savedCurrency = settings?.display_currency;
  const currency = typeof savedCurrency === "string" && ["EUR", "USD", "INR"].includes(savedCurrency) ? savedCurrency : "EUR";
  let summaries = [] as ReturnType<typeof calculatePortfolio>;
  let marketErrors: Record<string, string> = {};
  if (transactions.length) try {
    const firstDate = transactions.reduce((date, tx) => tx.occurred_at.slice(0, 10) < date ? tx.occurred_at.slice(0, 10) : date, transactions[0].occurred_at.slice(0, 10));
    const needsFx = transactions.some((transaction) => transaction.fiat_currency !== currency);
    const fx = needsFx ? await getHistoricalFxRates(firstDate, new Date().toISOString().slice(0, 10)) : {};
    const converted = convertTransactionsAtHistoricalFx(transactions, currency, fx);
    const symbols = [...new Set(transactions.map((transaction) => transaction.asset_symbol))];
    const quotes = user ? await getMarketPricesForUser(supabase, user.id, symbols, currency) : { currency, prices: {}, error: "Sign in to view market prices." } as MarketPriceResult;
    summaries = calculatePortfolio(converted, { [currency]: quotes.prices });
    if (quotes.error) marketErrors[currency] = quotes.error;
  } catch (caught) {
    marketErrors[currency] = caught instanceof Error ? caught.message : "Currency conversion is unavailable.";
  }
  const allSymbols = [...new Set(transactions.map((transaction) => transaction.asset_symbol))];
  const marketAssets = allSymbols.length ? await getMarketData(allSymbols, currency) : null;
  const assetImages = Object.fromEntries(Object.entries(marketAssets?.data ?? {}).flatMap(([symbol, data]) => data.image ? [[symbol, data.image] as const] : []));

  return <div className="space-y-7 sm:space-y-8">
    <div><p className="text-xs text-white/40">Your private records</p><h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-[28px]">Portfolio</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/42">Track your holdings, cost basis and CoinGecko valuation in your selected display currency. Original purchase records retain their entered currency.</p></div>
    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200/15 bg-amber-100/[0.035] px-4 py-3.5"><CircleHelp size={16} className="mt-0.5 shrink-0 text-amber-100/60"/><p className="text-xs leading-5 text-amber-50/70">{error}</p></div>}
    {!error && !summaries.length && marketErrors[currency] && <div role="status" className="rounded-xl border border-amber-100/10 bg-amber-100/[0.03] px-4 py-3 text-xs leading-5 text-amber-50/70">{marketErrors[currency]}</div>}
    {!error && <PortfolioReport key={currency} summaries={summaries} marketErrors={marketErrors} transactions={transactions} assetImages={assetImages}/>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"><p className="text-xs text-white/38">Transactions recorded</p><p className="mt-2 text-xl tabular-nums text-white/75">{error ? "—" : transactions.length}</p></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"><p className="text-xs text-white/38">Supported crypto assets</p><p className="mt-2 text-xl tabular-nums text-white/75">10</p></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"><div className="flex items-center gap-2 text-xs text-white/38"><ShieldCheck size={14}/>Ownership protection</div><p className="mt-2 text-sm text-white/65">Supabase Auth + row security</p></div></div>
    <TransactionManager transactions={transactions}/>
  </div>;
}
