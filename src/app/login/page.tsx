import Link from "next/link";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = isSupabaseConfigured;
  return <main className="grid min-h-screen place-items-center px-5 py-12"><div className="w-full max-w-md"><Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white/75"><ArrowLeft size={16} /> Back</Link><div className="mb-8 grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#c4d6cb]"><CircleDollarSign size={22} /></div><div className="mb-3 text-xs text-white/38">STARK CRYPTO PORTFOLIO <span className="mx-1 text-white/20">·</span> @MeetStark</div><h1 className="text-3xl font-medium tracking-tight">Welcome back</h1><p className="mt-3 text-sm leading-6 text-white/45">Sign in to your private portfolio.</p>{configured ? <LoginForm /> : <div className="mt-8 rounded-2xl border border-white/[0.09] bg-[#101315] p-5 text-sm leading-6 text-white/55">Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.</div>}<p className="mt-6 text-xs text-white/30">No Revolut connection. No trading. Just your portfolio.</p></div></main>;
}
