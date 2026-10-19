import { getPortfolioTransactions } from "@/lib/transactions";
import { TransactionManager } from "../portfolio/transaction-manager";

export default async function ActivityPage() {
  const { transactions, error } = await getPortfolioTransactions();
  return <div className="space-y-6"><div><p className="text-xs text-white/40">Your private records</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Activity</h2><p className="mt-2 text-sm text-white/42">Purchases and edits recorded in your portfolio.</p></div>{error && <p role="alert" className="rounded-xl border border-amber-200/15 bg-amber-100/[0.035] px-4 py-3 text-xs leading-5 text-amber-50/70">{error}</p>}<TransactionManager transactions={transactions}/></div>;
}
