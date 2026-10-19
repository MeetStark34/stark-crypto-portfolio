import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ValidatedTransaction } from "@/lib/crypto-assets.mjs";

export type PortfolioTransaction = {
  id: string;
  asset_symbol: string;
  occurred_at: string;
  total_fiat_amount: string;
  fee_fiat_amount: string;
  purchase_value_fiat: string;
  crypto_amount: string;
  fiat_currency: string;
  notes: string | null;
};

export type TransactionListResult = { transactions: PortfolioTransaction[]; error: string | null };
export type TransactionResult = { success: true } | { success: false; message: string };

function databaseMessage(error: { code?: string; message: string }) {
  if (["PGRST204", "PGRST205", "42P01"].includes(error.code ?? "")) {
    return "The portfolio transaction migration has not been applied yet. Apply the SQL migration in supabase/migrations and reload this page.";
  }
  return "The transaction could not be saved. Check the database migration and your connection, then try again.";
}

export async function getPortfolioTransactions(): Promise<TransactionListResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transactions: [], error: "Your session has expired. Sign in again to view transactions." };

  const { data, error } = await supabase
    .from("portfolio_transactions")
    .select("id,asset_symbol,occurred_at,total_fiat_amount::text,fee_fiat_amount::text,purchase_value_fiat::text,crypto_amount::text,fiat_currency,notes")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false });

  if (error) return { transactions: [], error: databaseMessage(error) };
  return { transactions: (data ?? []) as PortfolioTransaction[], error: null };
}

export async function createPortfolioTransaction(userId: string, input: ValidatedTransaction) {
  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_transactions").insert({
    user_id: userId,
    asset_symbol: input.assetSymbol,
    occurred_at: input.occurredAt,
    total_fiat_amount: input.totalFiatAmount,
    fee_fiat_amount: input.feeFiatAmount,
    crypto_amount: input.cryptoAmount,
    fiat_currency: input.fiatCurrency,
    notes: input.notes,
  });
  return error;
}

export async function updatePortfolioTransaction(userId: string, transactionId: string, input: ValidatedTransaction) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("portfolio_transactions").update({
    asset_symbol: input.assetSymbol,
    occurred_at: input.occurredAt,
    total_fiat_amount: input.totalFiatAmount,
    fee_fiat_amount: input.feeFiatAmount,
    crypto_amount: input.cryptoAmount,
    fiat_currency: input.fiatCurrency,
    notes: input.notes,
  }).eq("id", transactionId).eq("user_id", userId).select("id").maybeSingle();
  if (error) return error;
  return data ? null : { code: "PGRST116", message: "Transaction not found" };
}

export async function deletePortfolioTransaction(userId: string, transactionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("portfolio_transactions").delete()
    .eq("id", transactionId).eq("user_id", userId).select("id").maybeSingle();
  if (error) return error;
  return data ? null : { code: "PGRST116", message: "Transaction not found" };
}

export function transactionErrorMessage(error: { code?: string; message: string }) {
  return error.code === "PGRST116" ? "This transaction no longer exists." : databaseMessage(error);
}
