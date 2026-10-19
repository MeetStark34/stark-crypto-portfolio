"use server";

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";

export async function loginWithPassword(password: string) {
  const configuredPassword = process.env.STARK_PORTFOLIO_PASSWORD;
  const internalEmail = process.env.STARK_PORTFOLIO_AUTH_EMAIL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const suppliedPassword = typeof password === "string" && password.length <= 1024 ? password : "";

  if (!configuredPassword || !internalEmail || !serviceRoleKey || !suppliedPassword) {
    return { success: false as const, message: "Unable to sign in right now. Please try again." };
  }

  const expected = createHash("sha256").update(configuredPassword).digest();
  const supplied = createHash("sha256").update(suppliedPassword).digest();
  if (!timingSafeEqual(expected, supplied)) {
    return { success: false as const, message: "Incorrect password." };
  }

  try {
    const { url } = getSupabaseEnv();
    const admin = createSupabaseClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: internalEmail });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) return { success: false as const, message: "Unable to sign in right now. Please try again." };

    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (verifyError) return { success: false as const, message: "Unable to sign in right now. Please try again." };
  } catch {
    return { success: false as const, message: "Unable to sign in right now. Please try again." };
  }

  return { success: true as const, redirectTo: "/dashboard" };
}
