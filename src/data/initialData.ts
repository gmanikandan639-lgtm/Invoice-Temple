import {
  CompanySettings,
  InvoiceSettings,
  UserProfile,
  Customer,
  Product,
  Invoice,
  Payment,
  AppNotification,
  ActivityLog,
} from '../types';
import { getCurrentFinancialYear } from '../utils/taxCalculator';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Invoice Temple Technologies Pvt. Ltd.',
  logoUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=200&h=200&fit=crop&crop=faces&q=80',
  address: 'Level 5, Temple Towers, 42 Anna Salai, Guindy Industrial Estate',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600032',
  phone: '+91 44 2855 7700',
  email: 'billing@invoicetemple.com',
  website: 'https://invoicetemple.com',
  gstin: '33AABCI1234F1ZP',
  pan: 'AABCI1234F',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200049281729',
  ifsc: 'HDFC0001234',
  branch: 'Guindy Branch, Chennai',
  upiId: 'invoicetemple@okhdfcbank',
  authorizedPerson: 'Manikandan G',
  termsAndConditions: '1. Goods / services once sold cannot be returned.\n2. Payment is due within the agreed credit period.\n3. Delayed payments are subject to 18% annual interest.\n4. All disputes are subject to Chennai jurisdiction only.',
  invoiceFooter: 'Thank you for your business! For billing queries, contact support@invoicetemple.com',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  invoicePrefix: 'INV',
  financialYear: getCurrentFinancialYear(),
  startingNumber: 1,
  numberFormat: 'INV/{FY}/{00000}',
  defaultTemplate: 'classic',
  defaultTaxType: 'GST',
  currency: 'INR',
  decimalPlaces: 2,
  defaultPaymentTerms: 'Net 30',
  defaultNotes: 'Thank you for your valued business. Please quote the invoice number on your payment reference.',
  defaultTermsAndConditions: DEFAULT_COMPANY_SETTINGS.termsAndConditions,
  updatedAt: new Date().toISOString(),
};

export const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'admin_user_01',
    name: 'Manikandan G (Admin)',
    email: 'gmanikandan639@gmail.com',
    phone: '+91 98765 43210',
    role: 'admin',
    status: 'active',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces&q=80',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    lastLoginAt: '2026-09-04T05:30:00.000Z',
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
