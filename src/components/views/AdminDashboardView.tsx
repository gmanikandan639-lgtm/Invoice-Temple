import React, { useMemo } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Building,
  TrendingUp,
  PlusCircle,
  ArrowUpRight,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface AdminDashboardViewProps {
  onNavigate: (path: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const {
    invoices,
    customers,
    users,
    payments,
    clearAllDemoData,
    resetDemoData,
    isFirebaseConnected,
  } = useData();

  // Statistics calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // e.g. 2026-09

    let totalInvoices = invoices.length;
    let todayInvoices = 0;
    let thisMonthInvoices = 0;
    let totalSales = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    invoices.forEach((inv) => {
      if (inv.invoiceStatus === 'Cancelled') return;

      if (inv.invoiceDate === todayStr) {
        todayInvoices += 1;
      }
      if (inv.invoiceDate && inv.invoiceDate.startsWith(currentMonthPrefix)) {
        thisMonthInvoices += 1;
      }

      totalSales += inv.grandTotal || 0;
      paidAmount += inv.amountPaid || 0;
      pendingAmount += inv.balanceAmount || 0;

      if (inv.paymentStatus === 'Overdue') {
        overdueAmount += inv.balanceAmount || 0;
      }
    });

    return {
      totalInvoices,
      todayInvoices,
      thisMonthInvoices,
      totalSales,
      paidAmount,
      pendingAmount,
      overdueAmount,
      totalCustomers: customers.length,
      totalUsers: users.length,
    };
  }, [invoices, customers, users]);

  // Chart 1: Monthly Sales data
  const monthlySalesData = useMemo(() => {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const dataMap: Record<string, { month: string; sales: number; count: number; paid: number }> = {};
    months.forEach((m) => {
      dataMap[m] = { month: m, sales: 0, count: 0, paid: 0 };
    });

    invoices.forEach((inv) => {
      if (inv.invoiceStatus === 'Cancelled' || !inv.invoiceDate) return;
      const d = new Date(inv.invoiceDate);
      const mName = d.toLocaleString('en-US', { month: 'short' });
      if (dataMap[mName]) {
        dataMap[mName].sales += inv.grandTotal || 0;
        dataMap[mName].paid += inv.amountPaid || 0;
        dataMap[mName].count += 1;
      }
    });

    return months.map((m) => dataMap[m]);
  }, [invoices]);

  // Chart 2: Invoice Status distribution
  const statusDistributionData = useMemo(() => {
    const counts: Record<string, number> = {
      Paid: 0,
      'Partially Paid': 0,
      Unpaid: 0,
      Overdue: 0,
      Cancelled: 0,
    };
    invoices.forEach((inv) => {
      if (inv.invoiceStatus === 'Cancelled') {
        counts['Cancelled'] = (counts['Cancelled'] || 0) + 1;
      } else {
        const key = inv.paymentStatus || 'Unpaid';
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    const colors: Record<string, string> = {
      Paid: '#10b981',
      'Partially Paid': '#3b82f6',
      Unpaid: '#f59e0b',
      Overdue: '#ef4444',
      Cancelled: '#94a3b8',
    };

    return Object.keys(counts).map((name) => ({
      name,
      value: counts[name],
      color: colors[name] || '#64748b',
    }));
  }, [invoices]);

  // Chart 3: Paid vs Pending comparison
  const paidVsPendingData = useMemo(() => {
    return [
      { category: 'Collected', amount: stats.paidAmount, fill: '#10b981' },
      { category: 'Outstanding', amount: stats.pendingAmount, fill: '#f59e0b' },
      { category: 'Overdue', amount: stats.overdueAmount, fill: '#ef4444' },
    ];
  }, [stats]);

  // Chart 4: User-wise Billing
  const userWiseData = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv) => {
      if (inv.invoiceStatus === 'Cancelled') return;
      const userName = inv.createdByName || 'Other';
      const shortName = userName.split(' ')[0];
      map[shortName] = (map[shortName] || 0) + (inv.grandTotal || 0);
    });

    return Object.keys(map).map((k) => ({
      user: k,
      total: map[k],
    }));
  }, [invoices]);

  // Recent invoices table (last 5)
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions & Seed controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Financial &amp; Operations Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time billing metrics, collection velocity, and ledger analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('/invoices/create')}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            New Invoice
          </button>

          <button
            onClick={resetDemoData}
            title="Reset to initial sample records"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Demo Data
          </button>

          <button
            onClick={clearAllDemoData}
            title="Remove all records for clean production start"
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Demo Data
          </button>
        </div>
      </div>

      {/* 9 Metrics Grid as required by section 6 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Invoices</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalInvoices}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">All-time generated</span>
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

        {/* This Month's Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">This Month's Invoices</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.thisMonthInvoices}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Current billing period</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sales</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.totalSales)}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 inline-block">Gross billings</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Paid Amount */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Paid Amount</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(stats.paidAmount)}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
              {stats.totalSales > 0 ? `${((stats.paidAmount / stats.totalSales) * 100).toFixed(1)}% recovery` : '0%'}
            </span>
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
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Awaiting settlement</span>
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
            <span className="text-[11px] text-rose-600 font-semibold mt-0.5 inline-block">Past credit terms</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalCustomers}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Enterprise client accounts</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Building className="w-5 h-5" />
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalUsers}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 inline-block">Staff &amp; administrators</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 5 Charts Section as required by section 6 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Monthly Sales Trend</h3>
              <p className="text-xs text-slate-400">Total revenue billed per month (FY 2026-27)</p>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
              Sales (₹)
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val > 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Sales']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Invoice Status Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">2. Invoice Status Distribution</h3>
              <p className="text-xs text-slate-400">Payment &amp; lifecycle distribution</p>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {stats.totalInvoices === 0 ? (
              <p className="text-xs text-slate-400">No invoice records to chart</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} invoices`, 'Count']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Paid vs Pending comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">3. Paid vs. Pending Liquidity</h3>
              <p className="text-xs text-slate-400">Collected capital vs outstanding exposure</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paidVsPendingData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val > 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {paidVsPendingData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: User-wise Billing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">4. User-wise Billing Performance</h3>
              <p className="text-xs text-slate-400">Total invoice volume created per team member</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {userWiseData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No user data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userWiseData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="user" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val > 1000 ? `${val / 1000}k` : val}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Billed Amount']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 5: Monthly Invoice Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">5. Monthly Invoice Generation Count</h3>
              <p className="text-xs text-slate-400">Number of invoices processed per calendar month</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} invoices`, 'Volume']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Invoices</h3>
            <p className="text-xs text-slate-400">Latest billing records in the system</p>
          </div>
          <button
            onClick={() => onNavigate('/invoices')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
          >
            View All Invoices
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
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No invoices recorded yet. Click "New Invoice" to create one.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{inv.customerSnapshot?.customerName}</p>
                      <p className="text-[10px] text-slate-400">{inv.placeOfSupply}</p>
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
