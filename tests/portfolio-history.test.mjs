import test from "node:test";
import assert from "node:assert/strict";
import { buildPortfolioHistory } from "../src/lib/portfolio-history.mjs";

const dates = ["2025-01-01T00:00:00.000Z", "2025-01-02T00:00:00.000Z", "2025-01-03T00:00:00.000Z"];

test("values only the quantity held at each historical time", () => {
  const rows = [
    { asset_symbol: "BTC", occurred_at: dates[1], crypto_amount: "1" },
    { asset_symbol: "ETH", occurred_at: dates[2], crypto_amount: "1" },
  ];
  const history = buildPortfolioHistory(rows, {
    BTC: dates.map((timestamp, index) => ({ timestamp, price: ["100", "110", "120"][index] })),
    ETH: dates.map((timestamp, index) => ({ timestamp, price: ["10", "12", "20"][index] })),
  });
  assert.deepEqual(history, [
    { timestamp: dates[1], value: "110" },
    { timestamp: dates[2], value: "140" },
  ]);
});

test("does not emit partial historical portfolio values when a held coin lacks a quote", () => {
  const rows = [
    { asset_symbol: "BTC", occurred_at: dates[0], crypto_amount: "1" },
    { asset_symbol: "ETH", occurred_at: dates[0], crypto_amount: "1" },
  ];
  const history = buildPortfolioHistory(rows, {
    BTC: dates.map((timestamp) => ({ timestamp, price: "100" })),
    ETH: [{ timestamp: dates[2], price: "10" }],
  });
  assert.deepEqual(history, [{ timestamp: dates[2], value: "110" }]);
});

test("limits large histories while preserving the first and last points", () => {
  const series = dates.concat(Array.from({ length: 10 }, (_, index) => new Date(Date.parse(dates[2]) + (index + 1) * 86400000).toISOString()));
  const history = buildPortfolioHistory([{ asset_symbol: "BTC", occurred_at: dates[0], crypto_amount: "1" }], {
    BTC: series.map((timestamp, index) => ({ timestamp, price: String(index + 1) })),
  }, 5);
  assert.equal(history.length, 5);
  assert.equal(history[0].timestamp, dates[0]);
  assert.equal(history.at(-1).timestamp, series.at(-1));
});
