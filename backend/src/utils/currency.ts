/**
 * Currency & Minor Units Financial Utility
 * Ensures integer-only representation in database and precision-safe arithmetic.
 */

export const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX']);
export const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'KWD', 'OMR', 'JOD']);

export const SUPPORTED_PAYMENT_CURRENCIES = [
  'USD',
  'INR',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'SGD',
  'AED'
] as const;

export type SupportedCurrency = (typeof SUPPORTED_PAYMENT_CURRENCIES)[number];

export function getCurrencyDecimalMultiplier(currency: string): number {
  const code = (currency || '').toUpperCase().trim();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return 1;
  }
  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return 1000;
  }
  return 100;
}

export function isSupportedCurrency(currency: string): boolean {
  if (!currency) return false;
  const code = currency.toUpperCase().trim();
  return SUPPORTED_PAYMENT_CURRENCIES.includes(code as SupportedCurrency);
}

/**
 * Converts a decimal major unit amount (e.g. 150.50 USD) to integer minor units (15050 cents).
 * Uses string splitting and BigInt/integer math to prevent floating point inaccuracies (e.g. 19.99 * 100 = 1998.9999999999998).
 */
export function toMinorUnits(amount: number, currency: string): number {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new Error('Invalid monetary amount provided');
  }

  const multiplier = getCurrencyDecimalMultiplier(currency);
  if (multiplier === 1) {
    return Math.floor(amount);
  }

  // Convert number to fixed string to avoid binary floating point representation issues
  const fixedStr = amount.toFixed(multiplier === 1000 ? 3 : 2);
  const parts = fixedStr.split('.');
  const whole = parseInt(parts[0], 10) || 0;
  const fraction = parseInt(parts[1] || '0', 10) || 0;

  return whole * multiplier + fraction;
}

/**
 * Converts minor unit integer (e.g. 15050 cents) back to major unit (150.50 USD).
 */
export function toMajorUnits(minorAmount: number, currency: string): number {
  if (typeof minorAmount !== 'number' || isNaN(minorAmount)) {
    throw new Error('Invalid minor monetary amount provided');
  }

  const multiplier = getCurrencyDecimalMultiplier(currency);
  return Number((minorAmount / multiplier).toFixed(multiplier === 1000 ? 3 : 2));
}

/**
 * Formats a minor unit amount for display with currency symbol and standard locale formatting.
 */
export function formatMinorUnits(minorAmount: number, currency = 'INR', locale?: string): string {
  const major = toMajorUnits(minorAmount, currency);
  const code = (currency || 'INR').toUpperCase().trim();
  const targetLocale = locale || (code === 'INR' ? 'en-IN' : 'en-US');

  try {
    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2
    }).format(major);
  } catch {
    return `${code} ${major.toFixed(2)}`;
  }
}
