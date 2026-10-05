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
  Eye,
  Printer,
  FileDown,
  Image as ImageIcon,
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
  getUserDisplayName,
} from '../../types';
import {
  calculateItemTaxes,
  calculateInvoiceTotals,
  getStateCodeByName,
} from '../../utils/taxCalculator';
import { formatCurrency, formatInvoiceDate } from '../../utils/formatters';
import { downloadInvoiceImage, downloadInvoicePdf } from '../../utils/exportInvoice';
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
  const [isManualInvoiceNumber, setIsManualInvoiceNumber] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState(invoiceSettings.defaultPaymentTerms || 'Due on Receipt');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [deliveryNote, setDeliveryNote] = useState('');
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
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState(companySettings.state || 'Tamil Nadu');
  const [newCustPincode, setNewCustPincode] = useState('');

  // Financial Summary States
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [invoiceShipping, setInvoiceShipping] = useState<number>(0);
  const [invoiceTax, setInvoiceTax] = useState<number>(0);

  // Live Invoice Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Visibility settings from invoiceSettings
  const showDiscount = invoiceSettings.showDiscount !== false;
  const showShipping = invoiceSettings.showShipping !== false;
  const showGst = invoiceSettings.showGst !== false;
  const showTax = invoiceSettings.showTax !== false && showGst;
  const showRoundOff = invoiceSettings.showRoundOff !== false;
  const showPaid = invoiceSettings.showPaid !== false;
  const showBalanceDue = invoiceSettings.showBalanceDue !== false;

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_init_1',
      name: '',
      description: '',
      hsnSacCode: '',
      quantity: 1,
      unit: '',
      rate: 0,
      discount: 0,
      discountType: 'fixed',
      taxableAmount: 0,
      gstRate: 0,
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
      setDeliveryNote(existingInvoice.deliveryNote || '');
      setPaymentTerms(existingInvoice.paymentTerms || 'Due on Receipt');
      setReferenceNumber(existingInvoice.referenceNumber || '');
      setPlaceOfSupply(existingInvoice.placeOfSupply || companySettings.state || 'Tamil Nadu');
      setSalesperson(existingInvoice.salesperson || currentUser?.name || 'Admin');
      setTemplate(existingInvoice.template || 'classic');
      setInvoiceDiscount(existingInvoice.discount || 0);
      setInvoiceShipping(existingInvoice.shipping || 0);
      const existingTax = existingInvoice.tax !== undefined
        ? existingInvoice.tax
        : (existingInvoice.cgst + existingInvoice.sgst + existingInvoice.igst || 0);
      setInvoiceTax(existingTax);
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
    if (!editInvoiceId && !isManualInvoiceNumber) {
      setInvoiceNumber(getNextInvoiceNumber());
    }
  }, [invoiceSettings, editInvoiceId, invoices, isManualInvoiceNumber]);

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

  // Recalculate item when quantities or rates change
  const updateItemRow = (index: number, updates: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };
      const qty = Number(current.quantity) || 0;
      const rate = Number(current.rate) || 0;
      const total = Math.round(qty * rate * 100) / 100;

      copy[index] = {
        ...current,
        taxableAmount: total,
        cgst: 0,
        sgst: 0,
        igst: 0,
        gstRate: 0,
        discount: 0,
        total,
      };
      return copy;
    });
  };

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
        unit: '',
        rate: 0,
        discount: 0,
        discountType: 'fixed',
        taxableAmount: 0,
        gstRate: 0,
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

  // Totals Calculation according to authoritative formula: Subtotal - Discount + Tax + Shipping +/- Round Off = Grand Total
  const totals = useMemo(() => {
    let subtotal = 0;
    items.forEach((it) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      subtotal += Math.round(q * r * 100) / 100;
    });
    subtotal = Math.round(subtotal * 100) / 100;

    // Apply show/hide setting constraints:
    // If disabled in settings, value is 0 and not applied/added
    const discount = showDiscount ? Math.min(subtotal, Math.max(0, Number(invoiceDiscount) || 0)) : 0;
    const tax = showGst ? Math.max(0, Number(invoiceTax) || 0) : 0;
    const shipping = showShipping ? Math.max(0, Number(invoiceShipping) || 0) : 0;

    // Subtotal - Discount + Tax + Shipping
    const preRoundTotal = Math.max(0, Math.round((subtotal - discount + tax + shipping) * 100) / 100);

    const autoRound = invoiceSettings.autoRoundOff !== false && companySettings.enableRoundOff !== false;
    let roundOff = 0;
    let grandTotal = preRoundTotal;

    if (autoRound) {
      grandTotal = Math.round(preRoundTotal);
      roundOff = Math.round((grandTotal - preRoundTotal) * 100) / 100;
    }

    const taxableAmount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    return {
      subtotal,
      discount,
      tax,
      shipping,
      roundOff,
      taxableAmount,
      cgst: 0,
      sgst: 0,
      igst: tax,
      grandTotal,
    };
  }, [
    items,
    invoiceDiscount,
    invoiceTax,
    invoiceShipping,
    showDiscount,
    showShipping,
    showGst,
    invoiceSettings.autoRoundOff,
    companySettings.enableRoundOff,
  ]);

  // Quick Customer Creation
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustAddress.trim() || !newCustState.trim()) {
      showToast('Name, address and state are required', 'error');
      return;
    }

    try {
      const custCode = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
      const stateCode = getStateCodeByName(newCustState);
      const created = await addCustomer({
        customerId: custCode,
        customerName: newCustName.trim(),
        companyName: '',
        mobileNumber: newCustMobile.trim(),
        email: '',
        gstin: '',
        billingAddress: newCustAddress.trim(),
        shippingAddress: newCustAddress.trim(),
        city: newCustCity.trim(),
        state: newCustState,
        pincode: newCustPincode.trim(),
        stateCode,
        createdBy: currentUser?.uid || 'user',
      });

      setSelectedCustomerId(created.id);
      setQuickCustomerModalOpen(false);
      showToast('Customer created and selected successfully');

      // Reset form
      setNewCustName('');
      setNewCustMobile('');
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
        deliveryNote,
        paymentTerms,
        referenceNumber,
        placeOfSupply: placeOfSupply || companySettings.state || 'Tamil Nadu',
        salesperson,
        customerId: custId,
        customerSnapshot: customerToUse,
        companySnapshot: companySettings,
        items: draftItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
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
        createdByName: getUserDisplayName(currentUser),
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
          deliveryNote,
          paymentTerms,
          referenceNumber,
          placeOfSupply,
          salesperson,
          customerId: selectedCustomer.id,
          customerSnapshot: selectedCustomer,
          companySnapshot: companySettings,
          items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shipping: totals.shipping,
          tax: totals.tax,
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
            createdByName: getUserDisplayName(currentUser),
          });
        }

        showToast(`Invoice ${invoiceNumber} finalized and saved successfully!`);
        onNavigate(`/invoice/${editInvoiceId}`);
      } else {
        const newInv = await addInvoice({
          invoiceNumber,
          invoiceDate,
          dueDate,
          deliveryNote,
          paymentTerms,
          referenceNumber,
          placeOfSupply,
          salesperson,
          customerId: selectedCustomer.id,
          customerSnapshot: selectedCustomer, // Immutable snapshot!
          companySnapshot: companySettings,
          items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shipping: totals.shipping,
          tax: totals.tax,
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
          createdByName: getUserDisplayName(currentUser),
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
            createdByName: getUserDisplayName(currentUser),
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

  // Export handlers for Live Preview
  const handlePrintPreview = () => {
    window.print();
  };

  const handleDownloadPreviewPdf = async () => {
    try {
      setIsExporting(true);
      showToast('Generating high-resolution PDF...');
      await downloadInvoicePdf('invoice-create-preview-area', invoiceNumber || 'invoice');
      showToast('PDF downloaded successfully!');
    } catch (err: any) {
      showToast('Failed to generate PDF: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPreviewImage = async () => {
    try {
      setIsExporting(true);
      showToast('Generating invoice image...');
      await downloadInvoiceImage('invoice-create-preview-area', invoiceNumber || 'invoice');
      showToast('Invoice image downloaded successfully!');
    } catch (err: any) {
      showToast('Failed to generate image: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
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
            onClick={() => setPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
            title="Live invoice preview & export"
          >
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            <span>Preview</span>
          </button>

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
            {companySettings.phone && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                <span>
                  <strong className="font-semibold text-slate-700">Phone:</strong> {companySettings.phone}
                </span>
              </div>
            )}
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
                onChange={(e) => {
                  setInvoiceNumber(e.target.value);
                  setIsManualInvoiceNumber(true);
                }}
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

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Delivery Note (Optional)
              </label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="e.g. DN-2026/001"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
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
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-800 block text-sm">{selectedCustomer.customerName}</span>
                {selectedCustomer.companyName && (
                  <span className="text-slate-500 block">{selectedCustomer.companyName}</span>
                )}
                <span className="text-slate-500 block mt-1">{selectedCustomer.billingAddress}</span>
                <span className="text-slate-500 block">
                  {selectedCustomer.city ? `${selectedCustomer.city}, ` : ''}{selectedCustomer.state} {selectedCustomer.pincode ? `- ${selectedCustomer.pincode}` : ''}
                </span>
              </div>
              <div className="space-y-1">
                {selectedCustomer.mobileNumber && (
                  <p className="text-slate-700">
                    <strong className="font-semibold text-slate-800">Mobile:</strong> {selectedCustomer.mobileNumber}
                  </p>
                )}
                {selectedCustomer.email && (
                  <p className="text-slate-700">
                    <strong className="font-semibold text-slate-800">Email:</strong> {selectedCustomer.email}
                  </p>
                )}
                <p className="text-slate-700">
                  <strong className="font-semibold text-slate-800">Place of Supply:</strong> {placeOfSupply}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Line Items Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Line Items &amp; Pricing</h3>
              <p className="text-xs text-slate-400">Enter item details, quantity, and rate (manual typing)</p>
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
                  <th className="px-3 py-2.5 w-10">#</th>
                  <th className="px-3 py-2.5 min-w-[260px]">Item / Product / Service</th>
                  <th className="px-3 py-2.5 w-24">Qty</th>
                  <th className="px-3 py-2.5 w-32">Rate (₹)</th>
                  <th className="px-3 py-2.5 w-32 text-right">Total (₹)</th>
                  <th className="px-3 py-2.5 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItemRow(idx, { name: e.target.value })}
                        required
                        placeholder="Item / Product / Service Name *"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500"
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
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
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
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-right font-black text-slate-900 text-sm">
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

              <div className="space-y-3 text-xs divide-y divide-slate-800/80">
                <div className="flex justify-between items-center text-slate-300 pt-1">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-white">{formatCurrency(totals.subtotal)}</span>
                </div>

                {/* Editable Discount Amount (controlled by showDiscount setting) */}
                {showDiscount && (
                  <div className="pt-2 flex justify-between items-center gap-2">
                    <span className="text-amber-400 font-semibold">Discount Amount (₹):</span>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                        onChange={(e) => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-amber-300 text-right focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Editable Tax (controlled by showGst setting) */}
                {showGst && (
                  <div className="pt-2 flex justify-between items-center gap-2">
                    <span className="text-slate-300 font-semibold">Tax (₹):</span>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoiceTax === 0 ? '' : invoiceTax}
                        onChange={(e) => setInvoiceTax(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white text-right focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Editable Shipping (controlled by showShipping setting) */}
                {showShipping && (
                  <div className="pt-2 flex justify-between items-center gap-2">
                    <span className="text-slate-300 font-semibold">Shipping (₹):</span>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoiceShipping === 0 ? '' : invoiceShipping}
                        onChange={(e) => setInvoiceShipping(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white text-right focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {showRoundOff && totals.roundOff !== 0 && (
                  <div className="flex justify-between items-center text-slate-400 pt-2">
                    <span>Round Off:</span>
                    <span className="font-semibold text-slate-300">
                      {totals.roundOff < 0 ? `-${formatCurrency(Math.abs(totals.roundOff))}` : formatCurrency(totals.roundOff)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-white pt-3 items-center">
                  <span>Grand Total:</span>
                  <span className="text-amber-400 text-xl font-black">{formatCurrency(totals.grandTotal)}</span>
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

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 text-amber-300 hover:text-amber-200 font-bold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  Live Invoice Preview &amp; Export
                </button>
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
                placeholder="Client Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
              <input
                type="tel"
                value={newCustMobile}
                onChange={(e) => setNewCustMobile(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
              <select
                value={newCustState}
                onChange={(e) => setNewCustState(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500"
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

      {/* Live Tax Invoice Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Live Tax Invoice Preview"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Action Bar for Live Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Export Invoice:</span>
              <button
                type="button"
                onClick={handlePrintPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={handleDownloadPreviewPdf}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-600" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadPreviewImage}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                Download Image
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPreviewModalOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Close Preview
            </button>
          </div>

          {/* Printable / Capturable Document Preview Area */}
          <div
            id="invoice-create-preview-area"
            className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-slate-800"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shrink-0">
                    IT
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {companySettings.companyName}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2 max-w-sm leading-relaxed">
                  {companySettings.address}, {companySettings.city}, {companySettings.state} - {companySettings.pincode}
                </p>
              </div>

              {/* User-configured company logo (replaces top-right TAX INVOICE block) */}
              {invoiceSettings.showLogo !== false && companySettings.logoUrl ? (
                <div className="flex sm:justify-end items-center self-start shrink-0">
                  <img
                    src={companySettings.logoUrl}
                    alt={companySettings.companyName || 'Company Logo'}
                    className="max-h-20 max-w-[180px] sm:max-w-[200px] w-auto h-auto object-contain rounded-lg shadow-xs"
                  />
                </div>
              ) : null}
            </div>

            {/* Bill To & TAX INVOICE Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Billed To
                </p>
                {selectedCustomer ? (
                  <>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedCustomer.customerName}</h4>
                    {selectedCustomer.companyName && (
                      <p className="font-semibold text-slate-700">{selectedCustomer.companyName}</p>
                    )}
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      {selectedCustomer.billingAddress}
                      <br />
                      {selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}
                    </p>
                    {selectedCustomer.mobileNumber && (
                      <p className="mt-1 text-slate-600"><strong>Mobile:</strong> {selectedCustomer.mobileNumber}</p>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400 italic">No customer selected yet</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                  TAX INVOICE
                </p>
                <div className="space-y-1 text-slate-700">
                  <p><strong className="text-slate-900">Invoice Number:</strong> {invoiceNumber || 'INV-DRAFT'}</p>
                  <p><strong className="text-slate-900">Invoice Date:</strong> {formatInvoiceDate(invoiceDate)}</p>
                  <p><strong className="text-slate-900">Due Date:</strong> {formatInvoiceDate(dueDate)}</p>
                  <p><strong className="text-slate-900">Delivery Note:</strong> {deliveryNote || '-'}</p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 font-bold text-slate-900 uppercase text-[10px]">
                    <th className="py-2 pr-2 w-8">#</th>
                    <th className="py-2 px-2">Item / Product / Service</th>
                    <th className="py-2 px-2 text-center w-16">Qty</th>
                    <th className="py-2 px-2 text-right w-20">Rate</th>
                    <th className="py-2 pl-2 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-2 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-2">
                        <p className="font-bold text-slate-900">{item.name || 'Untitled Item'}</p>
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-800">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-800">
                        {formatCurrency(Number(item.rate) || 0)}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-bold text-slate-900">
                        {formatCurrency(Math.round((Number(item.quantity) || 0) * (Number(item.rate) || 0) * 100) / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Financial Summary Box */}
            <div className="flex justify-end pt-3 border-t border-slate-200">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="pb-1 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Invoice Financial Summary
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totals.subtotal)}</span>
                </div>
                {showDiscount && totals.discount > 0 && (
                  <div className="flex justify-between text-amber-600 font-semibold">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.discount)}</span>
                  </div>
                )}
                {showTax && totals.tax > 0 && (
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>Tax</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                )}
                {showShipping && totals.shipping > 0 && (
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>Shipping</span>
                    <span>{formatCurrency(totals.shipping)}</span>
                  </div>
                )}
                {showRoundOff && (
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Round Off</span>
                    <span>
                      {totals.roundOff < 0 ? `-${formatCurrency(Math.abs(totals.roundOff))}` : formatCurrency(totals.roundOff || 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                  <span>Grand Total</span>
                  <span className="text-amber-600 font-black">{formatCurrency(totals.grandTotal)}</span>
                </div>
                {showPaid && (
                  <div className="flex justify-between text-xs font-semibold text-emerald-700 pt-1">
                    <span>Paid</span>
                    <span>{formatCurrency(recordInitialPayment ? Number(initialPaymentAmount) || 0 : 0)}</span>
                  </div>
                )}
                {showBalanceDue && (
                  <div className="flex justify-between text-xs font-semibold text-rose-600 pt-1">
                    <span>Balance Due</span>
                    <span>{formatCurrency(Math.max(0, totals.grandTotal - (recordInitialPayment ? Number(initialPaymentAmount) || 0 : 0)))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
