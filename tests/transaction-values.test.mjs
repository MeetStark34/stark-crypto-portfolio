import test from "node:test";
import assert from "node:assert/strict";
import { decimalFromUnits, deriveUnitPrice, formatMarketPrice, formatMoneyValue, formatUnitPrice, subtractDecimalValues, validateTransaction } from "../src/lib/crypto-assets.mjs";

const valid = {
  assetSymbol: "BTC",
  fiatCurrency: "EUR",
  totalFiatAmount: "10",
  feeFiatAmount: "1.49",
  cryptoAmount: "0.0002",
  occurredAt: "2025-06-01T12:00:00.000Z",
  notes: "First purchase",
};

test("fee is deducted once from charged outflow to produce purchase value", () => {
  const transaction = validateTransaction(valid);
  assert.equal(transaction.totalFiatAmount, "10");
  assert.equal(transaction.feeFiatAmount, "1.49");
  assert.equal(transaction.purchaseValueFiat, "8.51");
  assert.equal(subtractDecimalValues("10.000000000000000001", "1.49"), "8.510000000000000001");
});

test("preserves the full accepted decimal precision", () => {
  const transaction = validateTransaction({ ...valid, totalFiatAmount: "10.000000000000000001", feeFiatAmount: "0", cryptoAmount: "0.000000000000000001" });
  assert.equal(transaction.purchaseValueFiat, "10.000000000000000001");
  assert.equal(decimalFromUnits(1n), "0.000000000000000001");
});

test("derives a high precision unit purchase price", () => {
  assert.equal(deriveUnitPrice("1", "3", 6), "0.333333");
  assert.match(formatUnitPrice("1", "3", "EUR", "en-US"), /0\.33/);
  assert.match(formatUnitPrice("8.51", "0.0002", "EUR", "en-US"), /42,550\.00/);
  assert.match(formatMoneyValue("8.51", "EUR", "en-US"), /8\.51/);
});

test("formats sub-cent CoinGecko prices without rounding them to zero", () => {
  assert.equal(formatMarketPrice("0.00000004", "EUR", 8, "en-US"), "€0.00000004");
  assert.equal(formatMarketPrice("12", "EUR", 8, "en-US"), "€12.00");
});

test("rejects invalid asset, currency, amount precision, and fees", () => {
  assert.throws(() => validateTransaction({ ...valid, assetSymbol: "USDT" }), /supported crypto asset/);
  assert.throws(() => validateTransaction({ ...valid, fiatCurrency: "JPY" }), /supported fiat currency/);
  assert.throws(() => validateTransaction({ ...valid, totalFiatAmount: "1e3" }), /decimal/);
  assert.throws(() => validateTransaction({ ...valid, cryptoAmount: "0" }), /greater than zero/);
  assert.throws(() => validateTransaction({ ...valid, feeFiatAmount: "10" }), /less than the total/);
  assert.throws(() => validateTransaction({ ...valid, feeFiatAmount: "0.0000000000000000001" }), /decimal/);
});

test("rejects a future transaction date and overly long notes", () => {
  assert.throws(() => validateTransaction({ ...valid, occurredAt: "2999-01-01T00:00:00.000Z" }), /cannot be in the future/);
  assert.throws(() => validateTransaction({ ...valid, notes: "x".repeat(501) }), /500 characters/);
});
