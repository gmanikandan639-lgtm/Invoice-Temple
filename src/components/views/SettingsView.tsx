import React, { useState, useRef } from 'react';
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
  Image as ImageIcon,
  Trash2,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { CompanySettings, InvoiceSettings, INDIAN_STATES } from '../../types';
import { getStateCodeByName } from '../../utils/taxCalculator';
import { getNextInvoiceNumberString } from '../../utils/invoiceNumbering';
import { useToast } from '../common/Toast';

interface SettingsViewProps {
  initialTab?: 'company' | 'invoice' | 'bank' | 'layout';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'company' }) => {
  const { companySettings, updateCompanySettings, invoiceSettings, updateInvoiceSettings, getInvoiceCountForUser } = useData();
  const { role } = useAuth();
  const { showToast } = useToast();

  const existingCount = getInvoiceCountForUser();
  const [activeTab, setActiveTab] = useState<'company' | 'invoice' | 'bank' | 'layout'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Local state initialized with current settings
  const [formData, setFormData] = useState<CompanySettings>({ ...companySettings });
  const [invSettingsData, setInvSettingsData] = useState<InvoiceSettings>({
    showHsnSac: invoiceSettings?.showHsnSac !== false,
    showUnit: invoiceSettings?.showUnit !== false,
    showDiscount: invoiceSettings?.showDiscount !== false,
    showShipping: invoiceSettings?.showShipping !== false,
    showGst: invoiceSettings?.showGst !== false,
    showTax: invoiceSettings?.showTax !== false,
    showRoundOff: invoiceSettings?.showRoundOff !== false,
    showPaid: invoiceSettings?.showPaid !== false,
    showBalanceDue: invoiceSettings?.showBalanceDue !== false,
    showLogo: invoiceSettings?.showLogo !== false,
    defaultNotes: invoiceSettings?.defaultNotes || '',
    defaultTerms: invoiceSettings?.defaultTerms || '',
    autoRoundOff: invoiceSettings?.autoRoundOff ?? true,
    prefix: invoiceSettings?.prefix || '',
    nextNumber: invoiceSettings?.nextNumber || 1,
    startingInvoiceNumber: invoiceSettings?.startingInvoiceNumber || '',
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (invoiceSettings) {
      setInvSettingsData({
        showHsnSac: invoiceSettings.showHsnSac !== false,
        showUnit: invoiceSettings.showUnit !== false,
        showDiscount: invoiceSettings.showDiscount !== false,
        showShipping: invoiceSettings.showShipping !== false,
        showGst: invoiceSettings.showGst !== false,
        showTax: invoiceSettings.showTax !== false,
        showRoundOff: invoiceSettings.showRoundOff !== false,
        showPaid: invoiceSettings.showPaid !== false,
        showBalanceDue: invoiceSettings.showBalanceDue !== false,
        showLogo: invoiceSettings.showLogo !== false,
        defaultNotes: invoiceSettings.defaultNotes || '',
        defaultTerms: invoiceSettings.defaultTerms || '',
        autoRoundOff: invoiceSettings.autoRoundOff ?? true,
        prefix: invoiceSettings.prefix || '',
        nextNumber: invoiceSettings.nextNumber || 1,
        startingInvoiceNumber: invoiceSettings.startingInvoiceNumber || '',
      });
    }
  }, [invoiceSettings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file format: PNG, JPG, JPEG, WEBP (case-insensitive extension and MIME validation)
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const fileName = (file.name || '').trim().toLowerCase();
    const mimeType = (file.type || '').trim().toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileName.endsWith(ext));
    const hasValidMime = validMimes.includes(mimeType);

    if (!hasValidMime && !hasValidExt) {
      showToast('Supported formats: PNG, JPG, JPEG, WEBP', 'error');
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size must be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({
          ...prev,
          logoUrl: dataUrl,
        }));
        try {
          await updateCompanySettings({ ...companySettings, ...formData, logoUrl: dataUrl });
          showToast('Company logo updated and saved to your company profile!');
        } catch {
          showToast('Company logo preview updated! Click "Save Changes" to finalize.');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = async () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
    }));
    try {
      await updateCompanySettings({ ...companySettings, ...formData, logoUrl: '' });
      showToast('Company logo removed from your company profile.');
    } catch {
      showToast('Company logo removed.');
    }
  };

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
      await updateInvoiceSettings(invSettingsData);
      showToast('Settings saved successfully');
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
          <div className="space-y-6">
            {/* Company Logo Configuration Area */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                    Company Logo (Invoice Header Top-Right)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload your official company logo. It replaces the old top-right TAX INVOICE details block and appears in Invoice Preview, PDF, Image Export, and Print.
                  </p>
                </div>
                {formData.logoUrl && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Logo Active
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
                {/* Logo Preview Box (Maintains aspect ratio, never distorted) */}
                <div className="w-48 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center p-2 relative overflow-hidden group shadow-2xs shrink-0">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Company Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400 p-2">
                      <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                      <span className="text-[10px] font-semibold block">No Logo Uploaded</span>
                    </div>
                  )}
                </div>

                {/* Upload & Action Controls */}
                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-98"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {formData.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                    </button>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-rose-200 active:scale-98"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Supported formats: <strong>PNG, JPG, JPEG, WEBP</strong> (Max 2MB).
                    <br />
                    Aspect ratio is preserved. If removed, the invoice header displays cleanly without broken images.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pt-2 border-t border-slate-100">
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
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  maxLength={15}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  First 2 digits automatically map the base State &amp; State Code.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => handleTextChange('pan', e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Billing Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleTextChange('phone', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Support / Invoicing Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleTextChange('email', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Office Address
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => handleTextChange('address', e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleTextChange('city', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                <select
                  value={formData.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  <option value="">-- Select State (Optional) --</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleTextChange('pincode', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= INVOICE TAB ================= */}
        {activeTab === 'invoice' && (
          <div className="space-y-5">
            {/* User-Wise Invoice Numbering Card */}
            <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/40 p-5 rounded-2xl border border-amber-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-amber-600" />
                    Invoice Number Settings (User-Specific Sequence)
                  </h4>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Configure your personalized invoice starting number. Every user maintains their own independent sequence.
                  </p>
                </div>
                {existingCount > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto shrink-0">
                    {existingCount} Existing Invoice{existingCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Starting Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={invSettingsData.startingInvoiceNumber || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInvSettingsData((prev) => ({ ...prev, startingInvoiceNumber: val }));
                    }}
                    placeholder="e.g. 1001, INV-001, or INV-2026-001"
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-1.5 block">
                    Enter a plain starting number (e.g. <code className="font-bold text-amber-800">1001</code>) or a custom prefix pattern (e.g. <code className="font-bold text-amber-800">INV-001</code> or <code className="font-bold text-amber-800">INV-2026-001</code>). The system will continuously increment from here.
                  </span>
                </div>

                <div className="p-3.5 bg-white/90 rounded-xl border border-amber-200 flex flex-col justify-center text-xs shadow-2xs">
                  <div className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <span>Live Sequence Preview</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-xs text-slate-800">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                      1st: {invSettingsData.startingInvoiceNumber || 'INV-2026-00001'}
                    </span>
                    <span className="text-slate-400 font-normal">&rarr;</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      2nd: {getNextInvoiceNumberString(invSettingsData.startingInvoiceNumber || 'INV-2026-00001', 1)}
                    </span>
                    <span className="text-slate-400 font-normal">&rarr;</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      3rd: {getNextInvoiceNumberString(invSettingsData.startingInvoiceNumber || 'INV-2026-00001', 2)}
                    </span>
                  </div>
                </div>
              </div>

              {existingCount > 0 && invSettingsData.startingInvoiceNumber && invSettingsData.startingInvoiceNumber !== (invoiceSettings?.startingInvoiceNumber || '') && (
                <div className="mt-3.5 p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-xs text-amber-950 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Notice:</strong> Changing the starting invoice number will only apply to future invoices. Your {existingCount} existing invoice numbers will never be modified.
                  </span>
                </div>
              )}
            </div>

            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pt-1">
              General Invoice Terms &amp; Defaults
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Prefix Series (Optional Fallback)
                </label>
                <input
                  type="text"
                  value={formData.invoicePrefix || ''}
                  onChange={(e) => handleTextChange('invoicePrefix', e.target.value.toUpperCase())}
                  placeholder="e.g. INV"
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
                onChange={(e) => {
                  handleTextChange('enableRoundOff', e.target.checked);
                  setInvSettingsData((prev) => ({ ...prev, autoRoundOff: e.target.checked }));
                }}
                className="rounded-sm border-slate-300 text-amber-500"
              />
              <label htmlFor="roundOffCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                Enable Automatic Round-Off (Rounds final rupee total to nearest integer)
              </label>
            </div>

            {/* Field Visibility & Calculation Settings */}
            <div className="pt-5 mt-4 border-t border-slate-200 space-y-3">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Invoice Columns &amp; Field Visibility Controls
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toggle invoice columns on or off. Hidden columns will not appear in the invoice editor or printed invoices, and their calculations adjust automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* HSN/SAC */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">HSN / SAC Code</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Show HSN/SAC tax classification column
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showHsnSac}
                      onChange={(e) => setInvSettingsData((prev) => ({ ...prev, showHsnSac: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Unit */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">Unit of Measurement</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Show unit selector (NOS, KGS, PCS, etc.)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showUnit}
                      onChange={(e) => setInvSettingsData((prev) => ({ ...prev, showUnit: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Discount */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">Discount Column &amp; Calculation</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enable line-item and overall invoice discounts
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showDiscount}
                      onChange={(e) => setInvSettingsData((prev) => ({ ...prev, showDiscount: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Shipping */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">Shipping Charges</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enable shipping charge field &amp; calculation
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showShipping}
                      onChange={(e) => setInvSettingsData((prev) => ({ ...prev, showShipping: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* GST / Tax */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">GST / Tax Calculation</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Calculate and show taxes in invoice financial summary
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showGst && invSettingsData.showTax !== false}
                      onChange={(e) =>
                        setInvSettingsData((prev) => ({
                          ...prev,
                          showGst: e.target.checked,
                          showTax: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Round Off */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">Round Off Adjustment</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Display round off amount in invoice financial summary
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showRoundOff !== false}
                      onChange={(e) => setInvSettingsData((prev) => ({ ...prev, showRoundOff: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Paid Amount */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">Paid Amount</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Display received amount in invoice financial summary
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showPaid !== false}
                      onChange={(e) => setInvSettingsData((prev) => ({ ...prev, showPaid: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Balance Due */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">Balance Due</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Display remaining balance due in invoice financial summary
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showBalanceDue !== false}
                      onChange={(e) => setInvSettingsData((prev) => ({ ...prev, showBalanceDue: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Company Logo Display Toggle */}
                <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-900">Company Logo on Invoices</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Display uploaded company logo in top-right invoice header
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={invSettingsData.showLogo !== false}
                      onChange={(e) => setInvSettingsData((prev) => ({ ...prev, showLogo: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
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
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleTextChange('bankName', e.target.value)}
                  placeholder="e.g. HDFC Bank Ltd (Optional)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Holder / Beneficiary Name
                </label>
                <input
                  type="text"
                  value={formData.accountHolderName}
                  onChange={(e) => handleTextChange('accountHolderName', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleTextChange('accountNumber', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  IFSC Code (11 Digits)
                </label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={(e) => handleTextChange('ifscCode', e.target.value.toUpperCase())}
                  placeholder="Optional"
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
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UPI VPA Identifier (for Instant QR Generation)
                </label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => handleTextChange('upiId', e.target.value)}
                  placeholder="e.g. invoicetemple@okhdfcbank (Optional)"
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
