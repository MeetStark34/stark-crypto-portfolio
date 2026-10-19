"use server";

import { revalidatePath } from "next/cache";
import { parseDecimal } from "@/lib/crypto-assets.mjs";
import { createClient } from "@/lib/supabase/server";

const currencies = ["EUR", "USD", "INR"];
function validId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Select a valid target.");
  return value;
}
function targetInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const goalType = String(formData.get("goalType") ?? "");
  const targetAmount = String(formData.get("targetAmount") ?? "").trim();
  const fiatCurrency = String(formData.get("fiatCurrency") ?? "").toUpperCase();
  const deadlineValue = String(formData.get("deadline") ?? "").trim();
  if (name.length < 1 || name.length > 80) throw new Error("Give your target a name of up to 80 characters.");
  if (goalType !== "portfolio_value" && goalType !== "investment_amount") throw new Error("Choose a supported target type.");
  parseDecimal(targetAmount, "Target amount", { allowZero: false });
  if (!currencies.includes(fiatCurrency)) throw new Error("Choose EUR, USD, or INR.");
  let deadline: string | null = null;
  if (deadlineValue) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadlineValue) || !Number.isFinite(new Date(`${deadlineValue}T00:00:00Z`).getTime())) throw new Error("Enter a valid deadline.");
    deadline = deadlineValue;
  }
  return { name, goal_type: goalType, target_amount: targetAmount, fiat_currency: fiatCurrency, deadline, is_enabled: formData.get("isEnabled") === "on" };
}
function refresh() { revalidatePath("/targets"); revalidatePath("/dashboard"); }

export async function savePortfolioGoal(formData: FormData) {
  try {
    const input = targetInput(formData);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Your session has expired. Sign in again." };
    const idValue = String(formData.get("id") ?? "");
    if (idValue) {
      const { data, error } = await supabase.from("portfolio_goals").update(input).eq("id", validId(idValue)).eq("user_id", user.id).select("id").maybeSingle();
      if (error) return { success: false, message: "The target could not be saved. Check that the migration is applied." };
      if (!data) return { success: false, message: "This target no longer exists." };
    } else {
      const { error } = await supabase.from("portfolio_goals").insert({ ...input, user_id: user.id });
      if (error) return { success: false, message: "The target could not be saved. Check that the migration is applied." };
    }
    refresh(); return { success: true };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "Check the target details and try again." }; }
}

export async function setPortfolioGoalEnabled(idValue: string, enabled: boolean) {
  try {
    const id = validId(idValue);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Your session has expired. Sign in again." };
    const { data, error } = await supabase.from("portfolio_goals").update({ is_enabled: Boolean(enabled) }).eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) return { success: false, message: "That target could not be updated." };
    refresh(); return { success: true };
  } catch { return { success: false, message: "Select a valid target." }; }
}

export async function deletePortfolioGoal(idValue: string) {
  try {
    const id = validId(idValue);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Your session has expired. Sign in again." };
    const { data, error } = await supabase.from("portfolio_goals").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error || !data) return { success: false, message: "That target could not be deleted." };
    refresh(); return { success: true };
  } catch { return { success: false, message: "Select a valid target." }; }
}
