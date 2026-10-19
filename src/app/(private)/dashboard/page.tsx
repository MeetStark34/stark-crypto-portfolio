import { DashboardView } from "./dashboard-view";
import { calculatePortfolio } from "@/lib/portfolio-calculations.mjs";
import { getMarketData } from "@/lib/coingecko";
import { getMarketPricesForUser } from "@/lib/market-data";
import { getPortfolioTransactions } from "@/lib/transactions";
import { createClient } from "@/lib/supabase/server";
import { getHistoricalFxRates } from "@/lib/fx-rates";
import { convertTransactionsAtHistoricalFx } from "@/lib/currency-conversion.mjs";

export default async function DashboardPage() {
  const { transactions, error } = await getPortfolioTransactions();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: settings } = user ? await supabase.from("portfolio_settings").select("display_currency").eq("user_id", user.id).maybeSingle() : { data: null };
  const savedCurrency = settings?.display_currency;
  const currency = typeof savedCurrency === "string" && ["EUR", "USD", "INR"].includes(savedCurrency) ? savedCurrency : "EUR";
  let conversionError: string | null = null;
  let convertedTransactions = transactions;
  if (transactions.length) try {
    const firstDate = transactions.reduce((date, tx) => tx.occurred_at.slice(0, 10) < date ? tx.occurred_at.slice(0, 10) : date, transactions[0].occurred_at.slice(0, 10));
    const needsFx = transactions.some((transaction) => transaction.fiat_currency !== currency);
    const fx = needsFx ? await getHistoricalFxRates(firstDate, new Date().toISOString().slice(0, 10)) : {};
    convertedTransactions = convertTransactionsAtHistoricalFx(transactions, currency, fx);
  } catch (caught) { conversionError = caught instanceof Error ? caught.message : "Currency conversion is unavailable."; }
  const symbols = [...new Set(transactions.map((transaction) => transaction.asset_symbol))];
  const quotes = !conversionError && user ? await getMarketPricesForUser(supabase, user.id, symbols, currency) : { prices: {} };
  const summaries = conversionError ? [] : calculatePortfolio(convertedTransactions, { [currency]: quotes.prices });
  const marketData = symbols.length ? await getMarketData(symbols, currency) : null;
  const assetImages = Object.fromEntries(Object.entries(marketData?.data ?? {}).flatMap(([symbol, data]) => data.image ? [[symbol, data.image] as const] : []));

  return <DashboardView key={currency} summaries={summaries} assetImages={assetImages} transactions={transactions} displayCurrency={currency} initialError={error ?? conversionError}/>;
}
