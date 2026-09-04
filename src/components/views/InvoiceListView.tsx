import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Printer,
  CreditCard,
  Eye,
  FileText,
  Calendar,
  XCircle,
  Edit2,
  Bookmark,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Invoice, PaymentMode } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface InvoiceListViewProps {
  onNavigate: (path: string) => void;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({ onNavigate }) => {
  const { invoices, customers, users, addPayment, updateInvoiceStatus } = useData();
  const { role, currentUser } = useAuth();
  const { showToast } = useToast();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');

  // Quick Payment Modal state
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState('');

  // Cancel modal state
  const [cancelTargetInvoice, setCancelTargetInvoice] = useState<Invoice | null>(null);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Role-based visibility: Normal users can only see their invoices if restricted, or all company invoices
      if (role === 'user' && userFilter === 'Mine') {
        if (inv.createdBy !== currentUser?.uid) return false;
      }

      // Search bar
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = inv.invoiceNumber.toLowerCase().includes(q);
        const nameMatch = inv.customerSnapshot?.customerName.toLowerCase().includes(q);
        const compMatch = inv.customerSnapshot?.companyName?.toLowerCase().includes(q);
        const phoneMatch = inv.customerSnapshot?.mobileNumber?.includes(q);
        if (!numMatch && !nameMatch && !compMatch && !phoneMatch) return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Draft') {
          if (inv.invoiceStatus !== 'Draft') return false;
        } else if (statusFilter === 'Cancelled') {
          if (inv.invoiceStatus !== 'Cancelled') return false;
        } else {
          if (inv.invoiceStatus === 'Cancelled' || inv.invoiceStatus === 'Draft' || inv.paymentStatus !== statusFilter) {
            return false;
          }
        }
      }

      // Customer filter
      if (customerFilter !== 'All' && inv.customerId !== customerFilter) {
        return false;
      }

      // User filter (Admin)
      if (role === 'admin' && userFilter !== 'All' && inv.createdBy !== userFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'All') {
        const invDate = new Date(inv.invoiceDate);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (dateFilter === 'Today') {
          if (inv.invoiceDate !== todayStr) return false;
        } else if (dateFilter === 'This Week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          if (invDate < oneWeekAgo) return false;
        } else if (dateFilter === 'This Month') {
          const monthPrefix = todayStr.substring(0, 7);
          if (!inv.invoiceDate.startsWith(monthPrefix)) return false;
        } else if (dateFilter === 'Custom') {
          if (customStartDate && inv.invoiceDate < customStartDate) return false;
          if (customEndDate && inv.invoiceDate > customEndDate) return false;
        }
      }

      return true;
    });
  }, [
    invoices,
    role,
    currentUser,
    searchQuery,
    statusFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    userFilter,
    customerFilter,
  ]);

  const handleOpenPaymentModal = (inv: Invoice) => {
    setActivePaymentInvoice(inv);
    setPaymentAmount(inv.balanceAmount);
    setPaymentMode('Bank Transfer');
    setPaymentRef('');
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentInvoice) return;
    if (paymentAmount <= 0) {
      showToast('Amount must be greater than zero', 'error');
      return;
    }

    try {
      await addPayment({
        paymentId: `PAY-${Date.now().toString().slice(-6)}`,
        invoiceId: activePaymentInvoice.id,
        invoiceNumber: activePaymentInvoice.invoiceNumber,
        customerId: activePaymentInvoice.customerId,
        customerName: activePaymentInvoice.customerSnapshot?.customerName || 'Customer',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: Number(paymentAmount),
        paymentMode,
        referenceNumber: paymentRef,
        notes: 'Payment settled via Invoice List',
        createdBy: currentUser?.uid || 'user',
        createdByName: currentUser?.name || 'Staff',
      });
      showToast(`Payment of ${formatCurrency(paymentAmount)} recorded!`);
      setActivePaymentInvoice(null);
    } catch (err: any) {
      showToast('Failed to record payment: ' + err.message, 'error');
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelTargetInvoice) return;
    try {
      await updateInvoiceStatus(cancelTargetInvoice.id, 'Cancelled');
      showToast(`Invoice ${cancelTargetInvoice.invoiceNumber} cancelled.`);
      setCancelTargetInvoice(null);
    } catch (err: any) {
      showToast('Failed to cancel: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Invoices &amp; Billing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage tax invoices, monitor payments, and print compliant receipts
          </p>
        </div>

        <button
          onClick={() => onNavigate('/invoices/create')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search inv #, customer, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Drafts Only</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          {/* Customer Filter */}
          <div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
            >
              <option value="All">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker when Custom is chosen */}
        {dateFilter === 'Custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        )}

        {/* User filter for Admin */}
        {role === 'admin' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Created By:</span>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
            >
              <option value="All">All Staff / Admins</option>
              {users.map((u) => (
                <option key={u.id} value={u.uid}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Invoice No</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3 text-right">Grand Total</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    No invoices match your selected criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <button
                        onClick={() => onNavigate(`/invoice/${inv.id}`)}
                        className="hover:text-amber-600 transition-colors text-left cursor-pointer"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      {formatDate(inv.invoiceDate)}
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">
                        {inv.customerSnapshot?.customerName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {inv.customerSnapshot?.companyName || inv.placeOfSupply}
                      </p>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      {formatDate(inv.dueDate)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>

                    <td className="px-5 py-3.5 text-right text-emerald-600 font-semibold">
                      {formatCurrency(inv.amountPaid)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                      {formatCurrency(inv.balanceAmount)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <Badge
                        variant={
                          inv.invoiceStatus === 'Cancelled'
                            ? 'neutral'
                            : inv.invoiceStatus === 'Draft'
                            ? 'warning'
                            : inv.paymentStatus === 'Paid'
                            ? 'success'
                            : inv.paymentStatus === 'Partially Paid'
                            ? 'info'
                            : inv.paymentStatus === 'Overdue'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {inv.invoiceStatus === 'Cancelled'
                          ? 'Cancelled'
                          : inv.invoiceStatus === 'Draft'
                          ? 'Draft'
                          : inv.paymentStatus}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.invoiceStatus === 'Draft' && (
                          <button
                            onClick={() => onNavigate(`/invoices/edit/${inv.id}`)}
                            title="Continue Editing Draft"
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onNavigate(`/invoice/${inv.id}`)}
                          title="View Invoice"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {inv.invoiceStatus !== 'Cancelled' && inv.invoiceStatus !== 'Draft' && inv.balanceAmount > 0 && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv)}
                            title="Record Payment"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {role === 'admin' && inv.invoiceStatus !== 'Cancelled' && (
                          <button
                            onClick={() => setCancelTargetInvoice(inv)}
                            title="Cancel Invoice"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {activePaymentInvoice && (
        <Modal
          isOpen={!!activePaymentInvoice}
          onClose={() => setActivePaymentInvoice(null)}
          title={`Record Payment for ${activePaymentInvoice.invoiceNumber}`}
        >
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 flex justify-between">
              <span>Outstanding Balance Due:</span>
              <span className="font-bold">{formatCurrency(activePaymentInvoice.balanceAmount)}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount to Collect (₹) *
              </label>
              <input
                type="number"
                max={activePaymentInvoice.balanceAmount}
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Mode *
              </label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Reference / UTR
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. UTR-9821098"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActivePaymentInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTargetInvoice && (
        <Modal
          isOpen={!!cancelTargetInvoice}
          onClose={() => setCancelTargetInvoice(null)}
          title="Cancel Invoice"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to void and cancel invoice{' '}
              <strong>{cancelTargetInvoice.invoiceNumber}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setCancelTargetInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleCancelInvoice}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
