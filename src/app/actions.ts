"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayCurrency(currency: string) {
  const selected = String(currency).toUpperCase();
  if (!["EUR", "USD", "INR"].includes(selected)) return { success: false, message: "Choose EUR, USD, or INR." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session has expired. Sign in again." };
  const { error } = await supabase.from("portfolio_settings").upsert({ user_id: user.id, display_currency: selected }, { onConflict: "user_id" });
  if (error) {
    // Keep diagnostics on the server and omit user/session/env data. These
    // fields identify schema, constraint, and RLS failures without secrets.
    console.error("[portfolio-settings] upsert failed", {
      operation: "upsert portfolio_settings on conflict (user_id)",
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { success: false, message: "The currency preference could not be saved." };
  }
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateProfileDisplayName(value: string) {
  const displayName = String(value ?? "").trim();
  if (displayName.length < 1 || displayName.length > 50) return { success: false, message: "Enter a display name of up to 50 characters." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Your session has expired. Sign in again." };
  const { error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, display_name: displayName } });
  if (error) return { success: false, message: "Your display name could not be saved." };
  revalidatePath("/settings");
  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
