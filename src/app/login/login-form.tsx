"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword } from "./actions";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await loginWithPassword(password);
      if (result.success) {
        router.replace(result.redirectTo);
        router.refresh();
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={handleSubmit} className="mt-9">
    <label htmlFor="password" className="mb-2 block text-xs text-white/55">Password</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c4d6cb]/60 focus:ring-2 focus:ring-[#c4d6cb]/15" />
    <button type="submit" disabled={busy || !password} className="mt-4 h-12 w-full rounded-xl bg-[#d5e2d9] text-sm font-medium text-[#121714] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60">{busy ? "Signing in…" : "Enter Portfolio"}</button>
    {message && <p role="alert" className="mt-4 text-sm leading-6 text-rose-200/80">{message}</p>}
  </form>;
}
