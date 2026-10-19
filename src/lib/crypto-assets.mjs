export const CRYPTO_ASSETS = [
  { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum" },
  { symbol: "SOL", name: "Solana", coingeckoId: "solana" },
  { symbol: "XRP", name: "XRP", coingeckoId: "ripple" },
  { symbol: "ADA", name: "Cardano", coingeckoId: "cardano" },
  { symbol: "DOGE", name: "Dogecoin", coingeckoId: "dogecoin" },
  { symbol: "DOT", name: "Polkadot", coingeckoId: "polkadot" },
  { symbol: "AVAX", name: "Avalanche", coingeckoId: "avalanche-2" },
  { symbol: "LINK", name: "Chainlink", coingeckoId: "chainlink" },
  { symbol: "MATIC", name: "Polygon", coingeckoId: "matic-network" },
];

export const FIAT_CURRENCIES = ["EUR", "USD", "INR", "GBP", "CHF"];
const DECIMAL = /^\d{1,30}(?:\.\d{1,18})?$/;
const SCALE = 10n ** 18n;
function parseSignedDecimal(value, fieldName) {
  const text = String(value ?? "").trim();
  return text.startsWith("-") ? -parseDecimal(text.slice(1), fieldName) : parseDecimal(text.startsWith("+") ? text.slice(1) : text, fieldName);
}

export function parseDecimal(value, fieldName, { allowZero = true } = {}) {
  const text = String(value ?? "").trim();
  if (!DECIMAL.test(text)) {
    throw new Error(`${fieldName} must be a positive decimal with up to 18 decimal places.`);
  }
  const [whole, fraction = ""] = text.split(".");
  const units = BigInt(whole) * SCALE + BigInt((fraction + "0".repeat(18)).slice(0, 18));
  if (allowZero ? units < 0n : units <= 0n) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
  return units;
}

export function decimalFromUnits(units) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE).toString().padStart(18, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function subtractDecimalValues(left, right) {
  return decimalFromUnits(parseDecimal(left, "Amount") - parseDecimal(right, "Fee"));
}

export function deriveUnitPrice(purchaseValue, cryptoAmount, fractionDigits = 18) {
  const value = parseDecimal(purchaseValue, "Purchase value");
  const quantity = parseDecimal(cryptoAmount, "Crypto amount", { allowZero: false });
  const scale = 10n ** BigInt(fractionDigits);
  const scaledPrice = (value * scale) / quantity;
  const factor = 10n ** BigInt(18 - fractionDigits);
  return decimalFromUnits(scaledPrice * factor);
}

function groupedInteger(value, locale) {
  return new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }).format(value);
}

export function formatMoneyValue(value, currency, locale) {
  const units = parseSignedDecimal(value, "Money amount");
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const minorUnits = (absolute + 5_000_000_000_000_000n) / 10_000_000_000_000_000n;
  return formatMinorUnits(negative ? -minorUnits : minorUnits, currency, locale);
}

export function formatMarketPrice(value, currency, maxFractionDigits = 8, locale) {
  const units = parseDecimal(value, "Market price");
  const precision = Math.min(18, Math.max(2, maxFractionDigits));
  const divisor = 10n ** BigInt(18 - precision);
  const rounded = (units + divisor / 2n) / divisor;
  const precisionScale = 10n ** BigInt(precision);
  const whole = rounded / precisionScale;
  const fractional = (rounded % precisionScale).toString().padStart(precision, "0").replace(/0+$/, "");
  const digits = fractional.padEnd(Math.min(2, precision), "0");
  const template = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: precision }).formatToParts(1);
  const decimalMark = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
  let integerWritten = false;
  return template.map((part) => {
    if (part.type === "integer") {
      if (integerWritten) return "";
      integerWritten = true;
      return groupedInteger(whole, locale);
    }
    if (part.type === "fraction") return digits;
    if (part.type === "decimal" && !digits.length) return "";
    return part.value;
  }).join("").replace(template.find((part) => part.type === "decimal")?.value ?? ".", decimalMark);
}

export function formatUnitPrice(purchaseValue, cryptoAmount, currency, locale) {
  const value = parseDecimal(purchaseValue, "Purchase value");
  const quantity = parseDecimal(cryptoAmount, "Crypto amount", { allowZero: false });
  const minorUnits = (value * 100n + quantity / 2n) / quantity;
  return formatMinorUnits(minorUnits, currency, locale);
}

function formatMinorUnits(minorUnits, currency, locale) {
  const negative = minorUnits < 0n;
  const absolute = negative ? -minorUnits : minorUnits;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  const template = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).formatToParts(negative ? -1 : 1);
  let integerWritten = false;
  return template.map((part) => {
    if (part.type === "integer") {
      if (integerWritten) return "";
      integerWritten = true;
      return groupedInteger(whole, locale);
    }
    if (part.type === "fraction") return fraction;
    return part.value;
  }).join("");
}

export function formatDecimalValue(value, maxFractionDigits = 8, locale) {
  const units = parseSignedDecimal(value, "Crypto amount");
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const dropDigits = 18 - maxFractionDigits;
  const divisor = 10n ** BigInt(dropDigits);
  const rounded = (absolute + divisor / 2n) / divisor;
  const precisionScale = 10n ** BigInt(maxFractionDigits);
  const whole = rounded / precisionScale;
  const fraction = (rounded % precisionScale).toString().padStart(maxFractionDigits, "0").replace(/0+$/, "");
  const grouped = `${negative ? "-" : ""}${groupedInteger(whole, locale)}`;
  if (!fraction) return grouped;
  const decimalMark = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
  return `${grouped}${decimalMark}${fraction}`;
}

export function validateTransaction(input) {
  const assetSymbol = String(input.assetSymbol ?? "").trim().toUpperCase();
  const asset = CRYPTO_ASSETS.find((item) => item.symbol === assetSymbol);
  if (!asset) throw new Error("Select a supported crypto asset.");

  const fiatCurrency = String(input.fiatCurrency ?? "").trim().toUpperCase();
  if (!FIAT_CURRENCIES.includes(fiatCurrency)) throw new Error("Select a supported fiat currency.");

  const totalUnits = parseDecimal(input.totalFiatAmount, "Total amount charged", { allowZero: false });
  const feeUnits = parseDecimal(input.feeFiatAmount || "0", "Fee");
  if (feeUnits >= totalUnits) throw new Error("The fee must be less than the total amount charged.");

  const cryptoUnits = parseDecimal(input.cryptoAmount, "Crypto amount", { allowZero: false });
  const occurredAt = new Date(String(input.occurredAt ?? ""));
  if (!Number.isFinite(occurredAt.getTime())) throw new Error("Enter a valid transaction date and time.");
  if (occurredAt.getTime() > Date.now() + 5 * 60 * 1000) throw new Error("Transaction date and time cannot be in the future.");

  const notes = String(input.notes ?? "").trim();
  if (notes.length > 500) throw new Error("Notes must be 500 characters or fewer.");

  const totalFiatAmount = decimalFromUnits(totalUnits);
  const feeFiatAmount = decimalFromUnits(feeUnits);
  const cryptoAmount = decimalFromUnits(cryptoUnits);
  const purchaseValueFiat = decimalFromUnits(totalUnits - feeUnits);

  return {
    assetSymbol: asset.symbol,
    fiatCurrency,
    totalFiatAmount,
    feeFiatAmount,
    cryptoAmount,
    occurredAt: occurredAt.toISOString(),
    notes: notes || null,
    purchaseValueFiat,
  };
}
