/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';

// Views
import { LoginView } from './components/views/LoginView';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { UserDashboardView } from './components/views/UserDashboardView';
import { InvoiceListView } from './components/views/InvoiceListView';
import { InvoiceCreateView } from './components/views/InvoiceCreateView';
import { InvoiceDetailView } from './components/views/InvoiceDetailView';
import { CustomerListView } from './components/views/CustomerListView';
import { ProductListView } from './components/views/ProductListView';
import { PaymentListView } from './components/views/PaymentListView';
import { ReportsView } from './components/views/ReportsView';
import { AdminUserListView } from './components/views/AdminUserListView';
import { SettingsView } from './components/views/SettingsView';
import { NotificationsView } from './components/views/NotificationsView';
import { ActivityLogsView } from './components/views/ActivityLogsView';
import { ProfileView } from './components/views/ProfileView';

const RouterContent: React.FC = () => {
  const { currentUser, role } = useAuth();

  // Initialize path from hash or default to /dashboard
  const getInitialPath = () => {
    const hash = window.location.hash.replace('#', '');
    return hash && hash.startsWith('/') ? hash : '/dashboard';
  };

  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);

  // Sync state with browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash.startsWith('/')) {
        setCurrentPath(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
    window.scrollTo(0, 0);
  }, []);

  // If user is not authenticated, show Login
  if (!currentUser) {
    return <LoginView onNavigate={navigate} />;
  }

  // Handle Dynamic Route: Invoice Detail (/invoice/:id)
  if (currentPath.startsWith('/invoice/')) {
    const invoiceId = currentPath.replace('/invoice/', '');
    return (
      <AppLayout currentPath={currentPath} onNavigate={navigate}>
        <InvoiceDetailView invoiceId={invoiceId} onNavigate={navigate} />
      </AppLayout>
    );
  }

  // View Resolver based on Route
  const renderView = () => {
    switch (currentPath) {
      case '/dashboard':
      case '/':
      case '/admin':
      case '/user':
        return role === 'admin' ? (
          <AdminDashboardView onNavigate={navigate} />
        ) : (
          <UserDashboardView onNavigate={navigate} />
        );

      case '/invoices':
        return <InvoiceListView onNavigate={navigate} />;

      case '/invoices/create':
        return <InvoiceCreateView onNavigate={navigate} />;

      case '/customers':
        return <CustomerListView onNavigate={navigate} />;

      case '/products':
        return <ProductListView onNavigate={navigate} />;

      case '/payments':
        return <PaymentListView onNavigate={navigate} />;

      case '/notifications':
        return <NotificationsView onNavigate={navigate} />;

      case '/profile':
        return <ProfileView />;

      case '/admin/reports':
        return role === 'admin' ? (
          <ReportsView />
        ) : (
          <UserDashboardView onNavigate={navigate} />
        );

      case '/admin/users':
        return role === 'admin' ? (
          <AdminUserListView onNavigate={navigate} />
        ) : (
          <UserDashboardView onNavigate={navigate} />
        );

      case '/admin/activity':
        return role === 'admin' ? (
          <ActivityLogsView />
        ) : (
          <UserDashboardView onNavigate={navigate} />
        );

      case '/admin/settings/company':
        return role === 'admin' ? (
          <SettingsView initialTab="company" />
        ) : (
          <UserDashboardView onNavigate={navigate} />
        );

      case '/admin/settings/invoice':
        return role === 'admin' ? (
          <SettingsView initialTab="invoice" />
        ) : (
          <UserDashboardView onNavigate={navigate} />
        );

      case '/settings':
        return <SettingsView />;

      default:
        return role === 'admin' ? (
          <AdminDashboardView onNavigate={navigate} />
        ) : (
          <UserDashboardView onNavigate={navigate} />
        );
    }
  };

  return (
    <AppLayout currentPath={currentPath} onNavigate={navigate}>
      {renderView()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <RouterContent />
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
