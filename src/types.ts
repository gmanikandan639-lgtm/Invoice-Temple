export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  lastLoginAt?: string;
  id?: string;
};

export type UserAccount = UserProfile;

export interface Customer {
  id: string;
  customerId: string; // e.g. CUST-001
  customerName: string;
  companyName?: string;
  mobileNumber?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  billingAddress: string;
  shippingAddress?: string;
  city: string;
  state: string;
  pincode: string;
  stateCode?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type ProductUnit = 'NOS' | 'PCS' | 'BOX' | 'HRS' | 'KGS' | 'MTR' | 'SET' | 'LITRE' | 'BAG' | string;

export interface Product {
  id: string;
  productId?: string; // e.g. PROD-001
  type?: 'Goods' | 'Services';
  name: string;
  description?: string;
  hsnSacCode?: string;
  unit: ProductUnit; // PCS, BOX, HRS, KGS, MTR, NOS, SET, etc.
  price: number;
  purchasePrice?: number;
  gstRate: number; // 0, 5, 12, 18, 28
  cess?: number;
  openingStock?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  isActive?: boolean;
  status?: 'active' | 'inactive';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  hsnSacCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number; // in currency or %
  discountType: 'percentage' | 'fixed';
  taxableAmount: number;
  gstRate: number; // 0, 5, 12, 18, 28
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export type InvoicePaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
export type InvoiceTemplate = 'classic' | 'modern' | 'gst';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV/2026-27/00001
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  poNumber?: string;
  referenceNumber?: string;
  placeOfSupply: string;
  salesperson?: string;
  customerId: string;
  customerSnapshot: Customer;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  balanceAmount: number;
  paymentStatus: InvoicePaymentStatus;
  invoiceStatus: InvoiceStatus;
  template?: InvoiceTemplate;
  notes?: string;
  terms?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque' | 'Other';

export interface Payment {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export type NotificationType =
  | 'invoice_created'
  | 'invoice_updated'
  | 'payment_received'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'user_disabled'
  | 'announcement';

export interface AppNotification {
  id: string;
  recipientUserId: string; // 'all' or specific uid
  title: string;
  message: string;
  type: NotificationType;
  relatedInvoiceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdBy: string;
  createdByName: string;
  priority: 'normal' | 'important' | 'urgent';
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CompanySettings {
  companyName: string;
  tradeName?: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  stateCode?: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  gstin: string;
  pan?: string;
  bankName: string;
  accountHolderName?: string;
  accountNumber: string;
  ifsc: string;
  ifscCode?: string;
  branch: string;
  branchName?: string;
  upiId?: string;
  authorizedPerson: string;
  signatureUrl?: string;
  termsAndConditions: string;
  invoiceFooter?: string;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  defaultPaymentTerms?: string;
  defaultNotes?: string;
  enableRoundOff?: boolean;
  themeColor?: string;
  showBankDetails?: boolean;
  showUpiQr?: boolean;
  showAuthorizedSignatory?: boolean;
  updatedAt: string;
}

export interface InvoiceSettings {
  invoicePrefix: string;
  financialYear: string;
  startingNumber: number;
  numberFormat: string;
  defaultTemplate: InvoiceTemplate;
  defaultTaxType: 'GST' | 'None';
  currency: string;
  decimalPlaces: number;
  defaultPaymentTerms: string;
  defaultNotes: string;
  defaultTermsAndConditions: string;
  updatedAt: string;
}

export interface StateCodeMapping {
  code: string;
  name: string;
}

export const INDIAN_STATES: StateCodeMapping[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu' },
  { code: '26', name: 'Dadra & Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];
