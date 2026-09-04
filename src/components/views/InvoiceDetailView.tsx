import React, { useState } from 'react';
import {
  Printer,
  Download,
  Share2,
  CreditCard,
  XCircle,
  ArrowLeft,
  CheckCircle2,
  Building,
  QrCode,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceTemplate, PaymentMode } from '../../types';
import { formatCurrency, formatDate, numberToWordsIndian } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface InvoiceDetailViewProps {
  invoiceId: string;
  onNavigate: (path: string) => void;
}

export const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({
  invoiceId,
  onNavigate,
}) => {
  const { invoices, companySettings, addPayment, updateInvoiceStatus, payments } = useData();
  const { currentUser, role } = useAuth();
  const { showToast } = useToast();

  const invoice = invoices.find((inv) => inv.id === invoiceId);

  // Template switch state
  const [template, setTemplate] = useState<InvoiceTemplate>(
    invoice?.template || 'classic'
  );

  // Record Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(invoice?.balanceAmount || 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Cancel confirmation modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!invoice) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Invoice Not Found</h3>
        <p className="text-xs text-slate-500">
          The requested invoice identifier does not exist or has been removed.
        </p>
        <button
          onClick={() => onNavigate('/invoices')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  // Related payments for this invoice
  const invoicePayments = payments.filter((p) => p.invoiceId === invoice.id);

  // Handle Print / PDF
  const handlePrint = () => {
    window.print();
  };

  // Copy shareable link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Invoice link copied to clipboard!');
  };

  // Submit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }
    if (paymentAmount > invoice.balanceAmount) {
      showToast('Payment amount cannot exceed balance due', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await addPayment({
        paymentId: `PAY-${Date.now().toString().slice(-6)}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerSnapshot?.customerName || 'Customer',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: Number(paymentAmount),
        paymentMode,
        referenceNumber: paymentRef,
        notes: paymentNotes,
        createdBy: currentUser?.uid || 'user',
        createdByName: currentUser?.name || 'Staff',
      });

      showToast(`Payment of ${formatCurrency(paymentAmount)} recorded successfully!`);
      setPaymentModalOpen(false);
    } catch (err: any) {
      showToast('Error recording payment: ' + err.message, 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Cancel invoice handler
  const handleCancelInvoice = async () => {
    try {
      await updateInvoiceStatus(invoice.id, 'Cancelled');
      showToast('Invoice has been marked as Cancelled');
      setCancelModalOpen(false);
    } catch (err: any) {
      showToast('Failed to cancel invoice: ' + err.message, 'error');
    }
  };

  // Inter-state check
  const isInterState =
    (companySettings.state || '').trim().toLowerCase() !==
    (invoice.placeOfSupply || '').trim().toLowerCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Action Bar (hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/invoices')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{invoice.invoiceNumber}</h2>
              <Badge
                variant={
                  invoice.invoiceStatus === 'Cancelled'
                    ? 'neutral'
                    : invoice.paymentStatus === 'Paid'
                    ? 'success'
                    : invoice.paymentStatus === 'Partially Paid'
                    ? 'info'
                    : 'warning'
                }
              >
                {invoice.invoiceStatus === 'Cancelled' ? 'Cancelled' : invoice.paymentStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated on {formatDate(invoice.invoiceDate)} by {invoice.createdByName}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Template Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTemplate('classic')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                template === 'classic' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Classic
            </button>
            <button
              onClick={() => setTemplate('modern')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                template === 'modern' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Modern
            </button>
            <button
              onClick={() => setTemplate('gst')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                template === 'gst' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Compact GST
            </button>
          </div>

          {/* Record Payment Button if balance > 0 and not cancelled */}
          {invoice.invoiceStatus !== 'Cancelled' && invoice.balanceAmount > 0 && (
            <button
              onClick={() => {
                setPaymentAmount(invoice.balanceAmount);
                setPaymentModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
          )}

          {/* Print / PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Copy Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Cancel invoice (Admin only) */}
          {role === 'admin' && invoice.invoiceStatus !== 'Cancelled' && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
              title="Cancel Invoice"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          INVOICE PRINTABLE DOCUMENT (A4 Optimized)
          ========================================================================= */}
      <div
        id="invoice-print-area"
        className={`bg-white shadow-xl rounded-3xl border border-slate-200/80 p-8 sm:p-12 print:p-0 print:m-0 print:border-0 print:shadow-none print:rounded-none font-sans text-slate-800 ${
          template === 'modern' ? 'border-t-8 border-t-amber-500' : ''
        }`}
      >
        {/* =======================
            TEMPLATE 1: CLASSIC
            ======================= */}
        {template === 'classic' && (
          <div className="space-y-8">
            {/* Header: Company & Tax Invoice Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center">
                    IT
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {companySettings.companyName}
                    </h1>
                    <p className="text-xs text-slate-500">Tax Invoice / Bill of Supply</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-3 max-w-sm leading-relaxed">
                  {companySettings.address}, {companySettings.city}, {companySettings.state} - {companySettings.pincode}
                </p>
                <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4">
                  <span><strong>GSTIN:</strong> {companySettings.gstin}</span>
                  {companySettings.pan && <span><strong>PAN:</strong> {companySettings.pan}</span>}
                  <span><strong>Phone:</strong> {companySettings.phone}</span>
                </div>
              </div>

              <div className="sm:text-right space-y-1">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-slate-900 text-white px-3 py-1 rounded-md inline-block">
                  TAX INVOICE
                </span>
                <p className="text-lg font-black text-slate-900 mt-2">{invoice.invoiceNumber}</p>
                <p className="text-xs text-slate-600">
                  <strong>Date:</strong> {formatDate(invoice.invoiceDate)}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Due Date:</strong> {formatDate(invoice.dueDate)}
                </p>
                {invoice.poNumber && (
                  <p className="text-xs text-slate-600">
                    <strong>PO No:</strong> {invoice.poNumber}
                  </p>
                )}
                <p className="text-xs text-slate-600">
                  <strong>Place of Supply:</strong> {invoice.placeOfSupply}
                </p>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Billed To
                </p>
                <h4 className="text-sm font-bold text-slate-900">
                  {invoice.customerSnapshot?.customerName}
                </h4>
                {invoice.customerSnapshot?.companyName && (
                  <p className="text-xs font-semibold text-slate-700">
                    {invoice.customerSnapshot.companyName}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {invoice.customerSnapshot?.billingAddress}
                  <br />
                  {invoice.customerSnapshot?.city}, {invoice.customerSnapshot?.state} - {invoice.customerSnapshot?.pincode}
                </p>
                <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                  <p><strong>GSTIN:</strong> {invoice.customerSnapshot?.gstin || 'Unregistered'}</p>
                  <p><strong>Mobile:</strong> {invoice.customerSnapshot?.mobileNumber || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Shipped To
                </p>
                <h4 className="text-sm font-bold text-slate-900">
                  {invoice.customerSnapshot?.customerName}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {invoice.customerSnapshot?.shippingAddress || invoice.customerSnapshot?.billingAddress}
                  <br />
                  {invoice.customerSnapshot?.city}, {invoice.customerSnapshot?.state} - {invoice.customerSnapshot?.pincode}
                </p>
                <div className="text-xs text-slate-600 mt-2">
                  <p><strong>State Code:</strong> {invoice.customerSnapshot?.stateCode || '-'}</p>
                  <p><strong>Sales Representative:</strong> {invoice.salesperson || invoice.createdByName}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-2 w-8">#</th>
                    <th className="py-2.5 px-2">Description of Goods / Services</th>
                    <th className="py-2.5 px-2 w-20">HSN/SAC</th>
                    <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                    <th className="py-2.5 px-2 w-20 text-right">Rate</th>
                    <th className="py-2.5 px-2 w-24 text-right">Taxable</th>
                    <th className="py-2.5 px-2 w-14 text-center">GST</th>
                    {isInterState ? (
                      <th className="py-2.5 px-2 w-20 text-right">IGST</th>
                    ) : (
                      <>
                        <th className="py-2.5 px-2 w-16 text-right">CGST</th>
                        <th className="py-2.5 px-2 w-16 text-right">SGST</th>
                      </>
                    )}
                    <th className="py-2.5 pl-2 w-24 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id} className="py-2">
                      <td className="py-3 pr-2 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-2">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2 text-slate-600 font-mono text-[11px]">
                        {item.hsnSacCode || '-'}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-800 font-semibold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-800">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-slate-800">
                        {formatCurrency(item.taxableAmount)}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-700 font-semibold">
                        {item.gstRate}%
                      </td>
                      {isInterState ? (
                        <td className="py-3 px-2 text-right text-slate-700">
                          {formatCurrency(item.igst)}
                        </td>
                      ) : (
                        <>
                          <td className="py-3 px-2 text-right text-slate-700">
                            {formatCurrency(item.cgst)}
                          </td>
                          <td className="py-3 px-2 text-right text-slate-700">
                            {formatCurrency(item.sgst)}
                          </td>
                        </>
                      )}
                      <td className="py-3 pl-2 text-right font-bold text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Words */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-4 border-t border-slate-200">
              <div className="sm:col-span-7 space-y-4">
                {/* Amount in words */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Total Amount in Words
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 capitalize">
                    {numberToWordsIndian(invoice.grandTotal)}
                  </p>
                </div>

                {/* Bank Details & UPI QR */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="text-xs space-y-1">
                    <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">
                      Company Bank Account for Electronic Settlement
                    </p>
                    <p><strong>Bank:</strong> {companySettings.bankName}</p>
                    <p><strong>Account Name:</strong> {companySettings.accountName}</p>
                    <p className="font-mono"><strong>A/C No:</strong> {companySettings.accountNumber}</p>
                    <p className="font-mono"><strong>IFSC Code:</strong> {companySettings.ifscCode}</p>
                    <p><strong>Branch:</strong> {companySettings.branch}</p>
                  </div>

                  {companySettings.upiId && (
                    <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Instant UPI Payment
                      </p>
                      <div className="w-20 h-20 bg-white border border-slate-300 rounded-lg mx-auto sm:ml-auto flex items-center justify-center p-1 shadow-xs">
                        {/* Static visual representation of QR code with real UPI intent */}
                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white rounded-xs">
                          <QrCode className="w-12 h-12" />
                        </div>
                      </div>
                      <p className="text-[10px] font-mono text-slate-600 mt-1">{companySettings.upiId}</p>
                    </div>
                  )}
                </div>

                {/* Terms and conditions */}
                {invoice.terms && (
                  <div className="text-[11px] text-slate-500">
                    <strong className="block text-slate-700 font-semibold mb-0.5">Terms &amp; Conditions:</strong>
                    <p className="whitespace-pre-line leading-relaxed">{invoice.terms}</p>
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="sm:col-span-5 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(invoice.subtotal)}</span>
                </div>

                {invoice.discount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-amber-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Taxable Value:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(invoice.taxableAmount)}</span>
                </div>

                {isInterState ? (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">IGST:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(invoice.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">CGST:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(invoice.cgst)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">SGST:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(invoice.sgst)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-500">
                  <span>Round Off:</span>
                  <span>{formatCurrency(invoice.roundOff)}</span>
                </div>

                <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-black text-slate-950">
                  <span>Total Payable:</span>
                  <span className="text-base text-slate-900">{formatCurrency(invoice.grandTotal)}</span>
                </div>

                <div className="flex justify-between py-1 text-emerald-700">
                  <span>Amount Paid:</span>
                  <span className="font-semibold">{formatCurrency(invoice.amountPaid)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-900 font-bold bg-amber-50 px-2 rounded-lg">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(invoice.balanceAmount)}</span>
                </div>
              </div>
            </div>

            {/* Signatory Footer */}
            <div className="pt-10 flex justify-between items-end text-xs">
              <div className="text-[11px] text-slate-400">
                <p>This is a computer generated invoice requiring no physical signature.</p>
                <p>Invoice Temple ERP Engine - Reference #{invoice.id.slice(0, 8)}</p>
              </div>

              <div className="text-center w-56">
                <div className="h-14 flex items-end justify-center pb-2">
                  <span className="text-slate-400 italic text-xs">Digitally Verified</span>
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-bold text-slate-900">{companySettings.authorizedSignatory}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================
            TEMPLATE 2: MODERN BUSINESS
            ======================= */}
        {template === 'modern' && (
          <div className="space-y-8">
            {/* Modern Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
                    IT
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">{companySettings.companyName}</h1>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                      Tax Invoice &bull; GST Registered Enterprise
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">
                  {companySettings.address}, {companySettings.city}, {companySettings.state} - {companySettings.pincode}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>GSTIN:</strong> <span className="font-mono">{companySettings.gstin}</span>
                </p>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-2xl sm:text-right min-w-[220px]">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Invoice Reference
                </span>
                <p className="text-lg font-black">{invoice.invoiceNumber}</p>
                <div className="text-xs text-slate-300 mt-2 space-y-0.5">
                  <p>Issue Date: {formatDate(invoice.invoiceDate)}</p>
                  <p>Due Date: {formatDate(invoice.dueDate)}</p>
                  <p>POS: {invoice.placeOfSupply}</p>
                </div>
              </div>
            </div>

            {/* Client Snapshot */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                  Client Information
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  {invoice.customerSnapshot?.customerName}
                </h4>
                {invoice.customerSnapshot?.companyName && (
                  <p className="text-xs font-semibold text-slate-700">
                    {invoice.customerSnapshot.companyName}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {invoice.customerSnapshot?.billingAddress}, {invoice.customerSnapshot?.city}, {invoice.customerSnapshot?.state}
                </p>
                <p className="text-xs text-slate-700 mt-2">
                  <strong>GSTIN:</strong> {invoice.customerSnapshot?.gstin || 'Unregistered'}
                </p>
              </div>

              <div className="sm:border-l sm:border-slate-200 sm:pl-6">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                  Payment Status &amp; Terms
                </span>
                <div className="mt-1">
                  <Badge
                    variant={
                      invoice.paymentStatus === 'Paid'
                        ? 'success'
                        : invoice.paymentStatus === 'Partially Paid'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {invoice.paymentStatus}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  <strong>Terms:</strong> {invoice.paymentTerms}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Representative:</strong> {invoice.salesperson}
                </p>
              </div>
            </div>

            {/* Items with Modern Styling */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                    <th className="py-3 px-3 rounded-l-xl">#</th>
                    <th className="py-3 px-3">Item Description</th>
                    <th className="py-3 px-3">HSN</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Rate</th>
                    <th className="py-3 px-3 text-right">Taxable</th>
                    <th className="py-3 px-3 text-center">GST %</th>
                    <th className="py-3 px-3 text-right rounded-r-xl">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{item.hsnSacCode || '-'}</td>
                      <td className="py-3 px-3 text-center font-semibold">{item.quantity} {item.unit}</td>
                      <td className="py-3 px-3 text-right">{formatCurrency(item.rate)}</td>
                      <td className="py-3 px-3 text-right font-medium">{formatCurrency(item.taxableAmount)}</td>
                      <td className="py-3 px-3 text-center">{item.gstRate}%</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modern Totals Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                  <p className="font-bold text-slate-800">Direct Bank Deposit / Wire</p>
                  <p>{companySettings.bankName} &bull; A/C: {companySettings.accountNumber}</p>
                  <p>IFSC: {companySettings.ifscCode} &bull; UPI: {companySettings.upiId}</p>
                </div>
                <div className="text-xs text-slate-600 italic">
                  Amount in words: {numberToWordsIndian(invoice.grandTotal)}
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Subtotal:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(invoice.taxableAmount)}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST:</span>
                    <span>{formatCurrency(invoice.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST:</span>
                      <span>{formatCurrency(invoice.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST:</span>
                      <span>{formatCurrency(invoice.sgst)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-amber-600">{formatCurrency(invoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 pt-1">
                  <span>Balance Due:</span>
                  <span className="text-rose-600">{formatCurrency(invoice.balanceAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================
            TEMPLATE 3: COMPACT GST
            ======================= */}
        {template === 'gst' && (
          <div className="space-y-4 text-xs">
            {/* Boxed GST Header */}
            <div className="border border-slate-900 p-3 grid grid-cols-2 gap-2">
              <div>
                <h3 className="font-black text-sm uppercase">{companySettings.companyName}</h3>
                <p>{companySettings.address}, {companySettings.city}, {companySettings.state}</p>
                <p><strong>GSTIN:</strong> {companySettings.gstin} | <strong>PAN:</strong> {companySettings.pan}</p>
              </div>
              <div className="text-right">
                <h2 className="font-black text-base">TAX INVOICE</h2>
                <p><strong>Inv No:</strong> {invoice.invoiceNumber}</p>
                <p><strong>Date:</strong> {formatDate(invoice.invoiceDate)}</p>
                <p><strong>Place of Supply:</strong> {invoice.placeOfSupply}</p>
              </div>
            </div>

            {/* Boxed Customer */}
            <div className="border border-slate-900 p-3">
              <p className="font-bold uppercase text-[10px]">Buyer Details:</p>
              <p className="font-bold">{invoice.customerSnapshot?.customerName} ({invoice.customerSnapshot?.companyName})</p>
              <p>{invoice.customerSnapshot?.billingAddress}, {invoice.customerSnapshot?.state}</p>
              <p><strong>GSTIN:</strong> {invoice.customerSnapshot?.gstin || 'Unregistered'}</p>
            </div>

            {/* Boxed Items Table */}
            <table className="w-full border-collapse border border-slate-900 text-left text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 font-bold">
                  <th className="p-1.5 border-r border-slate-900">#</th>
                  <th className="p-1.5 border-r border-slate-900">Description</th>
                  <th className="p-1.5 border-r border-slate-900">HSN</th>
                  <th className="p-1.5 border-r border-slate-900 text-center">Qty</th>
                  <th className="p-1.5 border-r border-slate-900 text-right">Rate</th>
                  <th className="p-1.5 border-r border-slate-900 text-right">Taxable</th>
                  <th className="p-1.5 border-r border-slate-900 text-center">GST %</th>
                  <th className="p-1.5 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="p-1.5 border-r border-slate-900">{idx + 1}</td>
                    <td className="p-1.5 border-r border-slate-900 font-medium">{item.name}</td>
                    <td className="p-1.5 border-r border-slate-900">{item.hsnSacCode}</td>
                    <td className="p-1.5 border-r border-slate-900 text-center">{item.quantity} {item.unit}</td>
                    <td className="p-1.5 border-r border-slate-900 text-right">{item.rate.toFixed(2)}</td>
                    <td className="p-1.5 border-r border-slate-900 text-right">{item.taxableAmount.toFixed(2)}</td>
                    <td className="p-1.5 border-r border-slate-900 text-center">{item.gstRate}%</td>
                    <td className="p-1.5 text-right font-bold">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Compact Bottom Summary */}
            <div className="border border-slate-900 p-3 grid grid-cols-2 gap-4">
              <div>
                <p><strong>Bank:</strong> {companySettings.bankName} | A/C: {companySettings.accountNumber}</p>
                <p><strong>IFSC:</strong> {companySettings.ifscCode}</p>
                <p className="mt-2 text-[10px] italic">Amount in words: {numberToWordsIndian(invoice.grandTotal)}</p>
              </div>
              <div className="text-right space-y-1">
                <p>Taxable Total: <strong>{formatCurrency(invoice.taxableAmount)}</strong></p>
                {isInterState ? (
                  <p>IGST: <strong>{formatCurrency(invoice.igst)}</strong></p>
                ) : (
                  <>
                    <p>CGST: <strong>{formatCurrency(invoice.cgst)}</strong></p>
                    <p>SGST: <strong>{formatCurrency(invoice.sgst)}</strong></p>
                  </>
                )}
                <p className="text-sm font-black border-t border-slate-900 pt-1">
                  Grand Total: {formatCurrency(invoice.grandTotal)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment History List (hidden on print) */}
      <div className="print:hidden bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Payment Transactions ({invoicePayments.length})</h3>
        {invoicePayments.length === 0 ? (
          <p className="text-xs text-slate-400">No payment records logged for this invoice yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2">Receipt ID</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Reference</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoicePayments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{p.paymentId}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-2.5 font-medium">{p.paymentMode}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{p.referenceNumber || '-'}</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.createdByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment for ${invoice.invoiceNumber}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 flex justify-between">
            <span>Outstanding Balance Due:</span>
            <span className="font-bold">{formatCurrency(invoice.balanceAmount)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Amount to Collect (₹) *</label>
            <input
              type="number"
              max={invoice.balanceAmount}
              min="0.01"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode *</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR / Cheque Number</label>
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g. UTR-9821098"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Payment remarks..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPayment}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs cursor-pointer"
            >
              {isSubmittingPayment ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Confirm Invoice Cancellation"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to cancel invoice <strong>{invoice.invoiceNumber}</strong>?
            This will void outstanding balances and mark the record as Cancelled in the ledger.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              No, Keep Invoice
            </button>
            <button
              onClick={handleCancelInvoice}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs cursor-pointer"
            >
              Yes, Cancel Invoice
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
