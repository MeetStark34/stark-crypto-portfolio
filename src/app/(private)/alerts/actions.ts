"use server";

import { revalidatePath } from "next/cache";
import { CRYPTO_ASSETS, parseDecimal } from "@/lib/crypto-assets.mjs";
import { createClient } from "@/lib/supabase/server";

const currencies = ["EUR", "USD", "INR"];
function alertId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Select a valid alert.");
  return id;
}
function formInput(formData: FormData) {
  const assetSymbol = String(formData.get("assetSymbol") ?? "").toUpperCase();
  const targetPrice = String(formData.get("targetPrice") ?? "").trim();
  const direction = String(formData.get("direction") ?? "");
  const fiatCurrency = String(formData.get("fiatCurrency") ?? "").toUpperCase();
  if (!CRYPTO_ASSETS.some((asset) => asset.symbol === assetSymbol)) throw new Error("Select a supported crypto asset.");
  parseDecimal(targetPrice, "Target price", { allowZero: false });
  if (direction !== "above" && direction !== "below") throw new Error("Choose whether to alert above or below your target.");
  if (!currencies.includes(fiatCurrency)) throw new Error("Choose EUR, USD, or INR.");
  return { asset_symbol: assetSymbol, target_price: targetPrice, direction, fiat_currency: fiatCurrency, is_enabled: formData.get("enabled") === "on" };
}
function refresh() { revalidatePath("/alerts"); revalidatePath("/dashboard"); }

export async function savePriceAlert(formData: FormData) {
  try {
    const input = formInput(formData);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Your session has expired. Sign in again." };
    const id = String(formData.get("id") ?? "");
    if (id) {
      const { data, error } = await supabase.from("portfolio_price_alerts").update({ ...input, triggered_at: null }).eq("id", alertId(formData)).eq("user_id", user.id).select("id").maybeSingle();
      if (error) return { success: false, message: "The price alert could not be saved. Check that the migration is applied." };
      if (!data) return { success: false, message: "This alert no longer exists." };
    } else {
      const { error } = await supabase.from("portfolio_price_alerts").insert({ ...input, user_id: user.id });
      if (error) return { success: false, message: "The price alert could not be saved. Check that the migration is applied." };
    }
    refresh();
    return { success: true };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "Check the alert details and try again." }; }
}

export async function setPriceAlertEnabled(idValue: string, enabled: boolean) {
  try {
    const form = new FormData(); form.set("id", idValue);
    const id = alertId(form);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Your session has expired. Sign in again." };
    const { data, error } = await supabase.from("portfolio_price_alerts").update({ is_enabled: Boolean(enabled) }).eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) return { success: false, message: "That alert could not be updated." };
    refresh(); return { success: true };
  } catch { return { success: false, message: "Select a valid alert." }; }
}

export async function deletePriceAlert(idValue: string) {
  try {
    const form = new FormData(); form.set("id", idValue);
    const id = alertId(form);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Your session has expired. Sign in again." };
    const { data, error } = await supabase.from("portfolio_price_alerts").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) return { success: false, message: "That alert could not be deleted." };
    refresh(); return { success: true };
  } catch { return { success: false, message: "Select a valid alert." }; }
}
