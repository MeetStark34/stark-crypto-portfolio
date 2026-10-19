import { CircleDollarSign } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const configured = isSupabaseConfigured;
  return <main className="grid min-h-screen place-items-center px-5 py-12"><div className="w-full max-w-md rounded-[28px] border border-white/[0.08] bg-[#101315]/75 p-7 shadow-[0_30px_100px_rgba(0,0,0,.24)] sm:p-9"><div className="mb-8 grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#c4d6cb]"><CircleDollarSign size={22} /></div><p className="text-[11px] font-semibold tracking-[.2em] text-white/55">STARK</p><h1 className="mt-2 text-3xl font-medium tracking-tight">Crypto Portfolio</h1><p className="mt-2 text-sm text-white/42">@MeetStark</p>{configured ? <LoginForm /> : <div className="mt-8 rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 text-sm leading-6 text-white/55">Supabase is not configured yet. Add the required server and public environment variables.</div>}<p className="mt-6 text-center text-xs text-white/28">A private portfolio space</p></div></main>;
}
