import { decimalFromUnits, parseDecimal } from "./crypto-assets.mjs";

const SCALE = 10n ** 18n;
const units = (value) => parseDecimal(value, "History amount");

/** Values the actual historical quantity at each date using only known market quotes. */
export function buildPortfolioHistory(transactions, pricesBySymbol, maxPoints = 240) {
  const symbols = [...new Set(transactions.map((tx) => tx.asset_symbol))];
  if (!symbols.length || symbols.some((symbol) => !pricesBySymbol[symbol]?.length)) return [];
  const prices = Object.fromEntries(symbols.map((symbol) => [symbol, [...pricesBySymbol[symbol]].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))]));
  const timeline = [...new Set(symbols.flatMap((symbol) => prices[symbol].map((point) => point.timestamp)))].sort((a, b) => Date.parse(a) - Date.parse(b));
  const buys = [...transactions].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at));
  const quantities = Object.fromEntries(symbols.map((symbol) => [symbol, 0n]));
  const latestPrices = {};
  const priceIndexes = Object.fromEntries(symbols.map((symbol) => [symbol, 0]));
  let buyIndex = 0;
  const values = [];

  for (const timestamp of timeline) {
    const time = Date.parse(timestamp);
    while (buyIndex < buys.length && Date.parse(buys[buyIndex].occurred_at) <= time) {
      const tx = buys[buyIndex++];
      quantities[tx.asset_symbol] = (quantities[tx.asset_symbol] ?? 0n) + units(tx.crypto_amount);
    }
    for (const symbol of symbols) {
      const series = prices[symbol];
      let index = priceIndexes[symbol];
      while (index < series.length && Date.parse(series[index].timestamp) <= time) latestPrices[symbol] = units(series[index++].price);
      priceIndexes[symbol] = index;
    }
    let value = 0n;
    let complete = true;
    let hasHoldings = false;
    for (const symbol of symbols) {
      const amount = quantities[symbol] ?? 0n;
      if (amount === 0n) continue;
      hasHoldings = true;
      if (latestPrices[symbol] == null) { complete = false; break; }
      value += (amount * latestPrices[symbol]) / SCALE;
    }
    if (complete && hasHoldings) values.push({ timestamp, value: decimalFromUnits(value) });
  }

  if (values.length <= maxPoints) return values;
  const sampled = [];
  for (let i = 0; i < maxPoints; i++) sampled.push(values[Math.round(i * (values.length - 1) / (maxPoints - 1))]);
  return sampled;
}
