import React, { useMemo } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  PlusCircle,
  ArrowUpRight,
  UserCheck,
  Package,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';

interface UserDashboardViewProps {
  onNavigate: (path: string) => void;
}

export const UserDashboardView: React.FC<UserDashboardViewProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { invoices } = useData();

  // Filter invoices for this user
  const userInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.createdBy === currentUser?.uid || inv.salesperson === currentUser?.name);
  }, [invoices, currentUser]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    let myTotalInvoices = userInvoices.length;
    let todayInvoices = 0;
    let thisMonthSales = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    userInvoices.forEach((inv) => {
      if (inv.invoiceStatus === 'Cancelled') return;

      if (inv.invoiceDate === todayStr) {
        todayInvoices += 1;
      }
      if (inv.invoiceDate && inv.invoiceDate.startsWith(currentMonthPrefix)) {
        thisMonthSales += inv.grandTotal || 0;
      }

      paidAmount += inv.amountPaid || 0;
      pendingAmount += inv.balanceAmount || 0;

      if (inv.paymentStatus === 'Overdue') {
        overdueAmount += inv.balanceAmount || 0;
      }
    });

    return {
      myTotalInvoices,
      todayInvoices,
      thisMonthSales,
      paidAmount,
      pendingAmount,
      overdueAmount,
    };
  }, [userInvoices]);

  const recentUserInvoices = userInvoices.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Card & Action buttons */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
            Billing Workspace
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-0.5">
            Welcome back, {currentUser?.name || 'Billing Specialist'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Track your authorized customer accounts, draft GST invoices, and monitor collection statuses in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/invoices/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* 6 User Metric Cards as required by section 8 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* My Total Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">My Total Invoices</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.myTotalInvoices}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Assigned to your profile</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Invoices</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.todayInvoices}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Created today</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* This Month's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">This Month's Sales</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.thisMonthSales)}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 inline-block">Current billing period</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Paid Amount */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Paid Amount</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(stats.paidAmount)}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Settled payments</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Amount */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Amount</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(stats.pendingAmount)}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Awaiting payment</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue Amount</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(stats.overdueAmount)}</h3>
            <span className="text-[11px] text-rose-600 font-semibold mt-0.5 inline-block">Follow-up required</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Access Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('/customers')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 transition-colors text-left flex items-center gap-4 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Manage Customers</h4>
            <p className="text-xs text-slate-500 mt-0.5">Lookup GSTIN, addresses, &amp; notes</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('/products')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 transition-colors text-left flex items-center gap-4 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Product &amp; Services</h4>
            <p className="text-xs text-slate-500 mt-0.5">HSN codes, pricing, and GST rates</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('/payments')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 transition-colors text-left flex items-center gap-4 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Record Payments</h4>
            <p className="text-xs text-slate-500 mt-0.5">Settle balances and link receipts</p>
          </div>
        </button>
      </div>

      {/* User Recent Invoices */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">My Recent Invoices</h3>
            <p className="text-xs text-slate-400">Invoices initiated under your credentials</p>
          </div>
          <button
            onClick={() => onNavigate('/invoices')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
          >
            All Invoices
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Invoice No</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentUserInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    You haven't generated any invoices yet. Click "Create Invoice" to begin.
                  </td>
                </tr>
              ) : (
                recentUserInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{inv.customerSnapshot?.customerName}</p>
                      <p className="text-[10px] text-slate-400">{inv.customerSnapshot?.city}</p>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-600">
                      {formatCurrency(inv.balanceAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          inv.invoiceStatus === 'Cancelled'
                            ? 'neutral'
                            : inv.paymentStatus === 'Paid'
                            ? 'success'
                            : inv.paymentStatus === 'Partially Paid'
                            ? 'info'
                            : inv.paymentStatus === 'Overdue'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {inv.invoiceStatus === 'Cancelled' ? 'Cancelled' : inv.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onNavigate(`/invoice/${inv.id}`)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
