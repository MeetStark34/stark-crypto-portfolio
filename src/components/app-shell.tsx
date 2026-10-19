"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Activity, Bell, ChevronDown, CircleDollarSign, LayoutDashboard, LineChart, LogOut, MoreHorizontal, Settings, Target, WalletCards } from "lucide-react";
import { logout, updateDisplayCurrency } from "@/app/actions";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: WalletCards },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];
const mobilePrimary = ["/dashboard", "/portfolio", "/analytics", "/activity"];

export function AppShell({ children, email, displayCurrency }: { children: ReactNode; email: string; displayCurrency: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [currency, setCurrency] = useState(displayCurrency);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [savingCurrency, startSavingCurrency] = useTransition();
  const title = links.find(({ href }) => pathname.startsWith(href))?.label ?? "Dashboard";
  const initial = email?.trim().charAt(0).toUpperCase() || "M";

  return <div className="min-h-screen bg-[#090b0d] text-[#f1f3f1]">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-white/[0.075] bg-[#0c0f10] px-5 py-6 lg:flex">
      <Link href="/dashboard" className="mb-10 flex items-center gap-3 px-1"><span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-[#c4d6cb]"><CircleDollarSign size={19} /></span><span className="text-[10px] font-semibold leading-4 tracking-[.16em]">STARK<br/><span className="text-white/40">CRYPTO PORTFOLIO</span></span></Link>
      <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[.17em] text-white/30">Workspace</p>
      <nav className="flex flex-col gap-1">{links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] transition-colors ${active ? "bg-white/[0.075] text-white" : "text-white/48 hover:bg-white/[0.04] hover:text-white/80"}`}><Icon size={17} strokeWidth={1.8}/>{label}</Link>;
      })}</nav>
      <div className="mt-auto rounded-2xl border border-white/[0.075] bg-white/[0.025] p-4"><p className="text-xs text-white/70">Private by design</p><p className="mt-1 text-[11px] leading-5 text-white/35">Your portfolio belongs to your account.</p></div>
    </aside>

    <div className="lg:pl-[248px]">
      <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-white/[0.075] bg-[#090b0d]/90 px-5 backdrop-blur-xl sm:px-8">
        <div><p className="hidden text-[11px] text-white/35 sm:block">STARK CRYPTO PORTFOLIO <span className="mx-1.5 text-white/20">/</span> {title}</p><h1 className="text-[15px] font-medium tracking-tight text-white/90 sm:mt-1">{title}</h1></div>
        <div className="flex items-center gap-2 sm:gap-3"><label className="sr-only" htmlFor="display-currency">Display currency</label><select id="display-currency" aria-label="Display currency" aria-describedby={currencyError ? "currency-error" : undefined} value={currency} disabled={savingCurrency} onChange={(event) => { const next = event.target.value; setCurrency(next); setCurrencyError(null); startSavingCurrency(async () => { const result = await updateDisplayCurrency(next); if (result.success) router.refresh(); else { setCurrency(displayCurrency); setCurrencyError(result.message ?? "The currency preference could not be saved."); } }); }} className="h-9 rounded-lg border border-white/[0.09] bg-[#111516] px-2 text-[11px] text-white/70 outline-none focus:border-white/25 disabled:opacity-50"><option value="EUR">EUR</option><option value="USD">USD</option><option value="INR">INR</option></select>{currencyError && <span id="currency-error" role="status" className="hidden max-w-40 text-[10px] text-amber-100/60 sm:block">{currencyError}</span>}<span className="hidden text-xs text-white/45 sm:block">@MeetStark</span><div className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-xs text-white/80">{initial}</div><form action={logout} className="hidden sm:block"><button title="Log out" className="grid size-9 place-items-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white"><LogOut size={16}/></button></form></div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-68px)] max-w-[1440px] px-5 pb-28 pt-7 sm:px-8 sm:pt-9 lg:pb-10">{children}</main>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.09] bg-[#0b0e0f]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">{mobilePrimary.map((href) => {
        const link = links.find((item) => item.href === href)!;
        const Icon = link.icon;
        const active = pathname === href;
        return <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-1.5 text-[10px] ${active ? "text-[#c4d6cb]" : "text-white/38"}`}><Icon size={19} strokeWidth={1.8}/>{href === "/dashboard" ? "Home" : link.label}</Link>;
      })}<button onClick={() => setMoreOpen(!moreOpen)} className={`flex flex-col items-center gap-1 py-1.5 text-[10px] ${moreOpen ? "text-[#c4d6cb]" : "text-white/38"}`}><MoreHorizontal size={19}/><span>More</span></button></div>
      {moreOpen && <div className="absolute inset-x-3 bottom-[calc(100%+10px)] rounded-2xl border border-white/10 bg-[#141819] p-2 shadow-2xl">{links.filter(({ href }) => !mobilePrimary.includes(href)).map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/70 hover:bg-white/[0.05]"><Icon size={17}/>{label}<ChevronDown className="ml-auto -rotate-90" size={14}/></Link>)}<form action={logout}><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/55 hover:bg-white/[0.05]"><LogOut size={17}/>Log out</button></form></div>}
    </nav>
    {moreOpen && <button aria-label="Close menu" onClick={() => setMoreOpen(false)} className="fixed inset-0 z-20 bg-black/20 lg:hidden"/>}
  </div>;
}
