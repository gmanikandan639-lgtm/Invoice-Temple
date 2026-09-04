import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCheck,
  Package,
  CreditCard,
  BarChart3,
  Bell,
  History,
  Building2,
  Settings,
  UserCircle,
  LogOut,
  PlusCircle,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { role, logout, currentUser } = useAuth();
  const { unreadNotificationCount, companySettings } = useData();

  const handleNav = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Customers', path: '/customers', icon: UserCheck },
    { label: 'Products / Services', path: '/products', icon: Package },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
    },
    { label: 'Activity Logs', path: '/admin/activity', icon: History },
    { label: 'Company Settings', path: '/admin/settings/company', icon: Building2 },
    { label: 'Invoice Settings', path: '/admin/settings/invoice', icon: Settings },
    { label: 'Profile', path: '/profile', icon: UserCircle },
  ];

  const userNavItems = [
    { label: 'Dashboard', path: '/user', icon: LayoutDashboard },
    { label: 'Create Invoice', path: '/invoices/create', icon: PlusCircle },
    { label: 'My Invoices', path: '/invoices', icon: FileSpreadsheet },
    { label: 'Customers', path: '/customers', icon: UserCheck },
    { label: 'Products / Services', path: '/products', icon: Package },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
    },
    { label: 'Profile', path: '/profile', icon: UserCircle },
  ];

  const navItems = role === 'admin' ? adminNavItems : userNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              IT
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide leading-tight">INVOICE TEMPLE</h1>
              <p className="text-[10px] text-amber-400 font-medium tracking-wider uppercase">Smart Billing System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Tag */}
        <div className="px-5 py-3 bg-slate-950/20 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300 truncate max-w-[130px]">
              {currentUser?.name || 'User'}
            </span>
          </div>
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
              role === 'admin'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
            }`}
          >
            {role}
          </span>
        </div>

        {/* Quick Create Invoice Action for easy access */}
        <div className="p-3">
          <button
            id="quick-create-invoice-sidebar"
            onClick={() => handleNav('/invoices/create')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create Invoice
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                id={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
          <button
            id="sidebar-logout-btn"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
