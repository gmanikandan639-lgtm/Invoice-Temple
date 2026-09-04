import { InvoiceItem, INDIAN_STATES } from '../types';

export function getStateCodeByName(stateName: string): string {
  const normalized = (stateName || '').trim().toLowerCase();
  const found = INDIAN_STATES.find(s => s.name.toLowerCase() === normalized);
  return found ? found.code : '';
}

export function getCurrentFinancialYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed: 0 is Jan, 3 is April
  
  if (currentMonth >= 3) { // April onwards
    const nextYearShort = String((currentYear + 1) % 100).padStart(2, '0');
    return `${currentYear}-${nextYearShort}`;
  } else {
    const prevYear = currentYear - 1;
    const currentYearShort = String(currentYear % 100).padStart(2, '0');
    return `${prevYear}-${currentYearShort}`;
  }
}

export interface ItemCalculationResult {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function calculateItemTaxes(
  quantity: number,
  rate: number,
  discount: number,
  discountType: 'percentage' | 'fixed',
  gstRate: number,
  isInterState: boolean
): ItemCalculationResult {
  const qty = Number(quantity) || 0;
  const unitRate = Number(rate) || 0;
  const grossAmount = Math.round(qty * unitRate * 100) / 100;

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round((grossAmount * (Number(discount) || 0) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(grossAmount, Number(discount) || 0);
  }

  const taxableAmount = Math.max(0, Math.round((grossAmount - discountAmount) * 100) / 100);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const rateNum = Number(gstRate) || 0;

  if (isInterState) {
    igst = Math.round((taxableAmount * (rateNum / 100)) * 100) / 100;
  } else {
    const halfRate = rateNum / 2;
    cgst = Math.round((taxableAmount * (halfRate / 100)) * 100) / 100;
    sgst = Math.round((taxableAmount * (halfRate / 100)) * 100) / 100;
  }

  const total = Math.round((taxableAmount + cgst + sgst + igst) * 100) / 100;

  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    total,
  };
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
}

export function calculateInvoiceTotals(items: InvoiceItem[], applyRoundOff: boolean = true): InvoiceTotals {
  let subtotal = 0;
  let discount = 0;
  let taxableAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  items.forEach(item => {
    const gross = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    subtotal += gross;
    const itemDisc = item.discountType === 'percentage'
      ? (gross * (Number(item.discount) || 0)) / 100
      : Number(item.discount) || 0;
    discount += itemDisc;
    taxableAmount += Number(item.taxableAmount) || 0;
    cgst += Number(item.cgst) || 0;
    sgst += Number(item.sgst) || 0;
    igst += Number(item.igst) || 0;
  });

  subtotal = Math.round(subtotal * 100) / 100;
  discount = Math.round(discount * 100) / 100;
  taxableAmount = Math.round(taxableAmount * 100) / 100;
  cgst = Math.round(cgst * 100) / 100;
  sgst = Math.round(sgst * 100) / 100;
  igst = Math.round(igst * 100) / 100;

  const rawTotal = taxableAmount + cgst + sgst + igst;
  let grandTotal = Math.round(rawTotal * 100) / 100;
  let roundOff = 0;

  if (applyRoundOff) {
    const rounded = Math.round(grandTotal);
    roundOff = Math.round((rounded - grandTotal) * 100) / 100;
    grandTotal = rounded;
  }

  return {
    subtotal,
    discount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    roundOff,
    grandTotal,
  };
}
