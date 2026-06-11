export interface ExchangeRate {
  base:       string
  target:     string
  rate:       number
  fetched_at: string
}

/**
 * Convert an amount from one currency to another using cached rates.
 * Falls back to 1:1 if rate not found.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRate[]
): number {
  if (from === to) return amount
  const rate = rates.find(r => r.base === from && r.target === to)
  if (!rate) return amount
  return amount * rate.rate
}

/**
 * Format a number as currency with appropriate symbol/code.
 */
export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    PKR: '₨',
    USD: '$',
    CAD: 'CA$',
    AED: 'AED',
    SAR: 'SAR',
    EUR: '€',
    GBP: '£',
  }
  const symbol = symbols[currency] ?? currency
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `${symbol}${(amount / 1_000).toFixed(0)}K`
  return `${symbol}${amount.toFixed(0)}`
}
