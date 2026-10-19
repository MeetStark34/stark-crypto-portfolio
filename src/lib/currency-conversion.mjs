import { parseDecimal, decimalFromUnits } from "./crypto-assets.mjs";

/** Convert fiat using rates quoted as units of each currency per EUR. */
export function convertFiatAmount(value, fromCurrency, toCurrency, rates) {
  const from = String(fromCurrency).toUpperCase();
  const to = String(toCurrency).toUpperCase();
  if (from === to) return decimalFromUnits(parseDecimal(value, "Fiat amount"));
  const fromRate = parseDecimal(rates[from], "Source currency rate", { allowZero: false });
  const toRate = parseDecimal(rates[to], "Target currency rate", { allowZero: false });
  const amount = parseDecimal(value, "Fiat amount");
  return decimalFromUnits((amount * toRate) / fromRate);
}

export function convertTransaction(transaction, targetCurrency, rates) {
  return {
    ...transaction,
    total_fiat_amount: convertFiatAmount(transaction.total_fiat_amount, transaction.fiat_currency, targetCurrency, rates),
    fee_fiat_amount: convertFiatAmount(transaction.fee_fiat_amount, transaction.fiat_currency, targetCurrency, rates),
    purchase_value_fiat: convertFiatAmount(transaction.purchase_value_fiat, transaction.fiat_currency, targetCurrency, rates),
    fiat_currency: targetCurrency,
  };
}

export function convertTransactionsAtHistoricalFx(transactions, targetCurrency, fxHistory) {
  return transactions.map((transaction) => {
    const rates = fxRatesAtDate(fxHistory, transaction.occurred_at);
    if (!rates && transaction.fiat_currency !== targetCurrency) throw new Error("Historical currency conversion rates are unavailable for one or more purchases.");
    return convertTransaction(transaction, targetCurrency, rates ?? {});
  });
}

/** Use the last available daily reference rate on or before a transaction date. */
export function fxRatesAtDate(history, date) {
  const key = new Date(date).toISOString().slice(0, 10);
  const available = Object.keys(history).filter((day) => day <= key).sort();
  return available.length ? history[available[available.length - 1]] : null;
}

export function monthlyFlows(transactions, currency, fxHistory) {
  const totals = new Map();
  for (const tx of transactions) {
    const rates = fxRatesAtDate(fxHistory, tx.occurred_at);
    if (!rates && tx.fiat_currency !== currency) throw new Error("Historical currency conversion rates are unavailable for one or more purchases.");
    const amount = convertFiatAmount(tx.total_fiat_amount, tx.fiat_currency, currency, rates ?? {});
    const key = tx.occurred_at.slice(0, 7);
    const units = parseDecimal(totals.get(key) ?? "0", "Monthly contribution") + parseDecimal(amount, "Monthly contribution");
    totals.set(key, decimalFromUnits(units));
  }
  return Object.fromEntries(totals);
}

export function monthlyPerformance(historyPoints, contributions) {
  const monthEnds = new Map();
  for (const point of historyPoints) monthEnds.set(point.timestamp.slice(0, 7), point.value);
  const months = [...new Set([...monthEnds.keys(), ...Object.keys(contributions)])].sort();
  return months.map((month, index) => {
    const endValue = monthEnds.get(month);
    const previous = index ? monthEnds.get(months[index - 1]) : null;
    if (endValue == null || previous == null) return { month, endValue: endValue ?? null, contributed: contributions[month] ?? "0", performance: null };
    const end = parseDecimal(endValue, "Portfolio value");
    const start = parseDecimal(previous, "Portfolio value");
    const contribution = parseDecimal(contributions[month] ?? "0", "Monthly contribution");
    return { month, endValue, contributed: decimalFromUnits(contribution), performance: decimalFromUnits(end - start - contribution) };
  });
}

export function capitalContributionSeries(monthly) {
  let cumulative = 0n;
  return monthly.map((row) => {
    cumulative += parseDecimal(row.contributed, "Contribution");
    return { month: row.month, contributed: row.contributed, cumulative: decimalFromUnits(cumulative) };
  });
}
