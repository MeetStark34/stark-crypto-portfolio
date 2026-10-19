import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const resolvedNext = new URL(requestedNext || "/dashboard", request.url);
  const next = resolvedNext.origin === request.nextUrl.origin
    ? `${resolvedNext.pathname}${resolvedNext.search}${resolvedNext.hash}`
    : "/dashboard";
  if (!code || !isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.redirect(new URL(next, request.url));
}
