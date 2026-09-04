import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Search,
  Plus,
  Cloud,
  CheckCircle2,
  Database,
  Shield,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNavigate,
  currentPath,
}) => {
  const { currentUser, role, quickLoginAs, logout, isFirebaseMode } = useAuth();
  const { notifications, unreadNotificationCount, markNotificationRead } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getPageTitle = () => {
    switch (currentPath) {
      case '/admin':
        return 'Admin Dashboard';
      case '/user':
        return 'Billing Dashboard';
      case '/admin/users':
        return 'User & Access Management';
      case '/invoices':
        return 'Invoices & Billing';
      case '/invoices/create':
        return 'Generate New Invoice';
      case '/customers':
        return 'Customer Directory';
      case '/products':
        return 'Products & Services Catalog';
      case '/payments':
        return 'Payment Transactions';
      case '/admin/reports':
        return 'Business & Tax Reports';
      case '/notifications':
        return 'System Notifications';
      case '/admin/activity':
        return 'Audit & Activity Logs';
      case '/admin/settings/company':
        return 'Company & Tax Settings';
      case '/admin/settings/invoice':
        return 'Invoice & Sequence Settings';
      case '/profile':
        return 'Account Profile';
      default:
        if (currentPath.startsWith('/invoice/')) return 'Invoice Details & Print';
        return 'Invoice Temple';
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left side: Hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          id="navbar-toggle-sidebar"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-none">
            {getPageTitle()}
          </h2>
          <span className="text-[11px] text-slate-400 hidden sm:inline-block">
            {companySettingsStateTitle(role)}
          </span>
        </div>
      </div>

      {/* Right side: Role Switcher, Status, Notifications, User profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Role Switcher Pill for instant testability */}
        <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => {
              quickLoginAs('admin');
              onNavigate('/admin');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              role === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => {
              quickLoginAs('user');
              onNavigate('/user');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              role === 'user'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Normal User
          </button>
        </div>

        {/* Firebase Cloud Connection Status Pill */}
        <div
          title={
            isFirebaseMode
              ? 'Firebase Firestore & Auth Connected'
              : 'Running with local reactive state. Ready for Firebase credentials.'
          }
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isFirebaseMode
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isFirebaseMode ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Firebase Connected</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5 text-amber-600" />
              <span>Sandbox Storage</span>
            </>
          )}
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div
              id="notifications-dropdown"
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Notifications</h4>
                  {unreadNotificationCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {unreadNotificationCount} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    onNavigate('/notifications');
                    setShowNotifications(false);
                  }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {recentNotifications.length === 0 ? (
                  <p className="p-4 text-xs text-center text-slate-400">No recent notifications</p>
                ) : (
                  recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.relatedInvoiceId) {
                          onNavigate(`/invoice/${notif.relatedInvoiceId}`);
                          setShowNotifications(false);
                        }
                      }}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-left ${
                        !notif.isRead ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold text-xs shadow-xs overflow-hidden">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (currentUser?.name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                {currentUser?.name || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">{role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {showUserMenu && (
            <div
              id="user-dropdown-menu"
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  Role: {role}
                </span>
              </div>

              <button
                onClick={() => {
                  onNavigate('/profile');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-400" />
                My Profile
              </button>

              {role === 'admin' && (
                <button
                  onClick={() => {
                    onNavigate('/admin/settings/company');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  Company Settings
                </button>
              )}

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

function companySettingsStateTitle(role: string): string {
  return role === 'admin'
    ? 'Complete Enterprise Administration'
    : 'Billing & Invoicing Workspace';
}
