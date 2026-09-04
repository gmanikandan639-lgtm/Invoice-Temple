import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  UserCheck,
  Edit2,
  Trash2,
  Eye,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, INDIAN_STATES } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getStateCodeByName } from '../../utils/taxCalculator';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface CustomerListViewProps {
  onNavigate: (path: string) => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({ onNavigate }) => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, invoices, companySettings } =
    useData();
  const { currentUser, role } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('All');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Detail slide-over / modal
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState(companySettings.state || 'Tamil Nadu');
  const [pincode, setPincode] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (stateFilter !== 'All' && c.state !== stateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.customerName.toLowerCase().includes(q);
        const matchComp = c.companyName?.toLowerCase().includes(q);
        const matchPhone = c.mobileNumber?.includes(q);
        const matchGst = c.gstin?.toLowerCase().includes(q);
        const matchId = c.customerId.toLowerCase().includes(q);
        if (!matchName && !matchComp && !matchPhone && !matchGst && !matchId) return false;
      }
      return true;
    });
  }, [customers, searchQuery, stateFilter]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setCompany('');
    setMobile('');
    setEmail('');
    setGstin('');
    setPan('');
    setBillingAddress('');
    setShippingAddress('');
    setCity('');
    setState(companySettings.state || 'Tamil Nadu');
    setPincode('');
    setSameAsBilling(true);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.customerName);
    setCompany(c.companyName || '');
    setMobile(c.mobileNumber || '');
    setEmail(c.email || '');
    setGstin(c.gstin || '');
    setPan(c.pan || '');
    setBillingAddress(c.billingAddress);
    setShippingAddress(c.shippingAddress);
    setCity(c.city);
    setState(c.state);
    setPincode(c.pincode);
    setSameAsBilling(c.billingAddress === c.shippingAddress);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !billingAddress.trim()) {
      showToast('Name and billing address are required', 'error');
      return;
    }

    const stateCode = getStateCodeByName(state);
    const shipAddr = sameAsBilling ? billingAddress : shippingAddress;

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          customerName: name,
          companyName: company,
          mobileNumber: mobile,
          email,
          gstin,
          pan,
          billingAddress,
          shippingAddress: shipAddr,
          city,
          state,
          pincode,
          stateCode,
        });
        showToast('Customer record updated successfully');
      } else {
        const nextId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
        await addCustomer({
          customerId: nextId,
          customerName: name,
          companyName: company,
          mobileNumber: mobile,
          email,
          gstin,
          pan,
          billingAddress,
          shippingAddress: shipAddr,
          city,
          state,
          pincode,
          stateCode,
          createdBy: currentUser?.uid || 'user',
        });
        showToast('New customer created successfully');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Error saving customer: ' + err.message, 'error');
    }
  };

  const handleDelete = async (customer: Customer) => {
    const hasInvoices = invoices.some((i) => i.customerId === customer.id);
    if (hasInvoices) {
      showToast('Cannot delete customer with linked billing invoices', 'error');
      return;
    }
    if (confirm(`Are you sure you want to remove customer ${customer.customerName}?`)) {
      try {
        await deleteCustomer(customer.id);
        showToast('Customer removed');
      } catch (err: any) {
        showToast('Failed to delete: ' + err.message, 'error');
      }
    }
  };

  // Metrics for customer detail modal
  const customerInvoices = useMemo(() => {
    if (!viewingCustomer) return [];
    return invoices.filter((i) => i.customerId === viewingCustomer.id);
  }, [invoices, viewingCustomer]);

  const customerStats = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    customerInvoices.forEach((inv) => {
      if (inv.invoiceStatus === 'Cancelled') return;
      totalBilled += inv.grandTotal || 0;
      totalPaid += inv.amountPaid || 0;
      totalOutstanding += inv.balanceAmount || 0;
    });

    return { totalBilled, totalPaid, totalOutstanding };
  }, [customerInvoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage client profiles, GSTIN identifiers, and billing history
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer name, company, mobile, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
        >
          <option value="All">All States</option>
          {INDIAN_STATES.map((s) => (
            <option key={s.code} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Customer ID</th>
                <th className="px-5 py-3">Client Name</th>
                <th className="px-5 py-3">Company Name</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">GSTIN / State</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    No customers found. Click "Add Customer" to register a client.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900">
                      {c.customerId}
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{c.customerName}</p>
                      <p className="text-[10px] text-slate-400">{c.city || 'City N/A'}</p>
                    </td>

                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {c.companyName || '-'}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      <p>{c.mobileNumber || '-'}</p>
                      <p className="text-[10px] text-slate-400">{c.email || ''}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-mono text-slate-800 font-semibold">
                        {c.gstin || 'Unregistered'}
                      </p>
                      <p className="text-[10px] text-slate-400">{c.state} ({c.stateCode})</p>
                    </td>

                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDate(c.createdAt)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingCustomer(c)}
                          title="Customer Statement"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {role === 'admin' && (
                          <button
                            onClick={() => handleDelete(c)}
                            title="Delete Customer"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Enterprise Name</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accounts@client.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (15 Digits)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="33AAAAA0000A1Z5"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PAN</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="AAAAA0000A"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address *</label>
            <textarea
              rows={2}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sameAddress"
              checked={sameAsBilling}
              onChange={(e) => setSameAsBilling(e.target.checked)}
              className="rounded-sm border-slate-300 text-amber-500"
            />
            <label htmlFor="sameAddress" className="text-xs text-slate-700 cursor-pointer">
              Shipping address is same as billing address
            </label>
          </div>

          {!sameAsBilling && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Address</label>
              <textarea
                rows={2}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full sm:w-1/2 px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs cursor-pointer"
            >
              {editingCustomer ? 'Update Profile' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Customer Details & Invoices Modal */}
      {viewingCustomer && (
        <Modal
          isOpen={!!viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          title={`Customer Ledger: ${viewingCustomer.customerName}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Customer Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Billed</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {formatCurrency(customerStats.totalBilled)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Collected</p>
                <p className="text-base font-bold text-emerald-700 mt-0.5">
                  {formatCurrency(customerStats.totalPaid)}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <p className="text-[10px] font-bold text-amber-800 uppercase">Outstanding</p>
                <p className="text-base font-bold text-amber-800 mt-0.5">
                  {formatCurrency(customerStats.totalOutstanding)}
                </p>
              </div>
            </div>

            {/* Invoices List for this customer */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Invoices Generated ({customerInvoices.length})
              </h4>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {customerInvoices.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No invoices on record for this customer.</p>
                ) : (
                  customerInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setViewingCustomer(null);
                        onNavigate(`/invoice/${inv.id}`);
                      }}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(inv.invoiceDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</p>
                        <p className="text-[10px] font-semibold text-slate-500">{inv.paymentStatus}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
