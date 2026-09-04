import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

interface LoginViewProps {
  onNavigate?: (path: string) => void;
  onLoginSuccess?: (path: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate, onLoginSuccess }) => {
  const { login, signInWithGoogle, quickLoginAs, resetPassword, isFirebaseMode } = useAuth();

  const [email, setEmail] = useState('gmanikandan639@gmail.com');
  const [password, setPassword] = useState('Admin@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<{ success?: boolean; message?: string }>({});

  const handleSuccess = (path: string) => {
    if (onNavigate) onNavigate(path);
    if (onLoginSuccess) onLoginSuccess(path);
  };

  const handleGoogleSignIn = async (overrideEmail?: string) => {
    setErrorMessage('');
    setIsGoogleLoading(true);
    const res = await signInWithGoogle(overrideEmail);
    setIsGoogleLoading(false);

    if (res.success) {
      const activeEmail = (overrideEmail || 'gmanikandan639@gmail.com').toLowerCase();
      const isAdm = activeEmail.includes('admin') || activeEmail === 'gmanikandan639@gmail.com';
      handleSuccess(isAdm ? '/admin' : '/user');
    } else {
      setErrorMessage(res.error || 'Google authentication failed.');
    }
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) {
      setErrorMessage('Please enter your Google Mail address.');
      return;
    }
    if (!customGoogleEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }
    await handleGoogleSignIn(customGoogleEmail.trim());
  };

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
      handleSuccess(isAdm ? '/admin' : '/user');
    } else {
      setErrorMessage(res.error || 'Invalid credentials or account disabled.');
    }
  };

  const handleQuickDemoLogin = (role: 'admin' | 'user') => {
    quickLoginAs(role);
    handleSuccess(role === 'admin' ? '/admin' : '/user');
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

          {/* Standard Email / Password Form */}
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
                  placeholder="name@example.com"
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
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

          {/* Social / Alternative Divider */}
          <div className="relative flex py-4 items-center">
            <div className="grow border-t border-slate-700"></div>
            <span className="shrink mx-4 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Or continue with
            </span>
            <div className="grow border-t border-slate-700"></div>
          </div>

          {/* Google Sign In Options */}
          <div className="space-y-2.5">
            <button
              id="google-signin-btn"
              type="button"
              disabled={isGoogleLoading}
              onClick={() => handleGoogleSignIn()}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-white font-medium text-xs transition-all shadow-xs active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-amber-500 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Quick Admin direct access */}
            <button
              type="button"
              onClick={() => handleGoogleSignIn('gmanikandan639@gmail.com')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="truncate font-medium text-[11px]">gmanikandan639@gmail.com</span>
              </div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Admin
              </span>
            </button>

            {/* Custom Google Email toggle */}
            {!showCustomGoogleInput ? (
              <button
                type="button"
                onClick={() => setShowCustomGoogleInput(true)}
                className="w-full text-center text-[11px] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer pt-0.5"
              >
                Sign in with another Google Mail
              </button>
            ) : (
              <form onSubmit={handleCustomGoogleSubmit} className="pt-2 space-y-2">
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="Enter Google Mail (e.g. user@gmail.com)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isGoogleLoading}
                    className="flex-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Authenticate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(false)}
                    className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Demo Login shortcuts */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-center mb-2.5">
              Quick Role Testing
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="quick-login-admin"
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-amber-400 border border-slate-600/80 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Access
              </button>
              <button
                id="quick-login-user"
                type="button"
                onClick={() => handleQuickDemoLogin('user')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600/80 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                Staff Access
              </button>
            </div>
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
