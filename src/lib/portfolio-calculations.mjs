import { CRYPTO_ASSETS, parseDecimal, decimalFromUnits } from "./crypto-assets.mjs";

const SCALE = 10n ** 18n;
const assetInfo = new Map(CRYPTO_ASSETS.map((asset) => [asset.symbol, asset]));
const divScaled = (numerator, denominator) => denominator === 0n ? null : (numerator * SCALE) / denominator;
const from = (value) => parseDecimal(value, "Portfolio amount");
const signed = (value) => String(value).startsWith("-") ? -from(String(value).slice(1)) : from(value);
const ratioPercent = (numerator, denominator) => denominator === 0n ? null : decimalFromUnits((numerator * 100n * SCALE) / denominator);
const multiply = (left, right) => (left * right) / SCALE;

function comparePerformance(a, b) {
  const left = a.profitLossUnits * b.investedUnits;
  const right = b.profitLossUnits * a.investedUnits;
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Computes independent fiat books. Purchase fees are already included in totalFiatAmount. */
export function calculatePortfolio(transactions, pricesByCurrency = {}) {
  const currencies = [...new Set(transactions.map((tx) => String(tx.fiat_currency).toUpperCase()))].sort();
  return currencies.map((currency) => {
    const rows = transactions.filter((tx) => String(tx.fiat_currency).toUpperCase() === currency);
    const grouped = new Map();
    for (const tx of rows) {
      const symbol = String(tx.asset_symbol).toUpperCase();
      const item = grouped.get(symbol) ?? { symbol, amount: 0n, invested: 0n, fees: 0n, purchaseValue: 0n };
      item.amount += from(tx.crypto_amount);
      item.invested += from(tx.total_fiat_amount);
      item.fees += from(tx.fee_fiat_amount);
      item.purchaseValue += from(tx.purchase_value_fiat ?? decimalFromUnits(from(tx.total_fiat_amount) - from(tx.fee_fiat_amount)));
      grouped.set(symbol, item);
    }
    const prices = pricesByCurrency[currency] ?? {};
    let totalInvested = 0n;
    let totalFees = 0n;
    let totalMarket = 0n;
    let complete = true;
    let stale = false;
    const holdings = [...grouped.values()].map((item) => {
      totalInvested += item.invested;
      totalFees += item.fees;
      const quote = prices[item.symbol];
      const currentPrice = quote && quote.amount != null ? from(quote.amount) : null;
      const currentValue = currentPrice == null ? null : multiply(item.amount, currentPrice);
      if (currentValue == null) complete = false;
      else totalMarket += currentValue;
      if (quote?.status === "stale") stale = true;
      const profitLoss = currentValue == null ? null : currentValue - item.invested;
      return {
        symbol: item.symbol,
        name: assetInfo.get(item.symbol)?.name ?? item.symbol,
        amount: decimalFromUnits(item.amount),
        totalInvested: decimalFromUnits(item.invested),
        fees: decimalFromUnits(item.fees),
        purchaseValue: decimalFromUnits(item.purchaseValue),
        currentPrice: currentPrice == null ? null : decimalFromUnits(currentPrice),
        currentValue: currentValue == null ? null : decimalFromUnits(currentValue),
        profitLoss: profitLoss == null ? null : decimalFromUnits(profitLoss),
        profitLossPercent: profitLoss == null ? null : ratioPercent(profitLoss, item.invested),
        averagePurchasePrice: decimalFromUnits(divScaled(item.purchaseValue, item.amount) ?? 0n),
        averageCostIncludingFees: decimalFromUnits(divScaled(item.invested, item.amount) ?? 0n),
        allocationPercent: null,
        priceStatus: quote?.status === "fresh" || quote?.status === "stale" ? quote.status : "unavailable",
        priceUpdatedAt: quote?.updatedAt ?? quote?.cachedAt ?? null,
        _investedUnits: item.invested,
        _profitLossUnits: profitLoss,
      };
    });
    for (const holding of holdings) {
      if (complete && totalMarket > 0n) holding.allocationPercent = ratioPercent(from(holding.currentValue), totalMarket);
      delete holding._investedUnits;
      delete holding._profitLossUnits;
    }
    const performers = holdings.filter((holding) => holding.currentValue !== null && from(holding.totalInvested) > 0n);
    performers.sort((a, b) => comparePerformance(
      { investedUnits: from(a.totalInvested), profitLossUnits: signed(a.profitLoss) },
      { investedUnits: from(b.totalInvested), profitLossUnits: signed(b.profitLoss) },
    ));
    const hasAnyStale = stale;
    return {
      currency,
      complete,
      priceStatus: !complete ? "incomplete" : hasAnyStale ? "stale" : "fresh",
      totalInvested: decimalFromUnits(totalInvested),
      totalFees: decimalFromUnits(totalFees),
      purchaseValue: decimalFromUnits(totalInvested - totalFees),
      currentValue: complete ? decimalFromUnits(totalMarket) : null,
      profitLoss: complete ? decimalFromUnits(totalMarket - totalInvested) : null,
      profitLossPercent: complete ? ratioPercent(totalMarket - totalInvested, totalInvested) : null,
      holdings,
      bestPerforming: complete && performers.length ? performers[performers.length - 1].symbol : null,
      worstPerforming: complete && performers.length ? performers[0].symbol : null,
    };
  });
}
