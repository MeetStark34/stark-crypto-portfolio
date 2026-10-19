"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateTransaction } from "@/lib/crypto-assets.mjs";
import { createPortfolioTransaction, deletePortfolioTransaction, transactionErrorMessage, updatePortfolioTransaction, type TransactionResult } from "@/lib/transactions";

function transactionIdFrom(formData: FormData) {
  const id = String(formData.get("transactionId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Select a valid transaction.");
  }
  return id;
}

function inputFrom(formData: FormData) {
  const value = (name: string) => {
    const entry = formData.get(name);
    return typeof entry === "string" ? entry : "";
  };
  return validateTransaction({
    assetSymbol: value("assetSymbol"),
    occurredAt: value("occurredAt"),
    totalFiatAmount: value("totalFiatAmount"),
    feeFiatAmount: value("feeFiatAmount"),
    cryptoAmount: value("cryptoAmount"),
    fiatCurrency: value("fiatCurrency"),
    notes: value("notes"),
  });
}

export async function saveTransaction(formData: FormData): Promise<TransactionResult> {
  try {
    const input = inputFrom(formData);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Your session has expired. Sign in again." };

    const id = String(formData.get("transactionId") ?? "");
    const error = id
      ? await updatePortfolioTransaction(user.id, transactionIdFrom(formData), input)
      : await createPortfolioTransaction(user.id, input);
    if (error) return { success: false, message: transactionErrorMessage(error) };

    revalidatePath("/portfolio");
    revalidatePath("/activity");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Check the transaction details and try again." };
  }
}

export async function removeTransaction(formData: FormData): Promise<TransactionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Your session has expired. Sign in again." };

    const id = transactionIdFrom(formData);
    const error = await deletePortfolioTransaction(user.id, id);
    if (error) return { success: false, message: transactionErrorMessage(error) };

    revalidatePath("/portfolio");
    revalidatePath("/activity");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to delete the transaction." };
  }
}
