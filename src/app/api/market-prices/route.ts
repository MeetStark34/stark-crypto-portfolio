import { NextRequest, NextResponse } from "next/server";
import { CRYPTO_ASSETS, FIAT_CURRENCIES } from "@/lib/crypto-assets.mjs";
import { isSupabaseConfigured } from "@/lib/env";
import { getMarketPricesForUser } from "@/lib/market-data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers: noStore });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view market prices." }, { status: 401, headers: noStore });
  const currency = (request.nextUrl.searchParams.get("currency") ?? "EUR").toUpperCase();
  if (!FIAT_CURRENCIES.includes(currency as typeof FIAT_CURRENCIES[number])) return NextResponse.json({ error: "Unsupported market currency." }, { status: 400, headers: noStore });
  const requested = request.nextUrl.searchParams.get("symbols");
  const symbols = requested ? requested.split(",").map((symbol) => symbol.trim().toUpperCase()) : CRYPTO_ASSETS.map((asset) => asset.symbol);
  if (symbols.some((symbol) => !CRYPTO_ASSETS.some((asset) => asset.symbol === symbol))) return NextResponse.json({ error: "One or more crypto assets are unsupported." }, { status: 400, headers: noStore });
  const result = await getMarketPricesForUser(supabase, user.id, symbols, currency);
  const status = result.error && Object.values(result.prices).every((price) => price.status === "unavailable") ? 502 : 200;
  return NextResponse.json(result, { status, headers: noStore });
}
