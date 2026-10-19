export type CryptoAsset = {
  symbol: "BTC" | "ETH" | "SOL" | "XRP" | "ADA" | "DOGE" | "DOT" | "AVAX" | "LINK" | "MATIC";
  name: string;
  coingeckoId: string;
};

export const CRYPTO_ASSETS: readonly CryptoAsset[];
export const FIAT_CURRENCIES: readonly ("EUR" | "USD" | "INR" | "GBP" | "CHF")[];
export type TransactionInput = {
  assetSymbol: string;
  fiatCurrency: string;
  totalFiatAmount: string;
  feeFiatAmount: string;
  cryptoAmount: string;
  occurredAt: string;
  notes?: string | null;
};
export type ValidatedTransaction = {
  assetSymbol: CryptoAsset["symbol"];
  fiatCurrency: "EUR" | "USD" | "GBP" | "CHF";
  totalFiatAmount: string;
  feeFiatAmount: string;
  cryptoAmount: string;
  occurredAt: string;
  notes: string | null;
  purchaseValueFiat: string;
};
export function parseDecimal(value: unknown, fieldName: string, options?: { allowZero?: boolean }): bigint;
export function decimalFromUnits(units: bigint): string;
export function subtractDecimalValues(left: string, right: string): string;
export function deriveUnitPrice(purchaseValue: string, cryptoAmount: string, fractionDigits?: number): string;
export function formatMoneyValue(value: string, currency: string, locale?: string): string;
export function formatMarketPrice(value: string, currency: string, maxFractionDigits?: number, locale?: string): string;
export function formatUnitPrice(purchaseValue: string, cryptoAmount: string, currency: string, locale?: string): string;
export function formatDecimalValue(value: string, maxFractionDigits?: number, locale?: string): string;
export function validateTransaction(input: TransactionInput): ValidatedTransaction;
