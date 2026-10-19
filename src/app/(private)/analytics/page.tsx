import { createClient } from "@/lib/supabase/server";
import { AnalyticsView } from "./analytics-view";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = user ? await supabase.from("portfolio_settings").select("display_currency").eq("user_id", user.id).maybeSingle() : { data: null };
  const savedCurrency = data?.display_currency;
  const currency = typeof savedCurrency === "string" && ["EUR", "USD", "INR"].includes(savedCurrency) ? savedCurrency : "EUR";
  return <AnalyticsView key={currency} currency={currency}/>;
}
