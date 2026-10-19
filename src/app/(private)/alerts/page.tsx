import { createClient } from "@/lib/supabase/server";
import { getMarketPricesForUser } from "@/lib/market-data";
import { parseDecimal } from "@/lib/crypto-assets.mjs";
import { PriceAlerts } from "./price-alerts";

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("portfolio_price_alerts").select("id,asset_symbol,target_price::text,direction,fiat_currency,is_enabled,triggered_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  const alerts = (data ?? []) as Array<{id:string;asset_symbol:string;target_price:string;direction:"above"|"below";fiat_currency:string;is_enabled:boolean;triggered_at:string|null;created_at:string}>;
  const symbols = [...new Set(alerts.filter((a) => a.is_enabled && !a.triggered_at).map((a) => a.asset_symbol))];
  const currencies = [...new Set(alerts.filter((a) => a.is_enabled && !a.triggered_at).map((a) => a.fiat_currency))];
  const prices: Record<string, Record<string, {amount:string|null;status:string}>> = {};
  const results = await Promise.all(currencies.map(async (currency) => [currency, await getMarketPricesForUser(supabase, user.id, symbols, currency)] as const));
  for (const [currency, result] of results) {
    prices[currency] = result.prices;
    for (const alert of alerts) {
      const quote = result.prices[alert.asset_symbol];
      const hit = alert.is_enabled && !alert.triggered_at && alert.fiat_currency === currency && quote?.status === "fresh" && quote.amount != null && (alert.direction === "above" ? parseDecimal(quote.amount, "Current price") >= parseDecimal(alert.target_price, "Target price") : parseDecimal(quote.amount, "Current price") <= parseDecimal(alert.target_price, "Target price"));
      if (hit) {
        const triggeredAt = new Date().toISOString();
        const { data: updated } = await supabase.from("portfolio_price_alerts").update({ triggered_at: triggeredAt }).eq("id", alert.id).eq("user_id", user.id).is("triggered_at", null).select("id").maybeSingle();
        if (updated) alert.triggered_at = triggeredAt;
      }
    }
  }
  return <PriceAlerts alerts={alerts} prices={prices} error={error ? "Price alerts could not be loaded. Apply the portfolio alerts migration and reload." : null}/>;
}
