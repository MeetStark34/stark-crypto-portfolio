"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Pencil, RefreshCw, X } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deriveUnitPrice, formatDecimalValue, formatMarketPrice, formatMoneyValue } from "@/lib/crypto-assets.mjs";
import type { PortfolioHolding } from "@/lib/portfolio-calculations.mjs";
import type { PortfolioTransaction } from "@/lib/transactions";
import { Modal } from "@/components/ui";
import { TransactionEditor } from "./transaction-manager";

type Range = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";
type PricePoint = { timestamp: string; price: string };
type PlotPoint = { timestamp: string; value: number; price: string };
const ranges: Range[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];
const days: Record<Range, string> = { "1D": "1", "1W": "7", "1M": "30", "3M": "90", "1Y": "365", ALL: "max" };
const money = (value: string | null, currency: string) => value == null ? "—" : formatMoneyValue(value, currency);
const percent = (value: string | null) => value == null ? "—" : `${formatDecimalValue(value, 2)}%`;

function AssetMark({ symbol, image }: { symbol: string; image?: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/[0.09] bg-white/[0.04] text-sm text-white/70">{image && !failed ? <Image src={image} alt={`${symbol} logo`} fill sizes="48px" className="object-cover" onError={() => setFailed(true)}/> : symbol.slice(0, 1)}</span>;
}

export function AssetDetailDrawer({ holding, currency, image, transactions, onClose }: {
  holding: PortfolioHolding;
  currency: string;
  image?: string;
  transactions: PortfolioTransaction[];
  onClose: () => void;
}) {
  const [range, setRange] = useState<Range>("1M");
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PortfolioTransaction | undefined>();
  const purchases = useMemo(() => transactions.filter((transaction) => transaction.asset_symbol === holding.symbol).sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)), [holding.symbol, transactions]);
  const plot = useMemo<PlotPoint[]>(() => history.map((point) => ({ timestamp: point.timestamp, value: Number(point.price), price: point.price })).filter((point) => Number.isFinite(point.value)), [history]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistoryError(null);
    setHistory([]);
    fetch(`/api/market-prices/history?symbol=${holding.symbol}&currency=${currency}&days=${days[range]}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { prices?: PricePoint[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Price history is unavailable.");
        setHistory(data.prices ?? []);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setHistoryError(error instanceof Error ? error.message : "Price history is unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [currency, holding.symbol, range]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !editing) onClose(); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; };
  }, [editing, onClose]);

  const averagePrice = formatMarketPrice(holding.averagePurchasePrice, currency);
  const allInAverage = formatMarketPrice(holding.averageCostIncludingFees, currency);
  const labelDate = (value: string) => new Intl.DateTimeFormat(undefined, range === "1D" ? { hour: "2-digit", minute: "2-digit" } : range === "ALL" || range === "1Y" ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" }).format(new Date(value));

  return <>
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/65 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="asset-detail-title" tabIndex={-1} className="flex h-full w-full max-w-[680px] flex-col border-l border-white/[0.09] bg-[#0d1112] shadow-2xl outline-none">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5 sm:px-6"><button type="button" onClick={onClose} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs text-white/48 hover:bg-white/[0.05] hover:text-white/80"><ArrowLeft size={15}/>Portfolio</button><button type="button" onClick={onClose} aria-label="Close asset details" className="grid size-9 place-items-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white/80"><X size={17}/></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center gap-3.5"><AssetMark symbol={holding.symbol} image={image}/><div><h2 id="asset-detail-title" className="text-lg font-medium tracking-tight text-white/90">{holding.name}</h2><p className="mt-1 text-xs text-white/40">{holding.symbol} · {currency} portfolio</p></div></div>

          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#111617] p-4 sm:p-5"><p className="text-[10px] uppercase tracking-[.12em] text-white/38">Current price</p><p className="mt-2 text-[30px] font-medium tracking-tight tabular-nums text-white/90">{holding.currentPrice == null ? "Unavailable" : formatMarketPrice(holding.currentPrice, currency)}</p><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/42"><span>{formatDecimalValue(holding.amount, 10)} {holding.symbol} held</span><span className="text-white/20">·</span><span>Current value {money(holding.currentValue, currency)}</span>{holding.priceStatus === "stale" && <span className="text-amber-100/60">Cached quote</span>}</div></div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{[["Total invested", money(holding.totalInvested, currency)], ["Total fees", money(holding.fees, currency)], ["Average purchase", averagePrice], ["All-in average", allInAverage], ["Profit / loss", money(holding.profitLoss, currency)], ["P/L · allocation", `${percent(holding.profitLossPercent)} · ${percent(holding.allocationPercent)}`]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-3.5"><p className="text-[10px] leading-4 text-white/38">{label}</p><p className="mt-1.5 text-sm font-medium tabular-nums text-white/75">{value}</p></div>)}</div>

          <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#111617] p-3.5 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-medium text-white/82">Price performance</h3><p className="mt-1 text-[10px] text-white/35">CoinGecko · {currency}</p></div><div className="flex gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.02] p-1">{ranges.map((item) => <button key={item} type="button" onClick={() => setRange(item)} aria-pressed={range === item} className={`rounded-md px-2 py-1.5 text-[9px] ${range === item ? "bg-white/[0.1] text-white/85" : "text-white/40 hover:text-white/70"}`}>{item}</button>)}</div></div><div className="relative mt-3 h-[190px]">{loading && <div className="absolute inset-0 z-10 grid place-items-center bg-[#111617]/75 text-xs text-white/45"><RefreshCw size={14} className="mr-2 inline animate-spin"/>Loading history</div>}{historyError ? <div className="grid h-full place-items-center px-3 text-center"><div><AlertTriangle size={16} className="mx-auto text-amber-100/50"/><p className="mt-2 text-xs leading-5 text-white/45">{historyError}</p></div></div> : plot.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={plot} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}><XAxis dataKey="timestamp" tickFormatter={(value) => labelDate(value)} minTickGap={32} tick={{ fill: "rgba(255,255,255,.33)", fontSize: 9 }} tickLine={false} axisLine={false}/><YAxis tickFormatter={(value) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 8 }).format(value)} width={65} tick={{ fill: "rgba(255,255,255,.3)", fontSize: 9 }} tickLine={false} axisLine={false}/><Tooltip content={({ active, payload, label }) => { if (!active || !payload?.length) return null; const point = payload[0].payload as PlotPoint; return <div className="rounded-lg border border-white/10 bg-[#171c1b] px-3 py-2 shadow-xl"><p className="text-[10px] text-white/40">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(label)))}</p><p className="mt-1 text-xs tabular-nums text-white/85">{formatMarketPrice(point.price, currency)}</p></div>; }}/><Area type="monotone" dataKey="value" stroke="#b4cdbd" strokeWidth={1.8} fill="#b4cdbd" fillOpacity={0.1} dot={false} activeDot={{ r: 3, fill: "#dce8e0", stroke: "#111617", strokeWidth: 2 }}/></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-xs text-white/35">No price history available</div>}</div></section>

          <section className="mt-6"><div className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-medium text-white/85">Purchases</h3><p className="mt-1 text-[11px] text-white/38">All {holding.symbol} purchases across your fiat currencies · {purchases.length}</p></div></div>
            {purchases.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-xs text-white/38">No purchases recorded for this asset.</div> : <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07]">{purchases.map((purchase) => {
              let unitPrice = "—";
              try { unitPrice = formatMarketPrice(deriveUnitPrice(purchase.purchase_value_fiat, purchase.crypto_amount), purchase.fiat_currency); } catch { /* Keep legacy entries visible. */ }
              return <div key={purchase.id} className="border-b border-white/[0.055] px-3.5 py-3.5 last:border-b-0 sm:px-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-white/72">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(purchase.occurred_at))}</p><p className="mt-1 text-[10px] text-white/35">{purchase.fiat_currency} · {formatDecimalValue(purchase.crypto_amount, 10)} {purchase.asset_symbol} at {unitPrice}</p></div><button type="button" onClick={() => setEditing(purchase)} aria-label={`Edit ${purchase.asset_symbol} purchase`} className="grid size-8 shrink-0 place-items-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white/80"><Pencil size={14}/></button></div><div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><p className="text-white/32">Charged</p><p className="mt-1 tabular-nums text-white/65">{money(purchase.total_fiat_amount, purchase.fiat_currency)}</p></div><div><p className="text-white/32">Fee</p><p className="mt-1 tabular-nums text-white/55">{money(purchase.fee_fiat_amount, purchase.fiat_currency)}</p></div><div><p className="text-white/32">Purchase value</p><p className="mt-1 tabular-nums text-white/65">{money(purchase.purchase_value_fiat, purchase.fiat_currency)}</p></div></div></div>;
            })}</div>}
          </section>
        </div>
      </section>
    </div>
    {editing && <Modal open={Boolean(editing)} onClose={() => setEditing(undefined)} title="Edit purchase"><TransactionEditor key={editing.id} transaction={editing} onClose={() => setEditing(undefined)}/></Modal>}
  </>;
}
