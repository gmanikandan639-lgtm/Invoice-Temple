import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CompanySettings,
  InvoiceSettings,
  Customer,
  Product,
  Invoice,
  InvoiceStatus,
  Payment,
  UserProfile,
  AppNotification,
  Announcement,
  ActivityLog,
} from '../types';
import {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_INVOICE_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_USERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY_LOGS,
} from '../data/initialData';
import { auth, db, isConfigured, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface DataContextType {
  companySettings: CompanySettings;
  updateCompanySettings: (settings: CompanySettings) => Promise<void>;
  invoiceSettings: InvoiceSettings;
  updateInvoiceSettings: (settings: InvoiceSettings) => Promise<void>;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  invoices: Invoice[];
  addInvoice: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus, reason?: string) => Promise<void>;
  cancelInvoice: (id: string, reason?: string) => Promise<void>;
  payments: Payment[];
  addPayment: (paymentData: Omit<Payment, 'id' | 'createdAt'>) => Promise<Payment>;
  users: UserProfile[];
  addUser: (user: Partial<UserProfile>) => Promise<UserProfile>;
  updateUser: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  toggleUserStatus: (uid: string) => Promise<void>;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  announcements: Announcement[];
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt'>) => Promise<void>;
  activityLogs: ActivityLog[];
  logActivity: (action: string, module: string, recordId?: string, metadata?: Record<string, any>) => void;
  getNextInvoiceNumber: () => string;
  clearAllDemoData: () => void;
  resetDemoData: () => void;
  isFirebaseConnected: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_PREFIX = 'invoice_temple_';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Helper to get cached or default data
  const loadLocal = <T,>(key: string, fallback: T): T => {
    const saved = localStorage.getItem(STORAGE_PREFIX + key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() =>
    loadLocal('company_settings', DEFAULT_COMPANY_SETTINGS)
  );
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(() =>
    loadLocal('invoice_settings', DEFAULT_INVOICE_SETTINGS)
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadLocal('customers', INITIAL_CUSTOMERS)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadLocal('products', INITIAL_PRODUCTS)
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    loadLocal('invoices', INITIAL_INVOICES)
  );
  const [payments, setPayments] = useState<Payment[]>(() =>
    loadLocal('payments', INITIAL_PAYMENTS)
  );
  const [users, setUsers] = useState<UserProfile[]>(() =>
    loadLocal('users', INITIAL_USERS)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadLocal('notifications', INITIAL_NOTIFICATIONS)
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    loadLocal('announcements', [])
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    loadLocal('activity_logs', INITIAL_ACTIVITY_LOGS)
  );

  // Sync to local storage
  const saveLocal = (key: string, data: any) => {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  };

  // Real-time Firestore Listeners when connected and authenticated
  useEffect(() => {
    if (!isConfigured || !db || !auth) return;

    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up prior listeners if user changes or signs out
      unsubs.forEach((u) => u());
      unsubs = [];

      if (!firebaseUser) {
        // When unauthenticated, do not query private Firestore collections
        return;
      }

      try {
        // Invoices
        const qInvoices = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
        const unsubInvoices = onSnapshot(
          qInvoices,
          (snapshot) => {
            const list: Invoice[] = [];
            snapshot.forEach((d) => list.push({ ...(d.data() as Invoice), id: d.id }));
            if (list.length > 0) {
              setInvoices(list);
              saveLocal('invoices', list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'invoices')
        );
        unsubs.push(unsubInvoices);

        // Customers
        const qCustomers = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
        const unsubCustomers = onSnapshot(
          qCustomers,
          (snapshot) => {
            const list: Customer[] = [];
            snapshot.forEach((d) => list.push({ ...(d.data() as Customer), id: d.id }));
            if (list.length > 0) {
              setCustomers(list);
              saveLocal('customers', list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
        );
        unsubs.push(unsubCustomers);

        // Products
        const qProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const unsubProducts = onSnapshot(
          qProducts,
          (snapshot) => {
            const list: Product[] = [];
            snapshot.forEach((d) => list.push({ ...(d.data() as Product), id: d.id }));
            if (list.length > 0) {
              setProducts(list);
              saveLocal('products', list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'products')
        );
        unsubs.push(unsubProducts);

        // Payments
        const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
        const unsubPayments = onSnapshot(
          qPayments,
          (snapshot) => {
            const list: Payment[] = [];
            snapshot.forEach((d) => list.push({ ...(d.data() as Payment), id: d.id }));
            if (list.length > 0) {
              setPayments(list);
              saveLocal('payments', list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
        );
        unsubs.push(unsubPayments);

        // Settings Company
        const unsubCompany = onSnapshot(
          doc(db, 'settings', 'company'),
          (d) => {
            if (d.exists()) {
              const data = d.data() as CompanySettings;
              setCompanySettings(data);
              saveLocal('company_settings', data);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'settings/company')
        );
        unsubs.push(unsubCompany);
      } catch (err) {
        console.warn('Real-time listener setup exception:', err);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach((u) => u());
    };
  }, []);

  const logActivity = (action: string, module: string, recordId?: string, metadata?: Record<string, any>) => {
    const newLog: ActivityLog = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      userId: currentUser?.uid || 'system',
      userName: currentUser?.name || 'System',
      action,
      module,
      recordId,
      timestamp: new Date().toISOString(),
      metadata,
    };
    setActivityLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 150);
      saveLocal('activity_logs', updated);
      return updated;
    });

    if (isConfigured && db && auth?.currentUser) {
      setDoc(doc(db, 'activityLogs', newLog.id), newLog).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `activityLogs/${newLog.id}`)
      );
    }
  };

  const getNextInvoiceNumber = (): string => {
    const prefix = invoiceSettings.invoicePrefix || 'INV';
    const fy = invoiceSettings.financialYear || '2026-27';

    // Find the highest number formatted in this FY
    let highest = invoiceSettings.startingNumber || 1;
    invoices.forEach((inv) => {
      if (inv.invoiceNumber && inv.invoiceNumber.includes(fy)) {
        const parts = inv.invoiceNumber.split('/');
        const numPart = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(numPart) && numPart >= highest) {
          highest = numPart + 1;
        }
      }
    });

    const padded = String(highest).padStart(5, '0');
    return `${prefix}/${fy}/${padded}`;
  };

  const updateCompanySettings = async (newSettings: CompanySettings) => {
    const updated = { ...newSettings, updatedAt: new Date().toISOString() };
    setCompanySettings(updated);
    saveLocal('company_settings', updated);
    logActivity('Company Settings Updated', 'Settings');

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'settings', 'company'), updated);
    }
  };

  const updateInvoiceSettings = async (newSettings: InvoiceSettings) => {
    const updated = { ...newSettings, updatedAt: new Date().toISOString() };
    setInvoiceSettings(updated);
    saveLocal('invoice_settings', updated);
    logActivity('Invoice Settings Updated', 'Settings');

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'settings', 'invoice'), updated);
    }
  };

  const addCustomer = async (custData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    const newCust: Customer = {
      ...custData,
      id: 'cust_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomers((prev) => {
      const updated = [newCust, ...prev];
      saveLocal('customers', updated);
      return updated;
    });
    logActivity('Customer Created', 'Customers', newCust.customerId, { customerName: newCust.customerName });

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'customers', newCust.id), newCust);
    }
    return newCust;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    const now = new Date().toISOString();
    setCustomers((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...data, updatedAt: now } : c));
      saveLocal('customers', updated);
      return updated;
    });
    logActivity('Customer Updated', 'Customers', id);

    if (isConfigured && db && auth?.currentUser) {
      await updateDoc(doc(db, 'customers', id), { ...data, updatedAt: now });
    }
  };

  const deleteCustomer = async (id: string) => {
    const target = customers.find((c) => c.id === id);
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveLocal('customers', updated);
      return updated;
    });
    logActivity('Customer Deleted', 'Customers', id, { name: target?.customerName });

    if (isConfigured && db && auth?.currentUser) {
      await deleteDoc(doc(db, 'customers', id));
    }
  };

  const addProduct = async (prodData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    const newProd: Product = {
      ...prodData,
      id: 'prod_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => {
      const updated = [newProd, ...prev];
      saveLocal('products', updated);
      return updated;
    });
    logActivity('Product Created', 'Products', newProd.productId, { name: newProd.name });

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'products', newProd.id), newProd);
    }
    return newProd;
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    const now = new Date().toISOString();
    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: now } : p));
      saveLocal('products', updated);
      return updated;
    });
    logActivity('Product Updated', 'Products', id);

    if (isConfigured && db && auth?.currentUser) {
      await updateDoc(doc(db, 'products', id), { ...data, updatedAt: now });
    }
  };

  const deleteProduct = async (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveLocal('products', updated);
      return updated;
    });
    logActivity('Product Deleted', 'Products', id, { name: target?.name });

    if (isConfigured && db && auth?.currentUser) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> => {
    const newInv: Invoice = {
      ...invoiceData,
      id: 'inv_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInvoices((prev) => {
      const updated = [newInv, ...prev];
      saveLocal('invoices', updated);
      return updated;
    });
    logActivity('Invoice Created', 'Invoices', newInv.invoiceNumber, {
      grandTotal: newInv.grandTotal,
      customer: newInv.customerSnapshot?.customerName,
    });

    // Notify users
    const notif: AppNotification = {
      id: 'notif_' + Date.now(),
      recipientUserId: 'all',
      title: 'New Invoice Issued',
      message: `Invoice ${newInv.invoiceNumber} for ₹${newInv.grandTotal.toLocaleString('en-IN')} issued to ${newInv.customerSnapshot?.customerName}.`,
      type: 'invoice_created',
      relatedInvoiceId: newInv.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [notif, ...prev];
      saveLocal('notifications', updated);
      return updated;
    });

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'invoices', newInv.id), newInv);
      await setDoc(doc(db, 'notifications', notif.id), notif);
    }
    return newInv;
  };

  const updateInvoice = async (id: string, data: Partial<Invoice>) => {
    const now = new Date().toISOString();
    setInvoices((prev) => {
      const updated = prev.map((inv) => (inv.id === id ? { ...inv, ...data, updatedAt: now } : inv));
      saveLocal('invoices', updated);
      return updated;
    });
    logActivity('Invoice Updated', 'Invoices', id);

    if (isConfigured && db && auth?.currentUser) {
      await updateDoc(doc(db, 'invoices', id), { ...data, updatedAt: now });
    }
  };

  const cancelInvoice = async (id: string, reason?: string) => {
    const now = new Date().toISOString();
    const inv = invoices.find((i) => i.id === id);
    const cancelData: Partial<Invoice> = {
      invoiceStatus: 'Cancelled',
      paymentStatus: 'Unpaid',
      cancelledAt: now,
      cancelledBy: currentUser?.name || 'Admin',
      notes: inv?.notes ? `${inv.notes}\n[CANCELLED: ${reason || 'Cancelled by admin'}]` : `Cancelled: ${reason || 'Cancelled by admin'}`,
      updatedAt: now,
    };

    setInvoices((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...cancelData } : item));
      saveLocal('invoices', updated);
      return updated;
    });
    logActivity('Invoice Cancelled', 'Invoices', inv?.invoiceNumber, { reason });

    if (isConfigured && db && auth?.currentUser) {
      await updateDoc(doc(db, 'invoices', id), cancelData);
    }
  };

  const updateInvoiceStatus = async (id: string, status: InvoiceStatus, reason?: string) => {
    if (status === 'Cancelled') {
      await cancelInvoice(id, reason);
    } else {
      await updateInvoice(id, { invoiceStatus: status });
    }
  };

  const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> => {
    const newPay: Payment = {
      ...paymentData,
      id: 'pay_' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    // Update payments list
    setPayments((prev) => {
      const updated = [newPay, ...prev];
      saveLocal('payments', updated);
      return updated;
    });

    // Update associated invoice balance & payment status
    const targetInv = invoices.find((i) => i.id === paymentData.invoiceId);
    if (targetInv) {
      const newPaid = Math.round(((targetInv.amountPaid || 0) + Number(paymentData.amount)) * 100) / 100;
      const newBalance = Math.max(0, Math.round(((targetInv.grandTotal || 0) - newPaid) * 100) / 100);
      const newPaymentStatus = newBalance <= 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Unpaid';
      const newInvoiceStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';

      const invoiceUpdate: Partial<Invoice> = {
        amountPaid: newPaid,
        balanceAmount: newBalance,
        paymentStatus: newPaymentStatus,
        invoiceStatus: targetInv.invoiceStatus === 'Cancelled' ? 'Cancelled' : newInvoiceStatus,
        updatedAt: new Date().toISOString(),
      };

      setInvoices((prev) => {
        const updated = prev.map((item) => (item.id === targetInv.id ? { ...item, ...invoiceUpdate } : item));
        saveLocal('invoices', updated);
        return updated;
      });

      if (isConfigured && db && auth?.currentUser) {
        await updateDoc(doc(db, 'invoices', targetInv.id), invoiceUpdate);
      }
    }

    logActivity('Payment Added', 'Payments', newPay.paymentId, {
      amount: newPay.amount,
      invoice: newPay.invoiceNumber,
      mode: newPay.paymentMode,
    });

    // Notify users
    const notif: AppNotification = {
      id: 'notif_' + Date.now(),
      recipientUserId: 'all',
      title: `Payment Received: ₹${newPay.amount.toLocaleString('en-IN')}`,
      message: `Payment received for ${newPay.invoiceNumber} (${newPay.customerName}) via ${newPay.paymentMode}.`,
      type: 'payment_received',
      relatedInvoiceId: newPay.invoiceId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [notif, ...prev];
      saveLocal('notifications', updated);
      return updated;
    });

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'payments', newPay.id), newPay);
      await setDoc(doc(db, 'notifications', notif.id), notif);
    }
    return newPay;
  };

  const addUser = async (userData: Partial<UserProfile>): Promise<UserProfile> => {
    const newUser: UserProfile = {
      uid: 'user_' + Date.now(),
      name: userData.name || 'New Staff',
      email: userData.email || '',
      phone: userData.phone || '',
      role: userData.role || 'user',
      status: userData.status || 'active',
      photoURL: userData.photoURL || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers((prev) => {
      const updated = [newUser, ...prev];
      saveLocal('users', updated);
      return updated;
    });
    logActivity('User Created', 'Users', newUser.email, { role: newUser.role });

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'users', newUser.uid), newUser);
    }
    return newUser;
  };

  const updateUser = async (uid: string, data: Partial<UserProfile>) => {
    const now = new Date().toISOString();
    setUsers((prev) => {
      const updated = prev.map((u) => (u.uid === uid ? { ...u, ...data, updatedAt: now } : u));
      saveLocal('users', updated);
      return updated;
    });
    logActivity('User Updated', 'Users', uid);

    if (isConfigured && db && auth?.currentUser) {
      await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: now });
    }
  };

  const toggleUserStatus = async (uid: string) => {
    const target = users.find((u) => u.uid === uid);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'disabled' : 'active';
    await updateUser(uid, { status: newStatus });
    logActivity(`User ${newStatus === 'active' ? 'Enabled' : 'Disabled'}`, 'Users', uid);
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      saveLocal('notifications', updated);
      return updated;
    });
    if (isConfigured && db && auth?.currentUser) {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      saveLocal('notifications', updated);
      return updated;
    });
  };

  const addAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt'>) => {
    const newAnnounce: Announcement = {
      ...announcementData,
      id: 'ann_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setAnnouncements((prev) => {
      const updated = [newAnnounce, ...prev];
      saveLocal('announcements', updated);
      return updated;
    });

    // Create notification for all users
    const notif: AppNotification = {
      id: 'notif_' + Date.now(),
      recipientUserId: 'all',
      title: `Announcement: ${newAnnounce.title}`,
      message: newAnnounce.message,
      type: 'announcement',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [notif, ...prev];
      saveLocal('notifications', updated);
      return updated;
    });

    logActivity('Admin Announcement Published', 'Announcements', newAnnounce.title);

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'announcements', newAnnounce.id), newAnnounce);
      await setDoc(doc(db, 'notifications', notif.id), notif);
    }
  };

  const clearAllDemoData = () => {
    setCustomers([]);
    setProducts([]);
    setInvoices([]);
    setPayments([]);
    setActivityLogs([]);
    saveLocal('customers', []);
    saveLocal('products', []);
    saveLocal('invoices', []);
    saveLocal('payments', []);
    saveLocal('activity_logs', []);
    logActivity('Demo Data Cleared', 'System');
  };

  const resetDemoData = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setProducts(INITIAL_PRODUCTS);
    setInvoices(INITIAL_INVOICES);
    setPayments(INITIAL_PAYMENTS);
    setUsers(INITIAL_USERS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setCompanySettings(DEFAULT_COMPANY_SETTINGS);
    setInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
    saveLocal('customers', INITIAL_CUSTOMERS);
    saveLocal('products', INITIAL_PRODUCTS);
    saveLocal('invoices', INITIAL_INVOICES);
    saveLocal('payments', INITIAL_PAYMENTS);
    saveLocal('users', INITIAL_USERS);
    saveLocal('notifications', INITIAL_NOTIFICATIONS);
    saveLocal('activity_logs', INITIAL_ACTIVITY_LOGS);
    saveLocal('company_settings', DEFAULT_COMPANY_SETTINGS);
    saveLocal('invoice_settings', DEFAULT_INVOICE_SETTINGS);
    logActivity('Demo Data Reset to Defaults', 'System');
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <DataContext.Provider
      value={{
        companySettings,
        updateCompanySettings,
        invoiceSettings,
        updateInvoiceSettings,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        invoices,
        addInvoice,
        updateInvoice,
        updateInvoiceStatus,
        cancelInvoice,
        payments,
        addPayment,
        users,
        addUser,
        updateUser,
        toggleUserStatus,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        announcements,
        addAnnouncement,
        activityLogs,
        logActivity,
        getNextInvoiceNumber,
        clearAllDemoData,
        resetDemoData,
        isFirebaseConnected: isConfigured,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
