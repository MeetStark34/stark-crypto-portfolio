"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const requestedNext = new URL(window.location.href).searchParams.get("next");
      const resolvedNext = new URL(requestedNext || "/dashboard", window.location.origin);
      const next = resolvedNext.origin === window.location.origin
        ? `${resolvedNext.pathname}${resolvedNext.search}${resolvedNext.hash}`
        : "/dashboard";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
      setMessage("Check your inbox for a secure sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send a sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={handleSubmit} className="mt-8">
    <label htmlFor="email" className="mb-2 block text-xs text-white/55">Email address</label>
    <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25" placeholder="you@example.com" />
    <button type="submit" disabled={busy} className="mt-4 h-12 w-full rounded-xl bg-[#d5e2d9] text-sm font-medium text-[#121714] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60">{busy ? "Sending..." : "Email me a sign-in link"}</button>
    {message && <p role="status" className="mt-4 text-sm leading-6 text-white/55">{message}</p>}
  </form>;
}
