import React, { useState } from 'react';
import {
  Building,
  FileText,
  CreditCard,
  Palette,
  Save,
  CheckCircle2,
  Upload,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { CompanySettings, INDIAN_STATES } from '../../types';
import { getStateCodeByName } from '../../utils/taxCalculator';
import { useToast } from '../common/Toast';

interface SettingsViewProps {
  initialTab?: 'company' | 'invoice' | 'bank' | 'layout';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'company' }) => {
  const { companySettings, updateCompanySettings } = useData();
  const { role } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'company' | 'invoice' | 'bank' | 'layout'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Local state initialized with current settings
  const [formData, setFormData] = useState<CompanySettings>({ ...companySettings });

  const handleTextChange = (field: keyof CompanySettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGstinChange = (value: string) => {
    const val = value.toUpperCase();
    const code = val.slice(0, 2);
    const matchedState = INDIAN_STATES.find((s) => s.code === code);

    setFormData((prev) => ({
      ...prev,
      gstin: val,
      ...(matchedState ? { state: matchedState.name, stateCode: matchedState.code } : {}),
    }));
  };

  const handleStateChange = (stateName: string) => {
    const code = getStateCodeByName(stateName);
    setFormData((prev) => ({
      ...prev,
      state: stateName,
      stateCode: code,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCompanySettings(formData);
      showToast('Enterprise settings updated successfully');
    } catch (err: any) {
      showToast('Failed to save settings: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            System &amp; Company Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure enterprise tax details, automated numbering series, and bank checkout details
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'company'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Building className="w-4 h-4" />
          Company Profile
        </button>

        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'invoice'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          Invoice &amp; Prefix
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bank'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Bank &amp; UPI
        </button>

        <button
          onClick={() => setActiveTab('layout')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'layout'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Palette className="w-4 h-4" />
          Print &amp; Theme
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        {/* ================= COMPANY TAB ================= */}
        {activeTab === 'company' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Statutory Company Identity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Legal Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleTextChange('companyName', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brand / Trade Name
                </label>
                <input
                  type="text"
                  value={formData.tradeName || ''}
                  onChange={(e) => handleTextChange('tradeName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GSTIN (15 Digits) *
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  required
                  maxLength={15}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  First 2 digits automatically map the base State &amp; State Code.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PAN Number *
                </label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => handleTextChange('pan', e.target.value.toUpperCase())}
                  required
                  maxLength={10}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Billing Phone Number *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleTextChange('phone', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Support / Invoicing Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleTextChange('email', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Office Address *
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => handleTextChange('address', e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleTextChange('city', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                <select
                  value={formData.state}
                  onChange={(e) => handleStateChange(e.target.value)}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code *</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleTextChange('pincode', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= INVOICE TAB ================= */}
        {activeTab === 'invoice' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Tax Invoice Sequences &amp; Terms
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Prefix Series *
                </label>
                <input
                  type="text"
                  value={formData.invoicePrefix}
                  onChange={(e) => handleTextChange('invoicePrefix', e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. IT-2025"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Next invoice will be: <strong>{formData.invoicePrefix}-000{formData.nextInvoiceNumber}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Serial Counter *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.nextInvoiceNumber}
                  onChange={(e) => handleTextChange('nextInvoiceNumber', parseInt(e.target.value) || 1)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Payment Terms
                </label>
                <select
                  value={formData.defaultPaymentTerms || 'Due on Receipt'}
                  onChange={(e) => handleTextChange('defaultPaymentTerms', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  <option value="Due on Receipt">Due on Receipt (Immediate)</option>
                  <option value="Net 7">Net 7 Days</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Terms &amp; Conditions / Notes (Printed on all Invoices)
              </label>
              <textarea
                rows={4}
                value={formData.defaultNotes}
                onChange={(e) => handleTextChange('defaultNotes', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="roundOffCheck"
                checked={formData.enableRoundOff}
                onChange={(e) => handleTextChange('enableRoundOff', e.target.checked)}
                className="rounded-sm border-slate-300 text-amber-500"
              />
              <label htmlFor="roundOffCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                Enable Automatic Round-Off (Rounds final rupee total to nearest integer)
              </label>
            </div>
          </div>
        )}

        {/* ================= BANK TAB ================= */}
        {activeTab === 'bank' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Bank Account &amp; UPI Payment Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleTextChange('bankName', e.target.value)}
                  required
                  placeholder="e.g. HDFC Bank Ltd"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Holder / Beneficiary Name *
                </label>
                <input
                  type="text"
                  value={formData.accountHolderName}
                  onChange={(e) => handleTextChange('accountHolderName', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleTextChange('accountNumber', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  IFSC Code (11 Digits) *
                </label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={(e) => handleTextChange('ifscCode', e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => handleTextChange('branchName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UPI VPA Identifier (for Instant QR Generation) *
                </label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => handleTextChange('upiId', e.target.value)}
                  placeholder="e.g. invoicetemple@okhdfcbank"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Used to generate real-time UPI QR codes dynamically embedded on printed invoices.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= LAYOUT TAB ================= */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Print &amp; Invoice Styling Preferences
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Brand Accent Palette
              </label>
              <div className="flex gap-3">
                {[
                  { id: 'amber', label: 'Amber Gold', bg: 'bg-amber-500' },
                  { id: 'slate', label: 'Executive Slate', bg: 'bg-slate-900' },
                  { id: 'blue', label: 'Corporate Blue', bg: 'bg-blue-600' },
                  { id: 'emerald', label: 'Teal Emerald', bg: 'bg-emerald-600' },
                ].map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleTextChange('themeColor', c.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      formData.themeColor === c.id
                        ? 'border-slate-900 ring-2 ring-slate-900/10'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${c.bg}`} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showBankDetails"
                  checked={formData.showBankDetails}
                  onChange={(e) => handleTextChange('showBankDetails', e.target.checked)}
                  className="rounded-sm border-slate-300 text-amber-500"
                />
                <label htmlFor="showBankDetails" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Display NEFT / RTGS Bank Details block on printed tax invoices
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showUpiQr"
                  checked={formData.showUpiQr}
                  onChange={(e) => handleTextChange('showUpiQr', e.target.checked)}
                  className="rounded-sm border-slate-300 text-amber-500"
                />
                <label htmlFor="showUpiQr" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Generate and print dynamic scan-and-pay UPI QR code on tax invoices
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showSignatory"
                  checked={formData.showAuthorizedSignatory}
                  onChange={(e) => handleTextChange('showAuthorizedSignatory', e.target.checked)}
                  className="rounded-sm border-slate-300 text-amber-500"
                />
                <label htmlFor="showSignatory" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Display "Authorized Signatory" stamp block at the bottom of the invoice
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer save action */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Enterprise Settings
          </button>
        </div>
      </form>
    </div>
  );
};
