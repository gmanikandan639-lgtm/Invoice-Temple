import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Database, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

interface LoginViewProps {
  onLoginSuccess: (path: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, quickLoginAs, resetPassword, isFirebaseMode } = useAuth();

  const [email, setEmail] = useState('gmanikandan639@gmail.com');
  const [password, setPassword] = useState('Admin@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<{ success?: boolean; message?: string }>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      const isAdm = email.toLowerCase().includes('admin') || email.toLowerCase() === 'gmanikandan639@gmail.com';
      onLoginSuccess(isAdm ? '/admin' : '/user');
    } else {
      setErrorMessage(res.error || 'Invalid credentials or account disabled.');
    }
  };

  const handleQuickDemoLogin = (role: 'admin' | 'user') => {
    quickLoginAs(role);
    onLoginSuccess(role === 'admin' ? '/admin' : '/user');
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    const res = await resetPassword(forgotEmail);
    setForgotStatus(res);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo and Brand Title */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 border border-amber-300">
            IT
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          INVOICE TEMPLE
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-amber-400/90 font-medium">
          Smart Billing &amp; Invoice Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-800/90 border border-slate-700/80 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@invoicetemple.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-sm border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span>Remember session</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotModalOpen(true);
                  setForgotStatus({});
                }}
                className="text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login shortcuts */}
          <div className="mt-6 pt-6 border-t border-slate-700/80">
            <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider text-center mb-3">
              One-Click Instant Role Evaluation
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="quick-login-admin"
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-amber-400 border border-slate-600/80 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Login as Admin
              </button>
              <button
                id="quick-login-user"
                type="button"
                onClick={() => handleQuickDemoLogin('user')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 border border-slate-600/80 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                Login as User
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-2">
              Auto-configures session with role-based dashboard redirection.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Account Password"
      >
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Enter your registered email address and we'll send you instructions to securely reset your password.
          </p>

          {forgotStatus.message && (
            <div
              className={`p-3 rounded-xl text-xs ${
                forgotStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {forgotStatus.message}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Email
            </label>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              placeholder="user@invoicetemple.com"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs"
            >
              Send Reset Link
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
