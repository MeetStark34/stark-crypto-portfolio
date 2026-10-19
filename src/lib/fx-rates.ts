import "server-only";

export type FxRatePoint = { date: string; base: string; quote: string; rate: number };
export type FxRates = { date: string; base: "EUR"; rates: Record<string, string>; stale?: boolean };

const currencies = ["USD", "INR", "GBP", "CHF"];
const api = "https://api.frankfurter.dev/v2/rates";

export async function getLatestFxRates(): Promise<FxRates> {
  const response = await fetch(`${api}?base=EUR&quotes=${currencies.join(",")}`, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Live currency conversion rates are unavailable.");
  const rows = await response.json() as FxRatePoint[];
  const rates: Record<string, string> = { EUR: "1" };
  for (const row of rows) if (currencies.includes(row.quote) && Number.isFinite(row.rate) && row.rate > 0) rates[row.quote] = String(row.rate);
  if (currencies.some((currency) => !rates[currency])) throw new Error("Some currency conversion rates are unavailable.");
  return { date: rows.reduce((latest, row) => row.date > latest ? row.date : latest, ""), base: "EUR", rates };
}

export async function getHistoricalFxRates(from: string, to: string): Promise<Record<string, Record<string, string>>> {
  const response = await fetch(`${api}?base=EUR&quotes=${currencies.join(",")}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error("Historical currency conversion rates are unavailable.");
  const rows = await response.json() as FxRatePoint[];
  const byDate: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    if (!Number.isFinite(row.rate) || row.rate <= 0) continue;
    (byDate[row.date] ??= { EUR: "1" })[row.quote] = String(row.rate);
  }
  return byDate;
}
