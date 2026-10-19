export function convertFiatAmount(value: string, fromCurrency: string, toCurrency: string, rates: Record<string, string>): string;
export function convertTransaction<T extends { total_fiat_amount: string; fee_fiat_amount: string; purchase_value_fiat: string; fiat_currency: string }>(transaction: T, targetCurrency: string, rates: Record<string, string>): T;
export function convertTransactionsAtHistoricalFx<T extends { occurred_at: string; total_fiat_amount: string; fee_fiat_amount: string; purchase_value_fiat: string; fiat_currency: string }>(transactions: T[], targetCurrency: string, fxHistory: Record<string, Record<string, string>>): T[];
export function fxRatesAtDate(history: Record<string, Record<string, string>>, date: string): Record<string, string> | null;
export function monthlyFlows(transactions: Array<{ occurred_at: string; total_fiat_amount: string; fiat_currency: string }>, currency: string, fxHistory: Record<string, Record<string, string>>): Record<string, string>;
export function monthlyPerformance(historyPoints: Array<{ timestamp: string; value: string }>, contributions: Record<string, string>): Array<{ month: string; endValue: string | null; contributed: string; performance: string | null }>;
export function capitalContributionSeries(monthly: Array<{ month: string; contributed: string }>): Array<{ month: string; contributed: string; cumulative: string }>;
