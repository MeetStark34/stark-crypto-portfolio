import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getHistoricalPrices } from "@/lib/coingecko";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view historical prices." }, { status: 401, headers });
  const params = request.nextUrl.searchParams;
  const dayParam = params.get("days") ?? "30";
  const days = dayParam === "max" ? "max" : Number(dayParam);
  const result = await getHistoricalPrices(params.get("symbol") ?? "", params.get("currency") ?? "EUR", days);
  return NextResponse.json(result, { status: result.error ? 502 : 200, headers });
}
