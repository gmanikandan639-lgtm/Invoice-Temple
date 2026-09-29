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
import { auth, db, isConfigured, handleFirestoreError, OperationType, sanitizeForFirestore } from '../lib/firebase';
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
  where,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface DataContextType {
  companySettings: CompanySettings;
  updateCompanySettings: (settings: CompanySettings) => Promise<void>;
  invoiceSettings: InvoiceSettings;
  updateInvoiceSettings: (settings: Partial<InvoiceSettings> | InvoiceSettings) => Promise<void>;
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
const CLEAN_SLATE_KEY = 'invoice_temple_cleared_dummy_records_v1';

// Automatically purge legacy dummy invoices, payments, and details for a clean production start
if (typeof window !== 'undefined' && !localStorage.getItem(CLEAN_SLATE_KEY)) {
  localStorage.removeItem(STORAGE_PREFIX + 'invoices');
  localStorage.removeItem(STORAGE_PREFIX + 'payments');
  localStorage.removeItem(STORAGE_PREFIX + 'customers');
  localStorage.removeItem(STORAGE_PREFIX + 'products');
  localStorage.removeItem(STORAGE_PREFIX + 'notifications');
  localStorage.removeItem(STORAGE_PREFIX + 'activity_logs');
  localStorage.setItem(CLEAN_SLATE_KEY, 'true');
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateCurrentProfile } = useAuth();

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

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const loaded = loadLocal<CompanySettings>('company_settings', DEFAULT_COMPANY_SETTINGS);
    // If the cached logoUrl is the old unsplash dummy photo, reset to empty
    if (loaded && typeof loaded.logoUrl === 'string' && loaded.logoUrl.includes('unsplash.com/photo-1572021335469')) {
      loaded.logoUrl = '';
    }
    return {
      ...DEFAULT_COMPANY_SETTINGS,
      ...loaded,
    };
  });
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(() => ({
    ...DEFAULT_INVOICE_SETTINGS,
    showLogo: true,
    ...loadLocal('invoice_settings', DEFAULT_INVOICE_SETTINGS),
  }));
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

  // Switch user-specific company settings whenever currentUser changes
  useEffect(() => {
    if (currentUser?.uid) {
      if (currentUser.companySettings) {
        setCompanySettings(currentUser.companySettings);
      } else {
        const userSaved = loadLocal<CompanySettings | null>(`company_settings_${currentUser.uid}`, null);
        if (userSaved) {
          setCompanySettings(userSaved);
        } else {
          setCompanySettings({
            ...DEFAULT_COMPANY_SETTINGS,
            companyName: currentUser.companyName || 'My Company',
            logoUrl: '',
          });
        }
      }

      // If switching user, load user-specific cached records when available
      if (currentUser.role !== 'admin') {
        const userInvoices = loadLocal<Invoice[]>(`invoices_${currentUser.uid}`, []);
        const userCustomers = loadLocal<Customer[]>(`customers_${currentUser.uid}`, []);
        const userProducts = loadLocal<Product[]>(`products_${currentUser.uid}`, []);
        const userPayments = loadLocal<Payment[]>(`payments_${currentUser.uid}`, []);
        setInvoices(userInvoices);
        setCustomers(userCustomers);
        setProducts(userProducts);
        setPayments(userPayments);
      }
    }
  }, [currentUser?.uid, currentUser?.companySettings, currentUser?.companyName, currentUser?.role]);

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

      const isAdminUser =
        currentUser?.role === 'admin' ||
        firebaseUser.email === 'gmanikandan639@gmail.com' ||
        firebaseUser.email?.includes('admin');

      try {
        // User-specific Company Profile & Settings Listener
        const unsubUserDoc = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (d) => {
            if (d.exists()) {
              const uData = d.data();
              if (uData.companySettings) {
                setCompanySettings(uData.companySettings as CompanySettings);
                saveLocal(`company_settings_${firebaseUser.uid}`, uData.companySettings);
              } else if (uData.companyName) {
                setCompanySettings((prev) => ({
                  ...prev,
                  companyName: uData.companyName,
                }));
              }
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`)
        );
        unsubs.push(unsubUserDoc);

        // Invoices: admin sees all; normal user sees only their own
        const qInvoices = isAdminUser
          ? query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))
          : query(collection(db, 'invoices'), where('createdBy', '==', firebaseUser.uid));

        const unsubInvoices = onSnapshot(
          qInvoices,
          (snapshot) => {
            const list: Invoice[] = [];
            snapshot.forEach((d) => list.push({ ...(d.data() as Invoice), id: d.id }));
            setInvoices(list);
            if (isAdminUser) {
              saveLocal('invoices', list);
            } else {
              saveLocal(`invoices_${firebaseUser.uid}`, list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'invoices')
        );
        unsubs.push(unsubInvoices);

        // Customers: admin sees all; normal user sees only their own
        const qCustomers = isAdminUser
          ? query(collection(db, 'customers'), orderBy('createdAt', 'desc'))
          : query(collection(db, 'customers'), where('createdBy', '==', firebaseUser.uid));

        const unsubCustomers = onSnapshot(
          qCustomers,
          (snapshot) => {
            const list: Customer[] = [];
            snapshot.forEach((d) => list.push({ ...(d.data() as Customer), id: d.id }));
            setCustomers(list);
            if (isAdminUser) {
              saveLocal('customers', list);
            } else {
              saveLocal(`customers_${firebaseUser.uid}`, list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
        );
        unsubs.push(unsubCustomers);

        // Products: admin sees all; normal user sees only their own
        const qProducts = isAdminUser
          ? query(collection(db, 'products'), orderBy('createdAt', 'desc'))
          : query(collection(db, 'products'), where('createdBy', '==', firebaseUser.uid));

        const unsubProducts = onSnapshot(
          qProducts,
          (snapshot) => {
            const list: Product[] = [];
            snapshot.forEach((d) => list.push({ ...(d.data() as Product), id: d.id }));
            setProducts(list);
            if (isAdminUser) {
              saveLocal('products', list);
            } else {
              saveLocal(`products_${firebaseUser.uid}`, list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'products')
        );
        unsubs.push(unsubProducts);

        // Payments: admin sees all; normal user sees only their own
        const qPayments = isAdminUser
          ? query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
          : query(collection(db, 'payments'), where('createdBy', '==', firebaseUser.uid));

        const unsubPayments = onSnapshot(
          qPayments,
          (snapshot) => {
            const list: Payment[] = [];
            snapshot.forEach((d) => list.push({ ...(d.data() as Payment), id: d.id }));
            setPayments(list);
            if (isAdminUser) {
              saveLocal('payments', list);
            } else {
              saveLocal(`payments_${firebaseUser.uid}`, list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
        );
        unsubs.push(unsubPayments);

        // Admin-only User Directory Listener
        if (isAdminUser) {
          const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
          const unsubUsers = onSnapshot(
            qUsers,
            (snapshot) => {
              const list: UserProfile[] = [];
              snapshot.forEach((d) => {
                const uData = d.data() as UserProfile;
                list.push({ ...uData, uid: d.id });
              });
              if (list.length > 0) {
                setUsers(list);
                saveLocal('users', list);
              }
            },
            (err) => handleFirestoreError(err, OperationType.LIST, 'users')
          );
          unsubs.push(unsubUsers);
        }

        // Settings Invoice (Sequence, numbering & general defaults)
        const unsubInvoice = onSnapshot(
          doc(db, 'settings', 'invoice'),
          (d) => {
            if (d.exists()) {
              const data = d.data() as InvoiceSettings;
              setInvoiceSettings((prev) => ({ ...prev, ...data }));
              saveLocal('invoice_settings', { ...DEFAULT_INVOICE_SETTINGS, ...data });
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'settings/invoice')
        );
        unsubs.push(unsubInvoice);
      } catch (err) {
        console.warn('Real-time listener setup exception:', err);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach((u) => u());
    };
  }, [currentUser?.role]);

  const logActivity = (
    action: string,
    module: string,
    recordId?: string | null,
    metadata?: Record<string, any> | null
  ) => {
    const currentUid = auth?.currentUser?.uid || currentUser?.uid || 'system';
    const currentName = currentUser?.displayName || currentUser?.name || auth?.currentUser?.displayName || 'User';

    const cleanRecordId =
      typeof recordId === 'string' && recordId.trim().length > 0 ? recordId.trim() : undefined;

    const newLog: ActivityLog = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUid,
      userName: currentName,
      action: action.trim(),
      module: module.trim(),
      timestamp: new Date().toISOString(),
    };

    if (cleanRecordId) {
      newLog.recordId = cleanRecordId;
    }

    if (metadata && typeof metadata === 'object') {
      const cleanMeta = sanitizeForFirestore(metadata);
      if (Object.keys(cleanMeta).length > 0) {
        newLog.metadata = cleanMeta;
      }
    }

    setActivityLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 150);
      saveLocal('activity_logs', updated);
      return updated;
    });

    if (isConfigured && db && auth?.currentUser) {
      // Build safe Firestore payload strictly omitting any undefined fields
      const firestorePayload: Record<string, any> = {
        id: newLog.id,
        userId: newLog.userId,
        userName: newLog.userName,
        action: newLog.action,
        module: newLog.module,
        timestamp: newLog.timestamp,
      };

      if (cleanRecordId) {
        firestorePayload.recordId = cleanRecordId;
      }

      if (newLog.metadata && Object.keys(newLog.metadata).length > 0) {
        firestorePayload.metadata = newLog.metadata;
      }

      setDoc(doc(db, 'activityLogs', newLog.id), firestorePayload).catch((err) =>
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

    const targetUid = auth?.currentUser?.uid || currentUser?.uid;

    // Save to user-specific local storage
    if (targetUid) {
      saveLocal(`company_settings_${targetUid}`, updated);
    }
    saveLocal('company_settings', updated);

    // Save activity log with authenticated user UID as recordId and company details in metadata
    logActivity('Company Settings Updated', 'Settings', targetUid || 'company_profile', {
      companyName: updated.companyName || 'My Company',
    });

    // Update the currentUser profile in AuthContext
    if (currentUser) {
      await updateCurrentProfile({
        companySettings: updated,
        companyName: updated.companyName,
      });
    }

    // Persist to user-specific Firestore document users/{uid}
    if (isConfigured && db && targetUid) {
      const userDocRef = doc(db, 'users', targetUid);
      const safePayload = sanitizeForFirestore({
        companySettings: sanitizeForFirestore(updated),
        companyName: updated.companyName || '',
        updatedAt: updated.updatedAt,
      });
      await setDoc(userDocRef, safePayload, { merge: true });
    }
  };

  const updateInvoiceSettings = async (newSettings: Partial<InvoiceSettings> | InvoiceSettings) => {
    const updated: InvoiceSettings = {
      ...invoiceSettings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    setInvoiceSettings(updated);
    saveLocal('invoice_settings', updated);

    const targetUid = auth?.currentUser?.uid || currentUser?.uid;
    logActivity('Invoice Settings Updated', 'Settings', targetUid || 'invoice_settings', {
      prefix: updated.invoicePrefix || 'INV',
    });

    if (isConfigured && db) {
      try {
        await setDoc(doc(db, 'settings', 'invoice'), sanitizeForFirestore(updated), { merge: true });
      } catch (err) {
        console.warn('Failed to update invoice settings in Firestore:', err);
      }
    }
  };

  const addCustomer = async (custData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    const creator = auth?.currentUser?.uid || currentUser?.uid || 'user';
    const newCust: Customer = {
      ...custData,
      createdBy: (custData as any).createdBy || creator,
      id: 'cust_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomers((prev) => {
      const updated = [newCust, ...prev];
      saveLocal('customers', updated);
      if (creator) saveLocal(`customers_${creator}`, updated);
      return updated;
    });
    logActivity('Customer Created', 'Customers', newCust.customerId, { customerName: newCust.customerName });

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'customers', newCust.id), sanitizeForFirestore(newCust));
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
      await updateDoc(doc(db, 'customers', id), sanitizeForFirestore({ ...data, updatedAt: now }));
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
    const creator = auth?.currentUser?.uid || currentUser?.uid || 'user';
    const newProd: Product = {
      ...prodData,
      createdBy: (prodData as any).createdBy || creator,
      id: 'prod_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => {
      const updated = [newProd, ...prev];
      saveLocal('products', updated);
      if (creator) saveLocal(`products_${creator}`, updated);
      return updated;
    });
    logActivity('Product Created', 'Products', newProd.productId, { name: newProd.name });

    if (isConfigured && db && auth?.currentUser) {
      await setDoc(doc(db, 'products', newProd.id), sanitizeForFirestore(newProd));
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
      await updateDoc(doc(db, 'products', id), sanitizeForFirestore({ ...data, updatedAt: now }));
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
    const creator = invoiceData.createdBy || auth?.currentUser?.uid || currentUser?.uid || 'user';
    const newInv: Invoice = {
      ...invoiceData,
      createdBy: creator,
      id: 'inv_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInvoices((prev) => {
      const updated = [newInv, ...prev];
      saveLocal('invoices', updated);
      if (creator) saveLocal(`invoices_${creator}`, updated);
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
      await setDoc(doc(db, 'invoices', newInv.id), sanitizeForFirestore(newInv));
      await setDoc(doc(db, 'notifications', notif.id), sanitizeForFirestore(notif));
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
      await updateDoc(doc(db, 'invoices', id), sanitizeForFirestore({ ...data, updatedAt: now }));
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
    const targetRecordId = inv?.invoiceNumber || id;
    logActivity('Invoice Cancelled', 'Invoices', targetRecordId, reason ? { reason } : undefined);

    if (isConfigured && db && auth?.currentUser) {
      await updateDoc(doc(db, 'invoices', id), sanitizeForFirestore(cancelData));
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
    const creator = (paymentData as any).createdBy || auth?.currentUser?.uid || currentUser?.uid || 'user';
    const newPay: Payment = {
      ...paymentData,
      createdBy: creator,
      id: 'pay_' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    // Update payments list
    setPayments((prev) => {
      const updated = [newPay, ...prev];
      saveLocal('payments', updated);
      if (creator) saveLocal(`payments_${creator}`, updated);
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
        await updateDoc(doc(db, 'invoices', targetInv.id), sanitizeForFirestore(invoiceUpdate));
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
      await setDoc(doc(db, 'payments', newPay.id), sanitizeForFirestore(newPay));
      await setDoc(doc(db, 'notifications', notif.id), sanitizeForFirestore(notif));
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
      await setDoc(doc(db, 'users', newUser.uid), sanitizeForFirestore(newUser));
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
      await updateDoc(doc(db, 'users', uid), sanitizeForFirestore({ ...data, updatedAt: now }));
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
    setNotifications([]);
    saveLocal('customers', []);
    saveLocal('products', []);
    saveLocal('invoices', []);
    saveLocal('payments', []);
    saveLocal('activity_logs', []);
    saveLocal('notifications', []);
    const targetUid = auth?.currentUser?.uid || currentUser?.uid;
    logActivity('All Dummy Bills and Records Cleared', 'System', targetUid || 'system_cleanup');
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
    const targetUid = auth?.currentUser?.uid || currentUser?.uid;
    logActivity('Demo Data Reset to Defaults', 'System', targetUid || 'system_reset');
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
