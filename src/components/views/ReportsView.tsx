import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  Package,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../common/Toast';

type ReportType =
  | 'sales'
  | 'tax'
  | 'customer'
  | 'product'
  | 'payment'
  | 'overdue'
  | 'user'
  | 'daily'
  | 'monthly'
  | 'state';

type PeriodFilter =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'financial_year'
  | 'custom';

export const ReportsView: React.FC = () => {
  const { invoices, customers, products, payments, users, companySettings } = useData();
  const { showToast } = useToast();

  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Date filtering logic
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (period === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
    }
    if (period === 'this_week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return { start: w.toISOString().split('T')[0], end: todayStr };
    }
    if (period === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { start: firstDay, end: todayStr };
    }
    if (period === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start: firstDayLastMonth, end: lastDayLastMonth };
    }
    if (period === 'financial_year') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11
      const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      return {
        start: `${fyStartYear}-04-01`,
        end: `${fyStartYear + 1}-03-31`,
      };
    }
    if (period === 'custom') {
      return { start: startDate || '2000-01-01', end: endDate || '2099-12-31' };
    }
    return { start: '2000-01-01', end: '2099-12-31' };
  }, [period, startDate, endDate]);

  // Invoices filtered by period
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.invoiceStatus === 'Cancelled') return false;
      return inv.invoiceDate >= dateRange.start && inv.invoiceDate <= dateRange.end;
    });
  }, [invoices, dateRange]);

  // Payments filtered by period
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      return p.paymentDate >= dateRange.start && p.paymentDate <= dateRange.end;
    });
  }, [payments, dateRange]);

  // CSV Export utility
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report downloaded as CSV');
  };

  // Report 1: Sales Report
  const salesReportData = useMemo(() => {
    return filteredInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      customer: inv.customerSnapshot?.customerName || 'N/A',
      taxable: inv.taxableAmount,
      gst: inv.cgst + inv.sgst + inv.igst,
      total: inv.grandTotal,
      paid: inv.amountPaid,
      balance: inv.balanceAmount,
      status: inv.paymentStatus,
    }));
  }, [filteredInvoices]);

  // Report 2: GST Rate-wise summary (GSTR-1 summary)
  const gstTaxSummary = useMemo(() => {
    const rates: Record<
      number,
      { rate: number; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }
    > = {
      0: { rate: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
      5: { rate: 5, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
      12: { rate: 12, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
      18: { rate: 18, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
      28: { rate: 28, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
    };

    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const r = item.gstRate;
        if (!rates[r]) {
          rates[r] = { rate: r, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
        }
        rates[r].taxable += item.taxableAmount;
        rates[r].cgst += item.cgst;
        rates[r].sgst += item.sgst;
        rates[r].igst += item.igst;
        rates[r].totalTax += item.cgst + item.sgst + item.igst;
      });
    });

    return Object.values(rates);
  }, [filteredInvoices]);

  // Report 3: Customer summary
  const customerSummary = useMemo(() => {
    const map: Record<
      string,
      { name: string; gstin: string; count: number; billed: number; paid: number; balance: number }
    > = {};

    filteredInvoices.forEach((inv) => {
      const cId = inv.customerId;
      if (!map[cId]) {
        map[cId] = {
          name: inv.customerSnapshot?.customerName || 'Customer',
          gstin: inv.customerSnapshot?.gstin || 'Unregistered',
          count: 0,
          billed: 0,
          paid: 0,
          balance: 0,
        };
      }
      map[cId].count += 1;
      map[cId].billed += inv.grandTotal;
      map[cId].paid += inv.amountPaid;
      map[cId].balance += inv.balanceAmount;
    });

    return Object.values(map);
  }, [filteredInvoices]);

  // Report 4: Product summary
  const productSummary = useMemo(() => {
    const map: Record<string, { name: string; hsn: string; qty: number; total: number }> = {};
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((it) => {
        const key = it.name.toLowerCase();
        if (!map[key]) {
          map[key] = {
            name: it.name,
            hsn: it.hsnSacCode || '-',
            qty: 0,
            total: 0,
          };
        }
        map[key].qty += it.quantity;
        map[key].total += it.total;
      });
    });
    return Object.values(map);
  }, [filteredInvoices]);

  // Report 6: Overdue Report
  const overdueReportData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices
      .filter((inv) => inv.invoiceStatus !== 'Cancelled' && inv.balanceAmount > 0 && inv.dueDate < today)
      .map((inv) => {
        const diffMs = new Date(today).getTime() - new Date(inv.dueDate).getTime();
        const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return {
          ...inv,
          daysOverdue,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [invoices]);

  // Report 7: User Performance
  const userPerformance = useMemo(() => {
    const map: Record<string, { name: string; count: number; sales: number; paid: number }> = {};
    filteredInvoices.forEach((inv) => {
      const u = inv.createdByName || 'Staff';
      if (!map[u]) {
        map[u] = { name: u, count: 0, sales: 0, paid: 0 };
      }
      map[u].count += 1;
      map[u].sales += inv.grandTotal;
      map[u].paid += inv.amountPaid;
    });
    return Object.values(map);
  }, [filteredInvoices]);

  // Report 10: State-wise summary
  const stateSummary = useMemo(() => {
    const map: Record<string, { state: string; count: number; taxable: number; total: number }> = {};
    filteredInvoices.forEach((inv) => {
      const st = inv.placeOfSupply || 'Other';
      if (!map[st]) {
        map[st] = { state: st, count: 0, taxable: 0, total: 0 };
      }
      map[st].count += 1;
      map[st].taxable += inv.taxableAmount;
      map[st].total += inv.grandTotal;
    });
    return Object.values(map);
  }, [filteredInvoices]);

  // Handle Export based on active report
  const handleExportCSV = () => {
    if (activeReport === 'sales') {
      exportToCSV(
        `sales_report_${period}`,
        ['Invoice Number', 'Date', 'Customer', 'Taxable (INR)', 'GST (INR)', 'Total (INR)', 'Paid (INR)', 'Balance (INR)', 'Status'],
        salesReportData.map((r) => [
          r.invoiceNumber,
          r.date,
          r.customer,
          r.taxable,
          r.gst,
          r.total,
          r.paid,
          r.balance,
          r.status,
        ])
      );
    } else if (activeReport === 'tax') {
      exportToCSV(
        `tax_summary_${period}`,
        ['GST Rate', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total GST Tax'],
        gstTaxSummary.map((t) => [`${t.rate}%`, t.taxable, t.cgst, t.sgst, t.igst, t.totalTax])
      );
    } else if (activeReport === 'customer') {
      exportToCSV(
        `customer_report_${period}`,
        ['Customer Name', 'GSTIN', 'Invoice Count', 'Total Billed', 'Collected', 'Outstanding'],
        customerSummary.map((c) => [c.name, c.gstin, c.count, c.billed, c.paid, c.balance])
      );
    } else {
      showToast('Exporting current view to CSV...');
    }
  };

  const reportsList = [
    { id: 'sales', label: 'Sales Report' },
    { id: 'tax', label: 'Tax Report (GSTR-1)' },
    { id: 'customer', label: 'Customer Balances' },
    { id: 'product', label: 'Product / Service Sales' },
    { id: 'payment', label: 'Payment Ledger' },
    { id: 'overdue', label: 'Overdue Aging Report' },
    { id: 'user', label: 'User Performance' },
    { id: 'state', label: 'State-wise (POS) Sales' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Financial &amp; Statutory Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-ready GST tax summaries, aging statements, and ledger analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Report Selection Pills & Period Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Report tabs */}
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100">
          {reportsList.map((rep) => (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id as ReportType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeReport === rep.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {rep.label}
            </button>
          ))}
        </div>

        {/* Period selection */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Reporting Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="financial_year">Financial Year (Apr-Mar)</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-lg text-xs"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          <div className="text-[11px] text-slate-400">
            Range: <span className="font-mono text-slate-600 font-semibold">{dateRange.start}</span> to{' '}
            <span className="font-mono text-slate-600 font-semibold">{dateRange.end}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REPORT VIEW 1: SALES REPORT
          ========================================================================= */}
      {activeReport === 'sales' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Tax Invoices Ledger ({salesReportData.length} records)
            </h3>
            <span className="text-xs font-bold text-slate-900">
              Total Volume:{' '}
              {formatCurrency(salesReportData.reduce((acc, c) => acc + c.total, 0))}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Taxable</th>
                  <th className="px-4 py-3 text-right">Total GST</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReportData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No invoices found for this date range.
                    </td>
                  </tr>
                ) : (
                  salesReportData.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{r.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.customer}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(r.taxable)}</td>
                      <td className="px-4 py-3 text-right text-sky-700">{formatCurrency(r.gst)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(r.total)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(r.paid)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(r.balance)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT VIEW 2: TAX REPORT (GSTR-1)
          ========================================================================= */}
      {activeReport === 'tax' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                GSTR-1 Rate-Wise Tax Liability Statement
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Breakdown of taxable supplies by statutory GST slabs
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">GST Rate Slab</th>
                    <th className="px-5 py-3 text-right">Taxable Value</th>
                    <th className="px-5 py-3 text-right">Central Tax (CGST)</th>
                    <th className="px-5 py-3 text-right">State Tax (SGST)</th>
                    <th className="px-5 py-3 text-right">Integrated Tax (IGST)</th>
                    <th className="px-5 py-3 text-right">Total Tax Liability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {gstTaxSummary.map((t) => (
                    <tr key={t.rate} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{t.rate}% Slab</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">{formatCurrency(t.taxable)}</td>
                      <td className="px-5 py-3.5 text-right text-sky-700">{formatCurrency(t.cgst)}</td>
                      <td className="px-5 py-3.5 text-right text-sky-700">{formatCurrency(t.sgst)}</td>
                      <td className="px-5 py-3.5 text-right text-indigo-700">{formatCurrency(t.igst)}</td>
                      <td className="px-5 py-3.5 text-right font-black text-slate-900">{formatCurrency(t.totalTax)}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50/50 font-black border-t-2 border-slate-900">
                    <td className="px-5 py-3.5 text-slate-900">Total Liabilities:</td>
                    <td className="px-5 py-3.5 text-right text-slate-900">
                      {formatCurrency(gstTaxSummary.reduce((a, b) => a + b.taxable, 0))}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sky-800">
                      {formatCurrency(gstTaxSummary.reduce((a, b) => a + b.cgst, 0))}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sky-800">
                      {formatCurrency(gstTaxSummary.reduce((a, b) => a + b.sgst, 0))}
                    </td>
                    <td className="px-5 py-3.5 text-right text-indigo-800">
                      {formatCurrency(gstTaxSummary.reduce((a, b) => a + b.igst, 0))}
                    </td>
                    <td className="px-5 py-3.5 text-right text-amber-900 text-sm">
                      {formatCurrency(gstTaxSummary.reduce((a, b) => a + b.totalTax, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT VIEW 3: CUSTOMER REPORT
          ========================================================================= */}
      {activeReport === 'customer' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Customer Ledger Summary
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">GSTIN</th>
                  <th className="px-5 py-3 text-center">Invoices</th>
                  <th className="px-5 py-3 text-right">Total Billed</th>
                  <th className="px-5 py-3 text-right">Collected</th>
                  <th className="px-5 py-3 text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerSummary.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{c.gstin}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-700">{c.count}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">{formatCurrency(c.billed)}</td>
                    <td className="px-5 py-3.5 text-right text-emerald-600">{formatCurrency(c.paid)}</td>
                    <td className="px-5 py-3.5 text-right font-black text-rose-600">{formatCurrency(c.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT VIEW 4: PRODUCT REPORT
          ========================================================================= */}
      {activeReport === 'product' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Product &amp; Service Sales Velocity
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Item / Service Name</th>
                  <th className="px-5 py-3">HSN / SAC</th>
                  <th className="px-5 py-3 text-center">Quantity Dispatched</th>
                  <th className="px-5 py-3 text-right">Gross Revenue (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productSummary.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{p.hsn}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-700">{p.qty}</td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">{formatCurrency(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT VIEW 5: PAYMENT LEDGER
          ========================================================================= */}
      {activeReport === 'payment' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Inward Settlements Ledger ({filteredPayments.length} entries)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Receipt ID</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Payment Mode</th>
                  <th className="px-5 py-3">Reference / UTR</th>
                  <th className="px-5 py-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900">{p.paymentId}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(p.paymentDate)}</td>
                    <td className="px-5 py-3.5 font-semibold text-amber-600">{p.invoiceNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{p.customerName}</td>
                    <td className="px-5 py-3.5">{p.paymentMode}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{p.referenceNumber || '-'}</td>
                    <td className="px-5 py-3.5 text-right font-black text-emerald-600">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT VIEW 6: OVERDUE REPORT
          ========================================================================= */}
      {activeReport === 'overdue' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-rose-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Overdue Aging Analysis ({overdueReportData.length} critical invoices)
            </h3>
            <span className="text-xs font-bold text-rose-800">
              Total Overdue:{' '}
              {formatCurrency(overdueReportData.reduce((acc, c) => acc + c.balanceAmount, 0))}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Invoice No</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3 text-center">Days Overdue</th>
                  <th className="px-5 py-3">Customer Contact</th>
                  <th className="px-5 py-3 text-right">Invoice Total</th>
                  <th className="px-5 py-3 text-right">Unpaid Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueReportData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-emerald-600 font-semibold">
                      Excellent! Zero overdue invoices across the books.
                    </td>
                  </tr>
                ) : (
                  overdueReportData.map((inv) => (
                    <tr key={inv.id} className="hover:bg-rose-50/30">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[11px]">
                          {inv.daysOverdue} days
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900">{inv.customerSnapshot?.customerName}</p>
                        <p className="text-[10px] text-slate-400">{inv.customerSnapshot?.mobileNumber}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-rose-600">
                        {formatCurrency(inv.balanceAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT VIEW 7: USER PERFORMANCE
          ========================================================================= */}
      {activeReport === 'user' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Staff &amp; Representative Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Team Member</th>
                  <th className="px-5 py-3 text-center">Invoices Generated</th>
                  <th className="px-5 py-3 text-right">Billed Amount</th>
                  <th className="px-5 py-3 text-right">Collected Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userPerformance.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{u.name}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-700">{u.count}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">{formatCurrency(u.sales)}</td>
                    <td className="px-5 py-3.5 text-right font-black text-emerald-600">{formatCurrency(u.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          REPORT VIEW 8: STATE-WISE (POS) SALES
          ========================================================================= */}
      {activeReport === 'state' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Place of Supply (POS) Regional Distribution
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Place of Supply (State)</th>
                  <th className="px-5 py-3 text-center">Invoices</th>
                  <th className="px-5 py-3 text-right">Taxable Turnover</th>
                  <th className="px-5 py-3 text-right">Gross Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stateSummary.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{s.state}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-700">{s.count}</td>
                    <td className="px-5 py-3.5 text-right text-slate-700">{formatCurrency(s.taxable)}</td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
