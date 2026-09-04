import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  CreditCard,
  Printer,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Payment, PaymentMode, Invoice } from '../../types';
import { formatCurrency, formatDate, numberToWordsIndian } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface PaymentListViewProps {
  onNavigate: (path: string) => void;
}

export const PaymentListView: React.FC<PaymentListViewProps> = ({ onNavigate }) => {
  const { payments, invoices, addPayment, companySettings } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('All');

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Receipt Modal State
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  // Selected invoice for record payment
  const selectedInvoice = useMemo(() => {
    return invoices.find((inv) => inv.id === selectedInvoiceId) || null;
  }, [invoices, selectedInvoiceId]);

  // When invoice selection changes, populate remaining balance
  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    const found = invoices.find((inv) => inv.id === id);
    if (found) {
      setAmount(found.balanceAmount);
    }
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (modeFilter !== 'All' && p.paymentMode !== modeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = p.paymentId.toLowerCase().includes(q);
        const matchInv = p.invoiceNumber.toLowerCase().includes(q);
        const matchCust = p.customerName.toLowerCase().includes(q);
        const matchRef = p.referenceNumber?.toLowerCase().includes(q);
        if (!matchId && !matchInv && !matchCust && !matchRef) return false;
      }
      return true;
    });
  }, [payments, modeFilter, searchQuery]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) {
      showToast('Please choose an invoice with balance due', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }
    if (amount > selectedInvoice.balanceAmount) {
      showToast('Payment amount cannot exceed balance due', 'error');
      return;
    }

    try {
      const nextId = `PAY-${Date.now().toString().slice(-6)}`;
      await addPayment({
        paymentId: nextId,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        customerId: selectedInvoice.customerId,
        customerName: selectedInvoice.customerSnapshot?.customerName || 'Customer',
        paymentDate,
        amount: Number(amount),
        paymentMode,
        referenceNumber: refNumber,
        notes,
        createdBy: currentUser?.uid || 'user',
        createdByName: currentUser?.name || 'Staff',
      });

      showToast(`Payment receipt ${nextId} generated!`);
      setIsRecordModalOpen(false);
      setSelectedInvoiceId('');
      setAmount(0);
      setRefNumber('');
      setNotes('');
    } catch (err: any) {
      showToast('Failed to record payment: ' + err.message, 'error');
    }
  };

  // Invoices with outstanding balances
  const payableInvoices = useMemo(() => {
    return invoices.filter((i) => i.invoiceStatus !== 'Cancelled' && i.balanceAmount > 0);
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Payment Transactions &amp; Receipts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log inward collections, verify electronic UTR references, and print payment vouchers
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedInvoiceId(payableInvoices[0]?.id || '');
            if (payableInvoices[0]) {
              setAmount(payableInvoices[0].balanceAmount);
            }
            setIsRecordModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Record Inward Payment
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by receipt ID, invoice number, customer, UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        <div>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
          >
            <option value="All">All Payment Modes</option>
            <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Cheque">Cheque</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Receipt ID</th>
                <th className="px-5 py-3">Invoice No</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Payment Date</th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Reference / UTR</th>
                <th className="px-5 py-3 text-right">Amount (₹)</th>
                <th className="px-5 py-3">Collected By</th>
                <th className="px-5 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    No payment transactions logged.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                      {p.paymentId}
                    </td>

                    <td className="px-5 py-3.5 font-semibold text-amber-600">
                      <button
                        onClick={() => onNavigate(`/invoice/${p.invoiceId}`)}
                        className="hover:underline cursor-pointer"
                      >
                        {p.invoiceNumber}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      {p.customerName}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      {formatDate(p.paymentDate)}
                    </td>

                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {p.paymentMode}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {p.referenceNumber || '-'}
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-emerald-600">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="px-5 py-3.5 text-slate-500">
                      {p.createdByName}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setViewingPayment(p)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="View Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inward Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Inward Payment"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Invoice *
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleSelectInvoice(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white"
            >
              <option value="">-- Choose Invoice to Settle --</option>
              {payableInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - {inv.customerSnapshot?.customerName} (Bal: ₹{inv.balanceAmount})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex justify-between">
              <div>
                <span className="font-bold text-slate-800 block">
                  {selectedInvoice.customerSnapshot?.customerName}
                </span>
                <span className="text-slate-500">Total: {formatCurrency(selectedInvoice.grandTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Balance Due</span>
                <span className="text-sm font-black text-amber-900">
                  {formatCurrency(selectedInvoice.balanceAmount)}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                max={selectedInvoice?.balanceAmount || 999999}
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference / UTR / Cheque No
              </label>
              <input
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="e.g. UTR-8921820"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via NEFT from HDFC Bank"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs cursor-pointer"
            >
              Confirm Settlement
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Receipt Voucher Modal */}
      {viewingPayment && (
        <Modal
          isOpen={!!viewingPayment}
          onClose={() => setViewingPayment(null)}
          title="Payment Acknowledgement Voucher"
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div
              id="payment-voucher"
              className="border-2 border-slate-900 p-6 rounded-2xl space-y-4 text-xs font-sans"
            >
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">
                    {companySettings.companyName}
                  </h3>
                  <p className="text-slate-500 text-[11px]">{companySettings.address}, {companySettings.city}</p>
                  <p className="text-slate-600 text-[11px]">GSTIN: {companySettings.gstin}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-700 text-white px-2 py-0.5 rounded-sm">
                    PAYMENT RECEIPT
                  </span>
                  <p className="text-sm font-bold mt-1 text-slate-900">{viewingPayment.paymentId}</p>
                  <p className="text-slate-500 text-[11px]">Date: {formatDate(viewingPayment.paymentDate)}</p>
                </div>
              </div>

              {/* Receipt Details */}
              <div className="space-y-2 py-2">
                <p>
                  Received with thanks from:{' '}
                  <strong className="text-slate-900">{viewingPayment.customerName}</strong>
                </p>
                <p>
                  The sum of:{' '}
                  <strong className="text-slate-900 capitalize">
                    {numberToWordsIndian(viewingPayment.amount)}
                  </strong>
                </p>
                <p>
                  Towards settlement of Invoice:{' '}
                  <strong className="text-slate-900">{viewingPayment.invoiceNumber}</strong>
                </p>
                <p>
                  Payment Mode: <strong>{viewingPayment.paymentMode}</strong>{' '}
                  {viewingPayment.referenceNumber && (
                    <span>(Ref / UTR: {viewingPayment.referenceNumber})</span>
                  )}
                </p>
              </div>

              {/* Amount Box */}
              <div className="p-3 bg-slate-100 rounded-xl flex justify-between items-center text-sm font-black border border-slate-300">
                <span>TOTAL RECEIVED:</span>
                <span className="text-base text-emerald-800">
                  {formatCurrency(viewingPayment.amount)}
                </span>
              </div>

              {/* Signatures */}
              <div className="pt-6 flex justify-between items-end text-[11px] text-slate-500">
                <p>Processed by: {viewingPayment.createdByName}</p>
                <div className="text-center border-t border-slate-400 pt-1 w-40">
                  <p className="font-bold text-slate-800">Authorized Signature</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setViewingPayment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Voucher
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
