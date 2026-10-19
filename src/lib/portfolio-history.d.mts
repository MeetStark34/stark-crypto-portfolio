export type PortfolioHistoryPoint = { timestamp: string; value: string };
export function buildPortfolioHistory(transactions: Array<{ asset_symbol: string; occurred_at: string; crypto_amount: string }>, pricesBySymbol: Record<string, Array<{ timestamp: string; price: string }>>, maxPoints?: number): PortfolioHistoryPoint[];
