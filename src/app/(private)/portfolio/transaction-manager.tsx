"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Input, Modal, Select } from "@/components/ui";
import { CRYPTO_ASSETS, FIAT_CURRENCIES, formatDecimalValue, formatMoneyValue, formatUnitPrice, subtractDecimalValues } from "@/lib/crypto-assets.mjs";
import { removeTransaction, saveTransaction } from "./actions";
import type { MarketPriceResult } from "@/lib/coingecko";
import type { PortfolioTransaction } from "@/lib/transactions";

function localInputDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function numberForDisplay(value: string, maxFractionDigits = 2) {
  try { return formatDecimalValue(value, maxFractionDigits); }
  catch { return "—"; }
}

function moneyForDisplay(value: string, currency: string) {
  try { return formatMoneyValue(value, currency); }
  catch { return "—"; }
}

function quoteForDisplay(value: string, currency: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 8 }).format(numeric);
}

function unitPriceForDisplay(purchaseValue: string, cryptoAmount: string, currency: string) {
  try { return formatUnitPrice(purchaseValue, cryptoAmount, currency); }
  catch { return "—"; }
}

export function TransactionEditor({ transaction, onClose }: { transaction?: PortfolioTransaction; onClose: () => void }) {
  const router = useRouter();
  const [assetSymbol, setAssetSymbol] = useState(transaction?.asset_symbol ?? "BTC");
  const [currency, setCurrency] = useState(transaction?.fiat_currency ?? "EUR");
  const [total, setTotal] = useState(transaction?.total_fiat_amount ?? "");
  const [fee, setFee] = useState(transaction?.fee_fiat_amount ?? "0");
  const [cryptoAmount, setCryptoAmount] = useState(transaction?.crypto_amount ?? "");
  const [occurredAt, setOccurredAt] = useState(localInputDate(transaction?.occurred_at));
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [market, setMarket] = useState<MarketPriceResult | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setMarketLoading(true);
    fetch(`/api/market-prices?currency=${encodeURIComponent(currency)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as Partial<MarketPriceResult>;
        setMarket({ currency, prices: result.prices ?? {}, error: result.error });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setMarket({ currency, prices: {}, error: "CoinGecko market prices are temporarily unavailable." });
      })
      .finally(() => { if (!controller.signal.aborted) setMarketLoading(false); });
    return () => controller.abort();
  }, [currency]);

  const purchaseValue = useMemo(() => {
    try { return total && fee ? subtractDecimalValues(total, fee) : ""; }
    catch { return ""; }
  }, [total, fee]);
  const currentQuote = market?.prices[assetSymbol]?.amount;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    if (transaction) formData.set("transactionId", transaction.id);
    try {
      const result = await saveTransaction(formData);
      if (!result.success) { setMessage(result.message); return; }
      router.refresh();
      onClose();
    } catch {
      setMessage("The transaction could not be saved. Check your connection and try again.");
    } finally { setSaving(false); }
  }

  async function deleteTransaction() {
    if (!transaction) return;
    setSaving(true);
    const formData = new FormData();
    formData.set("transactionId", transaction.id);
    try {
      const result = await removeTransaction(formData);
      if (!result.success) { setMessage(result.message); setConfirmDelete(false); return; }
      router.refresh();
      onClose();
    } catch {
      setMessage("The transaction could not be deleted. Check your connection and try again.");
      setConfirmDelete(false);
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-2 text-xs text-white/55">Crypto asset<Select name="assetSymbol" value={assetSymbol} onChange={(event) => setAssetSymbol(event.target.value)} className="w-full">{CRYPTO_ASSETS.map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.symbol} · {asset.name}</option>)}</Select></label>
      <label className="space-y-2 text-xs text-white/55">Fiat currency<Select name="fiatCurrency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full">{FIAT_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}</Select></label>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-2 text-xs text-white/55">Total amount charged<Input name="totalFiatAmount" type="text" inputMode="decimal" autoComplete="off" required value={total} onChange={(event) => setTotal(event.target.value)} placeholder={`0.00 ${currency}`} aria-describedby="total-hint"/></label>
      <label className="space-y-2 text-xs text-white/55">Fee included in total<Input name="feeFiatAmount" type="text" inputMode="decimal" autoComplete="off" required value={fee} onChange={(event) => setFee(event.target.value)} placeholder={`0.00 ${currency}`} aria-describedby="fee-hint"/></label>
    </div>
    <p id="total-hint" className="-mt-2 text-[11px] leading-5 text-white/35">Full cash outflow. Enter the charged amount including the fee.</p>

    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-2 text-xs text-white/55">Crypto amount received<Input name="cryptoAmount" type="text" inputMode="decimal" autoComplete="off" required value={cryptoAmount} onChange={(event) => setCryptoAmount(event.target.value)} placeholder="0.00000000"/></label>
      <label className="space-y-2 text-xs text-white/55">Date and time<Input name="occurredAt" type="datetime-local" step="60" required value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)}/></label>
    </div>

    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-white/42">Purchase value, excluding fee</span><span className="text-sm font-medium tabular-nums">{purchaseValue ? moneyForDisplay(purchaseValue, currency) : "—"}</span></div>
      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-white/42">Purchase price per {assetSymbol}, excluding fee</span><span className="text-sm tabular-nums">{purchaseValue && cryptoAmount ? unitPriceForDisplay(purchaseValue, cryptoAmount, currency) : "—"}</span></div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3"><span className="flex items-center gap-1.5 text-xs text-white/38">{marketLoading ? <span className="size-1.5 animate-pulse rounded-full bg-white/40"/> : <span className={`size-1.5 rounded-full ${currentQuote ? market?.prices[assetSymbol]?.status === "stale" ? "bg-amber-100/60" : "bg-[#a9c7b5]" : "bg-white/20"}`}/>}CoinGecko market price</span><span className="text-xs tabular-nums text-white/55">{currentQuote ? <>{quoteForDisplay(currentQuote, currency)}{market?.prices[assetSymbol]?.status === "stale" && <span className="ml-1 text-[10px] text-amber-100/50">cached</span>}</> : market?.error ? "Unavailable" : "—"}</span></div>
      {market?.error && <p className="mt-2 text-[10px] leading-4 text-white/30">{market.error}</p>}
      <p id="fee-hint" className="mt-3 text-[10px] leading-4 text-white/32">The fee is part of the total outflow. The purchase value above is total charged minus fee, so the fee is counted once.</p>
    </div>

    <label className="block space-y-2 text-xs text-white/55">Notes <span className="text-white/30">(optional)</span><textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.025] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25" placeholder="Add a note about this purchase"/></label>

    {message && <p role="alert" className="rounded-xl border border-red-300/15 bg-red-300/[0.04] px-3.5 py-3 text-xs leading-5 text-red-100/80">{message}</p>}
    {confirmDelete && <div className="rounded-xl border border-red-300/15 bg-red-300/[0.04] p-3.5"><p className="text-sm text-white/80">Delete this transaction?</p><p className="mt-1 text-xs text-white/40">This permanently removes it from your portfolio history.</p><div className="mt-3 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}><X size={14}/>Cancel</Button><Button type="button" disabled={saving} onClick={deleteTransaction} className="bg-red-300 text-[#201313] hover:bg-red-200"><Trash2 size={14}/>{saving ? "Deleting..." : "Delete transaction"}</Button></div></div>}

    <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
      <div>{transaction && !confirmDelete && <Button type="button" variant="ghost" onClick={() => { setMessage(""); setConfirmDelete(true); }}><Trash2 size={15}/>Delete</Button>}</div>
      <div className="flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || confirmDelete}><Check size={15}/>{saving ? "Saving..." : transaction ? "Save changes" : "Add transaction"}</Button></div>
    </div>
  </form>;
}

export function TransactionManager({ transactions }: { transactions: PortfolioTransaction[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioTransaction | undefined>();
  function add() { setEditing(undefined); setOpen(true); }
  function edit(transaction: PortfolioTransaction) { setEditing(transaction); setOpen(true); }
  const close = () => setOpen(false);

  return <>
    <Button onClick={add}><Plus size={16}/>Add transaction</Button>
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101415]">
      {transactions.length === 0 ? <div className="p-4 sm:p-6"><div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] px-6 py-14 text-center"><p className="text-sm text-white/72">No transactions yet</p><p className="mt-2 max-w-sm text-xs leading-5 text-white/38">Record a purchase to begin your personal portfolio history.</p><Button onClick={add} className="mt-5"><Plus size={15}/>Add your first transaction</Button></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[.12em] text-white/32"><th className="px-5 py-4 font-medium">Asset</th><th className="px-4 py-4 font-medium">Amount received</th><th className="px-4 py-4 text-right font-medium">Purchase value</th><th className="px-4 py-4 text-right font-medium">Fee</th><th className="px-4 py-4 text-right font-medium">Total charged</th><th className="px-4 py-4 text-right font-medium">Price / coin</th><th className="px-4 py-4 font-medium">Date</th><th className="px-4 py-4"/></tr></thead><tbody className="divide-y divide-white/[0.055]">{transactions.map((transaction) => {
        const asset = CRYPTO_ASSETS.find((item) => item.symbol === transaction.asset_symbol);
        let purchasePrice = "—";
        try { purchasePrice = formatUnitPrice(transaction.purchase_value_fiat, transaction.crypto_amount, transaction.fiat_currency); } catch { /* Older malformed rows are still editable. */ }
        return <tr key={transaction.id} className="group hover:bg-white/[0.018]"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-[10px] font-medium text-white/70">{transaction.asset_symbol.slice(0, 1)}</span><span><span className="block text-sm font-medium text-white/80">{asset?.name ?? transaction.asset_symbol}</span><span className="mt-0.5 block text-[10px] text-white/38">{transaction.asset_symbol}</span></span></div></td><td className="px-4 py-4 text-sm tabular-nums text-white/70">{numberForDisplay(transaction.crypto_amount, 10)} <span className="text-[10px] text-white/38">{transaction.asset_symbol}</span></td><td className="px-4 py-4 text-right text-sm tabular-nums text-white/72">{moneyForDisplay(transaction.purchase_value_fiat, transaction.fiat_currency)}</td><td className="px-4 py-4 text-right text-sm tabular-nums text-white/48">{moneyForDisplay(transaction.fee_fiat_amount, transaction.fiat_currency)}</td><td className="px-4 py-4 text-right text-sm tabular-nums text-white/75">{moneyForDisplay(transaction.total_fiat_amount, transaction.fiat_currency)}</td><td className="px-4 py-4 text-right text-sm tabular-nums text-white/55">{purchasePrice}</td><td className="px-4 py-4 text-xs text-white/48">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(transaction.occurred_at))}</td><td className="px-4 py-4 text-right"><Button variant="ghost" onClick={() => edit(transaction)} aria-label={`Edit ${transaction.asset_symbol} transaction`} className="size-9 min-h-9 px-0 opacity-100 sm:opacity-50 sm:group-hover:opacity-100"><Pencil size={15}/></Button></td></tr>;
      })}</tbody></table></div>}
    </div>
    <div className="flex items-start gap-2.5 text-[11px] leading-5 text-white/35"><span className="mt-0.5 text-[#c4d6cb]/60">i</span><p>Purchase value excludes the fee. Total charged includes the fee and represents your cash outflow. Fees are counted once.</p></div>
    {open && <Modal open={open} onClose={close} title={editing ? "Edit transaction" : "Add transaction"}><TransactionEditor key={editing?.id ?? "new-transaction"} transaction={editing} onClose={close}/></Modal>}
  </>;
}
