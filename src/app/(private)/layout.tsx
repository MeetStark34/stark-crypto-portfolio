import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function PrivateLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: settings } = await supabase.from("portfolio_settings").select("display_currency").eq("user_id", user.id).maybeSingle();
  const savedCurrency = settings?.display_currency;
  const displayCurrency = typeof savedCurrency === "string" && ["EUR", "USD", "INR"].includes(savedCurrency) ? savedCurrency : "EUR";
  return <AppShell email={user.email ?? ""} displayCurrency={displayCurrency}>{children}</AppShell>;
}
