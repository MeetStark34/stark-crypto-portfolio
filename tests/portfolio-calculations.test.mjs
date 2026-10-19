import test from "node:test";
import assert from "node:assert/strict";
import { calculatePortfolio } from "../src/lib/portfolio-calculations.mjs";

const transactions = [
  { asset_symbol: "BTC", fiat_currency: "EUR", crypto_amount: "0.5", total_fiat_amount: "10", fee_fiat_amount: "1.49", purchase_value_fiat: "8.51" },
  { asset_symbol: "BTC", fiat_currency: "EUR", crypto_amount: "0.5", total_fiat_amount: "10", fee_fiat_amount: "0", purchase_value_fiat: "10" },
  { asset_symbol: "ETH", fiat_currency: "EUR", crypto_amount: "2", total_fiat_amount: "30", fee_fiat_amount: "2", purchase_value_fiat: "28" },
  { asset_symbol: "BTC", fiat_currency: "USD", crypto_amount: "1", total_fiat_amount: "100", fee_fiat_amount: "1", purchase_value_fiat: "99" },
];

test("calculates cost basis including fee once and tracks fee-excluded purchase value", () => {
  const [eur] = calculatePortfolio(transactions, { EUR: { BTC: { amount: "30", status: "fresh" }, ETH: { amount: "20", status: "fresh" } } });
  assert.equal(eur.totalInvested, "50");
  assert.equal(eur.totalFees, "3.49");
  assert.equal(eur.purchaseValue, "46.51");
  assert.equal(eur.currentValue, "70");
  assert.equal(eur.profitLoss, "20");
  assert.equal(eur.profitLossPercent, "40");
  assert.equal(eur.holdings[0].amount, "1");
  assert.equal(eur.holdings[0].averagePurchasePrice, "18.51");
  assert.equal(eur.holdings[0].averageCostIncludingFees, "20");
});

test("keeps fiat portfolios separate and calculates allocation and performers", () => {
  const summaries = calculatePortfolio(transactions, {
    EUR: { BTC: { amount: "30", status: "fresh" }, ETH: { amount: "20", status: "fresh" } },
    USD: { BTC: { amount: "120", status: "fresh" } },
  });
  assert.equal(summaries.length, 2);
  assert.equal(summaries[1].totalInvested, "100");
  assert.equal(summaries[1].currentValue, "120");
  assert.equal(summaries[0].bestPerforming, "BTC");
  assert.equal(summaries[0].worstPerforming, "ETH");
  assert.equal(summaries[0].holdings[0].allocationPercent, "42.857142857142857142");
});

test("does not fabricate a portfolio value or P/L when a held quote is unavailable", () => {
  const [summary] = calculatePortfolio(transactions.slice(0, 3), { EUR: { BTC: { amount: "30", status: "fresh" } } });
  assert.equal(summary.complete, false);
  assert.equal(summary.currentValue, null);
  assert.equal(summary.profitLoss, null);
  assert.equal(summary.bestPerforming, null);
  assert.equal(summary.holdings.find((holding) => holding.symbol === "ETH").currentValue, null);
  assert.equal(summary.holdings.find((holding) => holding.symbol === "BTC").allocationPercent, null);
});

test("uses last known valid prices while marking the portfolio stale", () => {
  const [summary] = calculatePortfolio(transactions.slice(0, 1), { EUR: { BTC: { amount: "30", status: "stale", cachedAt: "2026-01-01T00:00:00Z" } } });
  assert.equal(summary.priceStatus, "stale");
  assert.equal(summary.currentValue, "15");
  assert.equal(summary.profitLoss, "5");
  assert.equal(summary.holdings[0].priceStatus, "stale");
});

test("uses exact fixed precision for quantities and valuations", () => {
  const [summary] = calculatePortfolio([{ asset_symbol: "BTC", fiat_currency: "EUR", crypto_amount: "0.000000000000000003", total_fiat_amount: "0.000000000000000010", fee_fiat_amount: "0", purchase_value_fiat: "0.000000000000000010" }], { EUR: { BTC: { amount: "3.333333333333333333", status: "fresh" } } });
  assert.equal(summary.currentValue, "0.000000000000000009");
  assert.equal(summary.profitLoss, "-0.000000000000000001");
});
