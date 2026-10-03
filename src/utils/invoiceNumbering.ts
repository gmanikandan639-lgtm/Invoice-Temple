/**
 * User-wise Invoice Numbering Utilities
 * Provides robust parsing, formatting, and auto-sequencing for custom invoice numbers.
 * Supports:
 * - Pure numbers: "1001" -> "1002" -> "1003"
 * - Prefix formats: "INV-001" -> "INV-002" -> "INV-003"
 * - Year-based formats: "INV-2026-001" -> "INV-2026-002"
 * - Slash formats: "INV/2026-27/00001" -> "INV/2026-27/00002"
 * - Suffix formats: "BILL-001-A" -> "BILL-002-A"
 */

export interface ParsedInvoiceNumber {
  prefix: string;
  num: number;
  padLen: number;
  suffix: string;
  raw: string;
}

/**
 * Parses any invoice number string into its prefix, sequential numeric part, padding length, and suffix.
 */
export function parseInvoiceNumber(invStr: string): ParsedInvoiceNumber | null {
  const trimmed = (invStr || '').trim();
  if (!trimmed) {
    return null;
  }

  // Matches the last contiguous group of digits in the string
  const match = trimmed.match(/^(.*?)(\d+)([^\d]*)$/);
  if (!match) {
    return null;
  }

  const prefix = match[1];
  const digitsStr = match[2];
  const suffix = match[3];
  const num = parseInt(digitsStr, 10);
  const padLen = digitsStr.length;

  return {
    prefix,
    num,
    padLen,
    suffix,
    raw: trimmed,
  };
}

/**
 * Formats an invoice number given its components.
 */
export function formatInvoiceNumber(
  prefix: string,
  num: number,
  padLen: number,
  suffix: string = ''
): string {
  const numStr = String(num).padStart(padLen, '0');
  return `${prefix}${numStr}${suffix}`;
}

/**
 * Increments an invoice number string by a step (default +1).
 */
export function getNextInvoiceNumberString(lastNumberOrTemplate: string, step: number = 1): string {
  const parsed = parseInvoiceNumber(lastNumberOrTemplate);
  if (!parsed) {
    // If not parseable, generate default standard invoice format
    const currentYear = new Date().getFullYear();
    return `INV-${currentYear}-${String(step).padStart(5, '0')}`;
  }

  const nextNum = parsed.num + step;
  return formatInvoiceNumber(parsed.prefix, nextNum, parsed.padLen, parsed.suffix);
}

/**
 * Calculates the next invoice number for a specific user based on:
 * 1. User-configured starting invoice number (e.g. "1001" or "INV-001")
 * 2. User's existing invoices list
 * 3. Fallback default format "INV-YYYY-00001"
 */
export function calculateNextInvoiceNumber(
  configuredStartingNumber?: string,
  existingUserInvoices: string[] = []
): string {
  const currentYear = new Date().getFullYear();
  const defaultStarting = `INV-${currentYear}-00001`;
  const baseStarting = (configuredStartingNumber || '').trim() || defaultStarting;

  if (!existingUserInvoices || existingUserInvoices.length === 0) {
    return baseStarting;
  }

  const parsedBase = parseInvoiceNumber(baseStarting);
  const targetPrefix = parsedBase ? parsedBase.prefix.toLowerCase() : '';
  const targetSuffix = parsedBase ? parsedBase.suffix.toLowerCase() : '';
  const padLen = parsedBase ? parsedBase.padLen : 5;
  const initialNum = parsedBase ? parsedBase.num : 1;

  // Find all existing numbers matching the same prefix & suffix pattern
  let highestNum = initialNum - 1;
  let hasMatchingInvoices = false;

  for (const invNumber of existingUserInvoices) {
    if (!invNumber) continue;
    const parsed = parseInvoiceNumber(invNumber);
    if (!parsed) continue;

    // Check if prefix and suffix match
    const pLower = parsed.prefix.toLowerCase();
    const sLower = parsed.suffix.toLowerCase();

    if (pLower === targetPrefix && sLower === targetSuffix) {
      hasMatchingInvoices = true;
      if (parsed.num > highestNum) {
        highestNum = parsed.num;
      }
    }
  }

  if (!hasMatchingInvoices) {
    // If no existing invoice matches the current pattern, check if the starting number itself is already used
    const existingSet = new Set(existingUserInvoices.map((s) => s.toLowerCase()));
    if (!existingSet.has(baseStarting.toLowerCase())) {
      return baseStarting;
    }
    // If exact baseStarting is taken, step to next
    return getNextInvoiceNumberString(baseStarting, 1);
  }

  // Next number is highestNum + 1
  const nextNum = highestNum + 1;
  const nextFormatted = formatInvoiceNumber(
    parsedBase ? parsedBase.prefix : 'INV-',
    nextNum,
    padLen,
    parsedBase ? parsedBase.suffix : ''
  );

  // Guarantee uniqueness: if somehow nextFormatted already exists, advance until unused
  let candidate = nextFormatted;
  let counter = nextNum;
  const existingSet = new Set(existingUserInvoices.map((s) => s.toLowerCase()));
  while (existingSet.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = formatInvoiceNumber(
      parsedBase ? parsedBase.prefix : 'INV-',
      counter,
      padLen,
      parsedBase ? parsedBase.suffix : ''
    );
  }

  return candidate;
}
