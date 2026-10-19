import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPrivate = pathname.startsWith("/dashboard") || pathname.startsWith("/portfolio") || pathname.startsWith("/analytics") || pathname.startsWith("/activity") || pathname.startsWith("/alerts") || pathname.startsWith("/targets") || pathname.startsWith("/settings");

  if (!isSupabaseConfigured) {
    if (isPrivate) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next({ request });
  }

  const { response, user } = await updateSession(request);
  const redirectTo = pathname === "/login" && user ? "/dashboard" : pathname === "/" && user ? "/dashboard" : isPrivate && !user ? `/login?next=${encodeURIComponent(pathname)}` : null;
  if (redirectTo) {
    const redirect = NextResponse.redirect(new URL(redirectTo, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
