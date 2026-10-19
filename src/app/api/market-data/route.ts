import { NextRequest, NextResponse } from "next/server";
import { CRYPTO_ASSETS, FIAT_CURRENCIES } from "@/lib/crypto-assets.mjs";
import { getMarketData } from "@/lib/coingecko";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view market data." }, { status: 401, headers });
  const currency = (request.nextUrl.searchParams.get("currency") ?? "EUR").toUpperCase();
  if (!FIAT_CURRENCIES.includes(currency as typeof FIAT_CURRENCIES[number])) return NextResponse.json({ error: "Unsupported market currency." }, { status: 400, headers });
  const symbols = (request.nextUrl.searchParams.get("symbols") ?? CRYPTO_ASSETS.map((asset) => asset.symbol).join(",")).split(",").map((symbol) => symbol.trim().toUpperCase());
  if (symbols.some((symbol) => !CRYPTO_ASSETS.some((asset) => asset.symbol === symbol))) return NextResponse.json({ error: "One or more crypto assets are unsupported." }, { status: 400, headers });
  const result = await getMarketData(symbols, currency);
  return NextResponse.json(result, { status: result.error ? 502 : 200, headers });
}
