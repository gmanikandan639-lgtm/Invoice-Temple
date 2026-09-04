import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Save,
  ArrowLeft,
  UserPlus,
  Building,
  Calendar,
  CreditCard,
  Percent,
  CheckCircle,
  AlertCircle,
  FileText,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Customer,
  InvoiceItem,
  Invoice,
  InvoiceTemplate,
  INDIAN_STATES,
  PaymentMode,
} from '../../types';
import {
  calculateItemTaxes,
  calculateInvoiceTotals,
  getStateCodeByName,
} from '../../utils/taxCalculator';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface InvoiceCreateViewProps {
  onNavigate: (path: string) => void;
  editInvoiceId?: string;
}

export const InvoiceCreateView: React.FC<InvoiceCreateViewProps> = ({
  onNavigate,
  editInvoiceId,
}) => {
  const {
    companySettings,
    invoiceSettings,
    customers,
    addCustomer,
    products,
    invoices,
    addInvoice,
    updateInvoice,
    getNextInvoiceNumber,
    addPayment,
  } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Check if editing existing invoice/draft
  const existingInvoice = useMemo(() => {
    if (!editInvoiceId) return null;
    return invoices.find((inv) => inv.id === editInvoiceId) || null;
  }, [editInvoiceId, invoices]);

  const isEditingDraft = Boolean(
    existingInvoice && (existingInvoice.invoiceStatus === 'Draft' || !existingInvoice.invoiceStatus)
  );

  // Basic Details
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState(invoiceSettings.defaultPaymentTerms || 'Net 30');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [poNumber, setPoNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState(companySettings.state || 'Tamil Nadu');
  const [salesperson, setSalesperson] = useState(currentUser?.name || 'Admin');
  const [template, setTemplate] = useState<InvoiceTemplate>(invoiceSettings.defaultTemplate || 'classic');

  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Quick Add Customer modal
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState(companySettings.state || 'Tamil Nadu');
  const [newCustPincode, setNewCustPincode] = useState('');

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_init_1',
      name: '',
      description: '',
      hsnSacCode: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      discount: 0,
      discountType: 'fixed',
      taxableAmount: 0,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
    },
  ]);

  // Initial Payment option
  const [recordInitialPayment, setRecordInitialPayment] = useState(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<number>(0);
  const [initialPaymentMode, setInitialPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [initialPaymentRef, setInitialPaymentRef] = useState('');

  // Notes and terms
  const [notes, setNotes] = useState(invoiceSettings.defaultNotes || '');
  const [terms, setTerms] = useState(companySettings.termsAndConditions || '');

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing invoice if editing
  useEffect(() => {
    if (existingInvoice) {
      setInvoiceNumber(existingInvoice.invoiceNumber);
      setInvoiceDate(existingInvoice.invoiceDate);
      setDueDate(existingInvoice.dueDate);
      setPaymentTerms(existingInvoice.paymentTerms || 'Net 30');
      setPoNumber(existingInvoice.poNumber || '');
      setReferenceNumber(existingInvoice.referenceNumber || '');
      setPlaceOfSupply(existingInvoice.placeOfSupply || companySettings.state || 'Tamil Nadu');
      setSalesperson(existingInvoice.salesperson || currentUser?.name || 'Admin');
      setTemplate(existingInvoice.template || 'classic');
      if (existingInvoice.customerId && existingInvoice.customerId !== 'draft_pending') {
        setSelectedCustomerId(existingInvoice.customerId);
      }
      if (existingInvoice.items && existingInvoice.items.length > 0) {
        setItems(existingInvoice.items);
      }
      setNotes(existingInvoice.notes || '');
      setTerms(existingInvoice.terms || '');
      if (existingInvoice.amountPaid && existingInvoice.amountPaid > 0) {
        setRecordInitialPayment(true);
        setInitialPaymentAmount(existingInvoice.amountPaid);
      }
    }
  }, [existingInvoice]);

  // Initialize invoice number for fresh creation
  useEffect(() => {
    if (!editInvoiceId) {
      setInvoiceNumber(getNextInvoiceNumber());
    }
  }, [invoiceSettings, editInvoiceId]);

  // When customer changes, auto-set place of supply
  useEffect(() => {
    if (selectedCustomer) {
      setPlaceOfSupply(selectedCustomer.state || companySettings.state);
    }
  }, [selectedCustomer, companySettings.state]);

  // Is Inter-state check (Company State != Place of Supply)
  const isInterState = useMemo(() => {
    return (companySettings.state || '').trim().toLowerCase() !== (placeOfSupply || '').trim().toLowerCase();
  }, [companySettings.state, placeOfSupply]);

  // Recalculate item when quantities, rates, discount, or tax regime changes
  const updateItemRow = (index: number, updates: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };

      const calc = calculateItemTaxes(
        current.quantity,
        current.rate,
        current.discount,
        current.discountType,
        current.gstRate,
        isInterState
      );

      copy[index] = {
        ...current,
        taxableAmount: calc.taxableAmount,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        total: calc.total,
      };
      return copy;
    });
  };

  // Recalculate all items if place of supply changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const calc = calculateItemTaxes(
          item.quantity,
          item.rate,
          item.discount,
          item.discountType,
          item.gstRate,
          isInterState
        );
        return {
          ...item,
          taxableAmount: calc.taxableAmount,
          cgst: calc.cgst,
          sgst: calc.sgst,
          igst: calc.igst,
          total: calc.total,
        };
      })
    );
  }, [isInterState]);

  // Add Item row
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: '',
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'NOS',
        rate: 0,
        discount: 0,
        discountType: 'fixed',
        taxableAmount: 0,
        gstRate: 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
      },
    ]);
  };

  // Duplicate Item row
  const duplicateItem = (index: number) => {
    const target = items[index];
    setItems((prev) => [
      ...prev.slice(0, index + 1),
      {
        ...target,
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      },
      ...prev.slice(index + 1),
    ]);
  };

  // Remove Item row
  const removeItem = (index: number) => {
    if (items.length <= 1) {
      showToast('Invoice must have at least one line item', 'info');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Select pre-configured Product from dropdown
  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    updateItemRow(index, {
      productId: prod.id,
      name: prod.name,
      description: prod.description || '',
      hsnSacCode: prod.hsnSacCode || '',
      unit: prod.unit || 'NOS',
      rate: prod.price,
      gstRate: prod.gstRate,
    });
  };

  // Totals Calculation
  const totals = useMemo(() => {
    return calculateInvoiceTotals(items);
  }, [items]);

  // Quick Customer Creation
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustAddress || !newCustState) {
      showToast('Name, address and state are required', 'error');
      return;
    }

    try {
      const custCode = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
      const stateCode = getStateCodeByName(newCustState);
      const created = await addCustomer({
        customerId: custCode,
        customerName: newCustName,
        companyName: newCustCompany || newCustName,
        mobileNumber: newCustMobile,
        email: newCustEmail,
        gstin: newCustGstin,
        billingAddress: newCustAddress,
        shippingAddress: newCustAddress,
        city: newCustCity,
        state: newCustState,
        pincode: newCustPincode,
        stateCode,
        createdBy: currentUser?.uid || 'user',
      });

      setSelectedCustomerId(created.id);
      setQuickCustomerModalOpen(false);
      showToast('Customer created and selected successfully');

      // Reset form
      setNewCustName('');
      setNewCustCompany('');
      setNewCustMobile('');
      setNewCustEmail('');
      setNewCustGstin('');
      setNewCustAddress('');
      setNewCustCity('');
      setNewCustPincode('');
    } catch (err: any) {
      showToast('Failed to create customer: ' + err.message, 'error');
    }
  };

  // Save as Draft (allows saving incomplete invoices without blocking validation)
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      // Allow saving even without customer selected yet
      let customerToUse = selectedCustomer;
      let custId = selectedCustomerId;

      if (!customerToUse) {
        custId = 'draft_pending';
        customerToUse = {
          id: 'draft_pending',
          customerId: 'DRAFT-PENDING',
          customerName: 'Draft Client (Pending Details)',
          billingAddress: 'Address Pending',
          city: companySettings.city || 'City',
          state: placeOfSupply || companySettings.state || 'Tamil Nadu',
          pincode: companySettings.pincode || '000000',
          createdBy: currentUser?.uid || 'user',
          createdAt: new Date().toISOString(),
        };
      }

      // Sanitize items so incomplete items don't break calculations
      const draftItems: InvoiceItem[] = items.map((it, idx) => ({
        ...it,
        id: it.id || `item_draft_${idx + 1}`,
        name: it.name.trim() || `Draft Item ${idx + 1}`,
        quantity: Math.max(1, Number(it.quantity) || 1),
        rate: Math.max(0, Number(it.rate) || 0),
        discount: Number(it.discount) || 0,
        discountType: it.discountType || 'fixed',
        taxableAmount: it.taxableAmount || 0,
        gstRate: it.gstRate || 0,
        cgst: it.cgst || 0,
        sgst: it.sgst || 0,
        igst: it.igst || 0,
        total: it.total || 0,
      }));

      const paidAmt = recordInitialPayment ? Number(initialPaymentAmount) || 0 : 0;
      const balanceAmt = Math.max(0, Math.round((totals.grandTotal - paidAmt) * 100) / 100);

      const draftPayload = {
        invoiceNumber: invoiceNumber.trim() || `DFT-${Date.now().toString().slice(-6)}`,
        invoiceDate,
        dueDate,
        paymentTerms,
        poNumber,
        referenceNumber,
        placeOfSupply: placeOfSupply || companySettings.state || 'Tamil Nadu',
        salesperson,
        customerId: custId,
        customerSnapshot: customerToUse,
        items: draftItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxableAmount: totals.taxableAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        amountPaid: paidAmt,
        balanceAmount: balanceAmt,
        paymentStatus: 'Unpaid' as const,
        invoiceStatus: 'Draft' as const,
        template,
        notes,
        terms,
        createdBy: currentUser?.uid || 'user',
        createdByName: currentUser?.name || 'Staff',
      };

      if (editInvoiceId) {
        await updateInvoice(editInvoiceId, draftPayload);
        showToast('Draft invoice saved successfully!');
        onNavigate(`/invoice/${editInvoiceId}`);
      } else {
        const newInv = await addInvoice(draftPayload);
        showToast(`Draft ${newInv.invoiceNumber} saved! You can resume editing anytime.`);
        onNavigate(`/invoice/${newInv.id}`);
      }
    } catch (err: any) {
      showToast('Error saving draft: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form Submission for Finalized / Issued Invoice
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      showToast('Please select or create a customer to finalize the invoice', 'error');
      return;
    }

    const invalidItem = items.find((it) => !it.name.trim() || it.rate <= 0);
    if (invalidItem) {
      showToast('All items must have a valid name and positive unit rate to finalize', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const paidAmt = recordInitialPayment ? Number(initialPaymentAmount) || 0 : 0;
      const balanceAmt = Math.max(0, Math.round((totals.grandTotal - paidAmt) * 100) / 100);
      const paymentStatus = balanceAmt === 0 ? 'Paid' : paidAmt > 0 ? 'Partially Paid' : 'Unpaid';
      const invoiceStatus = balanceAmt === 0 ? 'Paid' : 'Sent';

      if (editInvoiceId) {
        // Finalize / update existing invoice or draft
        await updateInvoice(editInvoiceId, {
          invoiceNumber,
          invoiceDate,
          dueDate,
          paymentTerms,
          poNumber,
          referenceNumber,
          placeOfSupply,
          salesperson,
          customerId: selectedCustomer.id,
          customerSnapshot: selectedCustomer,
          items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxableAmount: totals.taxableAmount,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          amountPaid: paidAmt,
          balanceAmount: balanceAmt,
          paymentStatus,
          invoiceStatus,
          template,
          notes,
          terms,
        });

        if (recordInitialPayment && paidAmt > 0) {
          await addPayment({
            paymentId: `PAY-${Date.now().toString().slice(-6)}`,
            invoiceId: editInvoiceId,
            invoiceNumber,
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.customerName,
            paymentDate: invoiceDate,
            amount: paidAmt,
            paymentMode: initialPaymentMode,
            referenceNumber: initialPaymentRef,
            notes: 'Initial settlement on invoice finalization',
            createdBy: currentUser?.uid || 'user',
            createdByName: currentUser?.name || 'Staff',
          });
        }

        showToast(`Invoice ${invoiceNumber} finalized and saved successfully!`);
        onNavigate(`/invoice/${editInvoiceId}`);
      } else {
        const newInv = await addInvoice({
          invoiceNumber,
          invoiceDate,
          dueDate,
          paymentTerms,
          poNumber,
          referenceNumber,
          placeOfSupply,
          salesperson,
          customerId: selectedCustomer.id,
          customerSnapshot: selectedCustomer, // Immutable snapshot!
          items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxableAmount: totals.taxableAmount,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          amountPaid: paidAmt,
          balanceAmount: balanceAmt,
          paymentStatus,
          invoiceStatus,
          template,
          notes,
          terms,
          createdBy: currentUser?.uid || 'user',
          createdByName: currentUser?.name || 'Staff',
        });

        // If initial payment was recorded
        if (recordInitialPayment && paidAmt > 0) {
          await addPayment({
            paymentId: `PAY-${Date.now().toString().slice(-6)}`,
            invoiceId: newInv.id,
            invoiceNumber: newInv.invoiceNumber,
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.customerName,
            paymentDate: invoiceDate,
            amount: paidAmt,
            paymentMode: initialPaymentMode,
            referenceNumber: initialPaymentRef,
            notes: 'Initial settlement on invoice creation',
            createdBy: currentUser?.uid || 'user',
            createdByName: currentUser?.name || 'Staff',
          });
        }

        showToast(`Invoice ${newInv.invoiceNumber} created successfully!`);
        onNavigate(`/invoice/${newInv.id}`);
      }
    } catch (err: any) {
      showToast('Error generating invoice: ' + err.message, 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/invoices')}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {isEditingDraft ? 'Edit Draft Invoice' : 'Create New Invoice'}
              </h1>
              {isEditingDraft && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                  DRAFT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditingDraft
                ? 'Update incomplete draft details or finalize to issue as a tax invoice'
                : 'GST compliant billing with automatic tax split and snapshot immutability'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer"
            title="Save incomplete invoice without finalizing"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span>{isEditingDraft ? 'Update Draft' : 'Save as Draft'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">Template:</span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as InvoiceTemplate)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="classic">Classic Professional</option>
              <option value="modern">Modern Business</option>
              <option value="gst">Compact GST</option>
            </select>
          </div>
        </div>
      </div>

      {isEditingDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Bookmark className="w-4 h-4" />
            </div>
            <p className="text-xs text-amber-900 font-medium">
              You are editing draft <strong>{invoiceNumber}</strong>. You can save changes as a draft or click Finalize to issue this invoice.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitInvoice} className="space-y-6">
        {/* Section 1: Company & Invoice Header Grid */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Loaded from Company Settings */}
          <div className="space-y-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
              <Building className="w-4 h-4" />
              Company Details (Auto-filled)
            </div>
            <h3 className="text-base font-bold text-slate-900">{companySettings.companyName}</h3>
            <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
              {companySettings.address}, {companySettings.city}, {companySettings.state} - {companySettings.pincode}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
              <span>
                <strong className="font-semibold text-slate-700">GSTIN:</strong> {companySettings.gstin}
              </span>
              <span>
                <strong className="font-semibold text-slate-700">PAN:</strong> {companySettings.pan || 'N/A'}
              </span>
              <span>
                <strong className="font-semibold text-slate-700">Phone:</strong> {companySettings.phone}
              </span>
            </div>
          </div>

          {/* Right: Invoice Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => {
                  setPaymentTerms(e.target.value);
                  const days = e.target.value === 'Net 15' ? 15 : e.target.value === 'Net 30' ? 30 : e.target.value === 'Net 60' ? 60 : 0;
                  const d = new Date(invoiceDate);
                  d.setDate(d.getDate() + days);
                  setDueDate(d.toISOString().split('T')[0]);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                PO Number (Optional)
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-8921"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Place of Supply
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Bill to Customer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bill To Customer</h3>
              <p className="text-xs text-slate-400">Select an existing registered client or create a new one</p>
            </div>

            <button
              type="button"
              onClick={() => setQuickCustomerModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Quick Add Customer
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerId} - {c.customerName} {c.companyName ? `(${c.companyName})` : ''} - {c.state}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Details Preview Card */}
          {selectedCustomer && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-800 block">{selectedCustomer.customerName}</span>
                <span className="text-slate-500 block">{selectedCustomer.companyName}</span>
                <span className="text-slate-500 block mt-1">{selectedCustomer.billingAddress}</span>
                <span className="text-slate-500 block">
                  {selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px] font-bold">Tax Identifiers</span>
                <p className="mt-1 text-slate-700">
                  <strong className="font-semibold">GSTIN:</strong> {selectedCustomer.gstin || 'Unregistered'}
                </p>
                <p className="text-slate-700">
                  <strong className="font-semibold">PAN:</strong> {selectedCustomer.pan || 'N/A'}
                </p>
                <p className="text-slate-700">
                  <strong className="font-semibold">State Code:</strong> {selectedCustomer.stateCode || '-'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-[10px] font-bold">GST Classification</span>
                <div className="mt-1">
                  {isInterState ? (
                    <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                      Inter-State (IGST Applicable)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                      Intra-State (CGST + SGST Applicable)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Company State: {companySettings.state} → Place of Supply: {placeOfSupply}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Line Items Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Line Items &amp; GST Calculations</h3>
              <p className="text-xs text-slate-400">Add products, customize description, discount and tax rates</p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 w-8">#</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Item / Product</th>
                  <th className="px-3 py-2.5 w-24">HSN/SAC</th>
                  <th className="px-3 py-2.5 w-20">Qty</th>
                  <th className="px-3 py-2.5 w-20">Unit</th>
                  <th className="px-3 py-2.5 w-24">Rate (₹)</th>
                  <th className="px-3 py-2.5 w-24">Disc (₹)</th>
                  <th className="px-3 py-2.5 w-28">Taxable</th>
                  <th className="px-3 py-2.5 w-24">GST %</th>
                  <th className="px-3 py-2.5 w-28 text-right">Total (₹)</th>
                  <th className="px-3 py-2.5 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-3 py-2.5 space-y-1.5">
                      {/* Catalog Selector */}
                      <select
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="w-full text-[11px] p-1.5 border border-slate-200 rounded-lg text-slate-600 bg-slate-50/50"
                      >
                        <option value="">-- Load from Products --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.price})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItemRow(idx, { name: e.target.value })}
                        required
                        placeholder="Item / Service Name *"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500"
                      />

                      <textarea
                        rows={1}
                        value={item.description || ''}
                        onChange={(e) => updateItemRow(idx, { description: e.target.value })}
                        placeholder="Optional description"
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-[11px] text-slate-600 focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.hsnSacCode || ''}
                        onChange={(e) => updateItemRow(idx, { hsnSacCode: e.target.value })}
                        placeholder="998313"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItemRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        required
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItemRow(idx, { unit: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs uppercase"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItemRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                        required
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItemRow(idx, { discount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </td>

                    <td className="px-3 py-2.5 font-semibold text-slate-700">
                      {formatCurrency(item.taxableAmount)}
                    </td>

                    <td className="px-3 py-2.5">
                      <select
                        value={item.gstRate}
                        onChange={(e) => updateItemRow(idx, { gstRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>

                    <td className="px-3 py-2.5 text-right font-black text-slate-900">
                      {formatCurrency(item.total)}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateItem(idx)}
                          title="Duplicate line"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          title="Delete line"
                          className="p-1 rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Bottom Split - Notes/Terms & Totals Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Notes, Terms & Initial Payment (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Notes &amp; Payment Instructions
              </h4>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for the customer..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-amber-500"
              />

              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pt-2">
                Terms &amp; Conditions
              </h4>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Standard payment and delivery terms..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Initial Payment Settlement Option */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordInitialPayment}
                  onChange={(e) => {
                    setRecordInitialPayment(e.target.checked);
                    if (e.target.checked && initialPaymentAmount === 0) {
                      setInitialPaymentAmount(totals.grandTotal);
                    }
                  }}
                  className="rounded-sm border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800">
                  Record advance or immediate settlement for this invoice
                </span>
              </label>

              {recordInitialPayment && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      max={totals.grandTotal}
                      min="0.01"
                      step="0.01"
                      value={initialPaymentAmount}
                      onChange={(e) => setInitialPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={initialPaymentMode}
                      onChange={(e) => setInitialPaymentMode(e.target.value as PaymentMode)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Reference / UTR
                    </label>
                    <input
                      type="text"
                      value={initialPaymentRef}
                      onChange={(e) => setInitialPaymentRef(e.target.value)}
                      placeholder="e.g. UTR-98219"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Totals Summary Panel (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Invoice Financial Summary
              </h4>

              <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                <div className="flex justify-between text-slate-300 pt-1">
                  <span>Gross Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-amber-400 pt-2">
                    <span>Total Discount:</span>
                    <span className="font-semibold">-{formatCurrency(totals.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-300 pt-2 font-medium">
                  <span>Taxable Amount:</span>
                  <span>{formatCurrency(totals.taxableAmount)}</span>
                </div>

                {isInterState ? (
                  <div className="flex justify-between text-sky-400 pt-2">
                    <span>IGST (Integrated Tax):</span>
                    <span className="font-semibold">{formatCurrency(totals.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sky-400 pt-2">
                      <span>CGST (Central Tax):</span>
                      <span className="font-semibold">{formatCurrency(totals.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-sky-400 pt-2">
                      <span>SGST (State Tax):</span>
                      <span className="font-semibold">{formatCurrency(totals.sgst)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-slate-400 pt-2">
                  <span>Round Off:</span>
                  <span>{formatCurrency(totals.roundOff)}</span>
                </div>

                <div className="flex justify-between text-base font-black text-white pt-3">
                  <span>Grand Total:</span>
                  <span className="text-amber-400 text-lg">{formatCurrency(totals.grandTotal)}</span>
                </div>

                {recordInitialPayment && initialPaymentAmount > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-400 pt-2">
                      <span>Initial Paid:</span>
                      <span>-{formatCurrency(initialPaymentAmount)}</span>
                    </div>
                    <div className="flex justify-between text-amber-300 pt-2 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(Math.max(0, totals.grandTotal - initialPaymentAmount))}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting
                    ? 'Finalizing Invoice...'
                    : isEditingDraft
                    ? 'Finalize & Issue Invoice'
                    : 'Generate & Save Invoice'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  {isEditingDraft ? 'Update Draft Changes' : 'Save as Draft (Incomplete)'}
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Drafts can be incomplete and saved for later editing without finalizing tax sequence numbers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={quickCustomerModalOpen}
        onClose={() => setQuickCustomerModalOpen(false)}
        title="Quick Register Customer"
        maxWidth="lg"
      >
        <form onSubmit={handleQuickCustomerSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
              <input
                type="text"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                required
                placeholder="Contact Person or Client Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={newCustCompany}
                onChange={(e) => setNewCustCompany(e.target.value)}
                placeholder="Enterprise Legal Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={newCustGstin}
                onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                placeholder="33AAAAA0000A1Z5"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
              <input
                type="tel"
                value={newCustMobile}
                onChange={(e) => setNewCustMobile(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={newCustEmail}
                onChange={(e) => setNewCustEmail(e.target.value)}
                placeholder="billing@company.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
              <select
                value={newCustState}
                onChange={(e) => setNewCustState(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address *</label>
            <textarea
              rows={2}
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              required
              placeholder="Building, street, landmark"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={newCustCity}
                onChange={(e) => setNewCustCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                value={newCustPincode}
                onChange={(e) => setNewCustPincode(e.target.value)}
                placeholder="600001"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuickCustomerModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs"
            >
              Save &amp; Select Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
