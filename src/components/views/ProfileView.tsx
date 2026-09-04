import React from 'react';
import {
  User,
  Shield,
  Mail,
  Calendar,
  Key,
  CheckCircle2,
  Lock,
  ArrowRightLeft,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { useToast } from '../common/Toast';

export const ProfileView: React.FC = () => {
  const { currentUser, role, quickLoginAs, isFirebaseMode } = useAuth();
  const { showToast } = useToast();

  const handleSimulatePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Password updated successfully (Sandbox Mode)', 'success');
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <User className="w-7 h-7 text-amber-500" />
          Account Profile & Credentials
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your account profile, role authorizations, and security settings
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold text-2xl shadow-lg shadow-amber-500/20">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">{currentUser.name}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  role === 'admin'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-800 border border-slate-300'
                }`}
              >
                {role}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>UID: {currentUser.uid}</span>
              </div>
              {currentUser.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Member since: {formatDate(currentUser.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto">
            <p className="text-[11px] text-slate-400 font-medium">Quick Role Testing</p>
            <div className="mt-1.5 flex gap-2">
              <button
                onClick={() => {
                  quickLoginAs('admin');
                  showToast('Switched to Admin Role', 'info');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  role === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => {
                  quickLoginAs('user');
                  showToast('Switched to Standard User Role', 'info');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  role === 'user'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Standard User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Permissions & Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Permissions Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">Role Privileges & Access</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Create & Send Invoices</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Manage Customers & Catalog</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Record Payments & Receipts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Access GSTR-1 & Financial Reports</span>
              {role === 'admin' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="text-[11px] font-semibold text-rose-500">Admin Only</span>
              )}
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">User & Access Management</span>
              {role === 'admin' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="text-[11px] font-semibold text-rose-500">Admin Only</span>
              )}
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">Modify Company Tax & Bank Settings</span>
              {role === 'admin' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="text-[11px] font-semibold text-rose-500">Admin Only</span>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">Security Credentials</h3>
          </div>

          <form onSubmit={handleSimulatePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                defaultValue="••••••••"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter at least 8 characters"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Confirm password"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
