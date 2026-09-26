import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  Mail,
  Phone,
  Calendar,
  Lock,
  CheckCircle2,
  Award,
  Save,
  Camera,
  Upload,
  Building,
  Briefcase,
  FileSignature,
  Palette,
  Sparkles,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../common/Toast';
import { getUserDisplayName } from '../../types';

const PRESET_AVATARS = [
  {
    label: 'Professional Classic',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces&q=80',
  },
  {
    label: 'Modern Executive',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces&q=80',
  },
  {
    label: 'Senior Leader',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces&q=80',
  },
  {
    label: 'Finance Specialist',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=faces&q=80',
  },
  {
    label: 'Operations Lead',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces&q=80',
  },
];

export const ProfileView: React.FC = () => {
  const { currentUser, role, updateCurrentProfile, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark' | 'amber'>('light');

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showAvatarPresets, setShowAvatarPresets] = useState(false);

  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || currentUser.name || '');
      setPreferredName(currentUser.preferredName || '');
      setPhone(currentUser.phone || '');
      setCompanyName(currentUser.companyName || '');
      setDesignation(currentUser.designation || '');
      setPhotoURL(currentUser.profilePhoto || currentUser.photoURL || '');
      setSignatureUrl(currentUser.signatureUrl || '');
      setThemePreference((currentUser.themePreference as any) || 'light');
    }
  }, [currentUser]);

  if (!currentUser) return null;

  // Personalised active display name for real-time preview
  const previewName = preferredName.trim() || displayName.trim() || currentUser.name || 'User';

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size must be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoURL(dataUrl);
      setShowAvatarPresets(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      showToast('Signature file size must be less than 1MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSignatureUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('Display Name cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateCurrentProfile({
        displayName: displayName.trim(),
        name: displayName.trim(), // Keep backward compatible
        preferredName: preferredName.trim(),
        phone: phone.trim(),
        companyName: companyName.trim(),
        designation: designation.trim(),
        photoURL: photoURL.trim() || undefined,
        profilePhoto: photoURL.trim() || undefined,
        signatureUrl: signatureUrl.trim() || undefined,
        themePreference,
      });

      // Exact toast requirement: "Profile updated successfully."
      showToast('Profile updated successfully.', 'success');
    } catch (err: any) {
      // Never expose technical Firebase internal details
      showToast(err.message || 'Unable to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser.email) return;
    setIsResetting(true);
    try {
      const res = await resetPassword(currentUser.email);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message || 'Failed to send reset link', 'error');
      }
    } catch (err: any) {
      showToast('Unable to send password reset email at this moment.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <User className="w-7 h-7 text-amber-500" />
          My Profile &amp; Account Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Customize your display name, preferred invoice sign-off, avatar, and digital signature.
        </p>
      </div>

      {/* Main Profile Form */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
        <form onSubmit={handleProfileSave} className="space-y-7">
          {/* Avatar & Header Preview Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-5">
              {/* Avatar display */}
              <div className="relative group">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName || currentUser.name}
                    className="w-22 h-22 rounded-2xl object-cover border-2 border-amber-400 shadow-md bg-slate-100"
                    onError={() => setPhotoURL('')}
                  />
                ) : (
                  <div className="w-22 h-22 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-2xl shadow-md">
                    {(displayName || currentUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => photoFileInputRef.current?.click()}
                  title="Upload profile photo"
                  className="absolute -bottom-2 -right-2 p-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl shadow-md border-2 border-white transition-transform hover:scale-105 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {displayName || currentUser.name || 'User'}
                  </h2>
                  {preferredName && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      &quot;{preferredName}&quot;
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      role === 'admin'
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-800 border border-slate-300'
                    }`}
                  >
                    {role === 'admin' ? 'Admin' : 'Normal User'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {currentUser.email}
                </p>
                {currentUser.createdAt && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Member since: {formatDate(currentUser.createdAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex flex-wrap sm:flex-col items-stretch gap-2 shrink-0 w-full sm:w-auto">
              <input
                ref={photoFileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoFileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
              </button>

              <button
                type="button"
                onClick={() => setShowAvatarPresets(!showAvatarPresets)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Preset Avatars
              </button>

              {photoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoURL('')}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          {/* Preset Avatars Drawer (if open) */}
          {showAvatarPresets && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select a Quick Avatar Preset
                </span>
                <button
                  type="button"
                  onClick={() => setShowAvatarPresets(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPhotoURL(preset.url);
                      setShowAvatarPresets(false);
                    }}
                    className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      photoURL === preset.url
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-12 h-12 rounded-xl object-cover shadow-xs mb-1"
                    />
                    <span className="text-[10px] font-medium text-slate-700 line-clamp-1">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profile Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Display Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="e.g. Manikandan G"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                You can choose any display name. Does NOT need to match your Firebase login email.
              </p>
            </div>

            {/* Preferred Name / Nickname */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Preferred Name / Nickname
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g. Mani"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
              <p className="text-[10px] text-amber-700 font-medium mt-1">
                Used in greetings (&quot;Welcome, {previewName}&quot;) and as invoice &quot;Prepared By&quot;.
              </p>
            </div>

            {/* Work Email Address (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Work Email Address <span className="text-slate-400 font-normal">(Read-only)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={currentUser.email}
                  readOnly
                  disabled
                  className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Linked to your Firebase authentication login credentials.
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phone / Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Optional contact number for invoice communications.
              </p>
            </div>

            {/* Company Name (optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Company Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Invoice Temple Technologies"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Designation (optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Designation / Job Title <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Billing Executive / Senior Accountant"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Role (Read-only for all normal users) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Assigned Role <span className="text-slate-400 font-normal">(Managed by Admin)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={role === 'admin' ? 'Admin' : 'Normal User'}
                  readOnly
                  disabled
                  className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Roles and access controls are administered through Admin User Management.
              </p>
            </div>

            {/* Theme Preference */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Theme / Appearance Preference
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Palette className="w-4 h-4" />
                </div>
                <select
                  value={themePreference}
                  onChange={(e) => setThemePreference(e.target.value as any)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all cursor-pointer"
                >
                  <option value="light">Light Professional (Default)</option>
                  <option value="dark">Dark Slate Workspace</option>
                  <option value="amber">Warm Amber Accent</option>
                  <option value="system">Follow System Appearance</option>
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Personal UI theme preference for your logged-in workspace.
              </p>
            </div>

            {/* Profile Photo Image URL (direct input) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Profile Photo / Avatar Image URL
              </label>
              <input
                type="text"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/avatar.jpg or paste image data URL"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                You can upload a file using the button above or paste an image link directly.
              </p>
            </div>

            {/* Signature Image Section (optional) */}
            <div className="sm:col-span-2 p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSignature className="w-4 h-4 text-amber-500" />
                    Personal Signature Image <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload your digital signature to appear in the &quot;Prepared By / Authorized Signatory&quot; footer of invoices you create.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={sigFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => sigFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Signature File
                  </button>
                  {signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={signatureUrl}
                    onChange={(e) => setSignatureUrl(e.target.value)}
                    placeholder="https://example.com/signature.png or uploaded image"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                {/* Signature Preview */}
                <div className="h-16 bg-white border border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 overflow-hidden">
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Signature Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={() => setSignatureUrl('')}
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No signature uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              LIVE INVOICE PERSONALISATION PREVIEW CARD
              ========================================================================= */}
          <div className="p-5 bg-gradient-to-br from-amber-50/70 via-slate-50 to-white rounded-2xl border border-amber-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                Live Personalisation Preview
              </h3>
              <span className="text-[10px] text-slate-400 font-medium ml-auto">
                Real-time synchronization
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Dashboard Welcome */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dashboard Greeting
                </span>
                <p className="text-sm font-extrabold text-slate-900">
                  Welcome, <span className="text-amber-600">{previewName}</span>
                </p>
                <p className="text-[10px] text-slate-500">Displayed on your dashboard header</p>
              </div>

              {/* Created By & Prepared By */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Invoice Attribution
                </span>
                <p className="text-xs font-bold text-slate-800">
                  Created By: <span className="text-amber-600">{previewName}</span>
                </p>
                <p className="text-xs font-bold text-slate-800">
                  Prepared By: <span className="text-amber-600">{previewName}</span>
                </p>
              </div>

              {/* Invoice Footer Mock */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Invoice Footer Sign-off
                </span>
                <div className="border-t border-slate-300 pt-1 mt-1">
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Sig"
                      className="h-6 object-contain mb-0.5"
                    />
                  ) : (
                    <span className="text-[10px] italic text-slate-400">Digital Signatory</span>
                  )}
                  <p className="text-[11px] font-bold text-slate-900">{previewName}</p>
                  <p className="text-[9px] text-slate-500 uppercase">{designation || 'Prepared By'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Submit Footer */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Permissions and Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Privileges Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">Role Privileges &amp; Access</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Create &amp; Issue Invoices</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Manage Customers &amp; Catalog</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Record Payments &amp; Receipts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Financial Reports &amp; Analytics</span>
              {role === 'admin' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="text-[11px] font-semibold text-slate-400">Admin Only</span>
              )}
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Admin User Management</span>
              {role === 'admin' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="text-[11px] font-semibold text-slate-400">Admin Only</span>
              )}
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Company &amp; Invoice Billing Settings</span>
              {role === 'admin' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="text-[11px] font-semibold text-slate-400">Admin Only</span>
              )}
            </div>
          </div>
        </div>

        {/* Password & Security Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">Security &amp; Password</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Need to change or reset your account password? An authentication email with secure instructions will be sent to your registered work address.
          </p>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <p className="font-bold">Work Email Account:</p>
            <p className="font-mono text-[11px] mt-0.5">{currentUser.email}</p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isResetting}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isResetting ? 'Sending Reset Instructions...' : 'Send Password Reset Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
