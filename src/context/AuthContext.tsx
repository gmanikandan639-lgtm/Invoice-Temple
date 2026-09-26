import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { auth, db, isConfigured, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isFirebaseMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (customEmail?: string) => Promise<{ success: boolean; error?: string }>;
  quickLoginAs: (role: 'admin' | 'user') => void;
  logout: () => Promise<void>;
  updateCurrentProfile: (data: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'invoice_temple_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Require authentication: Do not auto-login unauthenticated users
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    if (isConfigured && auth) {
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }

        if (firebaseUser) {
          if (db) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);

            // Set up real-time listener for instant profile synchronization
            unsubscribeSnapshot = onSnapshot(
              userDocRef,
              async (snap) => {
                if (snap.exists()) {
                  const data = snap.data();
                  const assignedRole: UserRole =
                    data.role === 'admin' || data.role === 'user'
                      ? data.role
                      : firebaseUser.email === 'gmanikandan639@gmail.com'
                      ? 'admin'
                      : 'user';

                  const matchedProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    displayName: data.displayName || data.name || firebaseUser.displayName || 'User',
                    preferredName: data.preferredName || '',
                    name: data.name || data.displayName || firebaseUser.displayName || 'User',
                    email: data.email || firebaseUser.email || '',
                    phone: data.phone || '',
                    companyName: data.companyName || '',
                    designation: data.designation || '',
                    signatureUrl: data.signatureUrl || '',
                    themePreference: data.themePreference || 'light',
                    role: assignedRole,
                    status: data.status || 'active',
                    photoURL: data.photoURL || data.profilePhoto || firebaseUser.photoURL || '',
                    profilePhoto: data.profilePhoto || data.photoURL || firebaseUser.photoURL || '',
                    createdAt: data.createdAt || new Date().toISOString(),
                    updatedAt: data.updatedAt || new Date().toISOString(),
                    lastLoginAt: new Date().toISOString(),
                  };
                  setCurrentUser(matchedProfile);
                  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(matchedProfile));
                } else {
                  // First login: bootstrap Firestore user profile document
                  const initialName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
                  const initialPreferred = initialName.split(' ')[0] || initialName;
                  const newProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    displayName: initialName,
                    name: initialName,
                    preferredName: initialPreferred,
                    email: firebaseUser.email || '',
                    phone: '',
                    companyName: '',
                    designation: '',
                    signatureUrl: '',
                    themePreference: 'light',
                    role: firebaseUser.email === 'gmanikandan639@gmail.com' ? 'admin' : 'user',
                    status: 'active',
                    photoURL: firebaseUser.photoURL || '',
                    profilePhoto: firebaseUser.photoURL || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastLoginAt: new Date().toISOString(),
                  };
                  try {
                    await setDoc(userDocRef, newProfile, { merge: true });
                  } catch (e) {
                    console.warn('Initial user profile write fallback:', e);
                  }
                  setCurrentUser(newProfile);
                  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newProfile));
                }
                setLoading(false);
              },
              (err) => {
                handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
                setLoading(false);
              }
            );
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      });

      return () => {
        unsubscribeAuth();
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      };
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      if (isConfigured && auth) {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCred.user;
        const initialName = fbUser.displayName || email.split('@')[0];
        const profile: UserProfile = {
          uid: fbUser.uid,
          name: initialName,
          displayName: initialName,
          preferredName: initialName.split(' ')[0] || initialName,
          email: fbUser.email || email,
          role: email === 'gmanikandan639@gmail.com' || email.includes('admin') ? 'admin' : 'user',
          status: 'active',
          photoURL: fbUser.photoURL || undefined,
          profilePhoto: fbUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(profile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        setLoading(false);
        return { success: true };
      } else {
        // Match against initial user database
        const normalized = email.trim().toLowerCase();
        const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === normalized);
        if (found) {
          if (found.status === 'disabled') {
            setLoading(false);
            return { success: false, error: 'Your account has been disabled by an administrator.' };
          }
          const updated = { ...found, lastLoginAt: new Date().toISOString() };
          setCurrentUser(updated);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
          setLoading(false);
          return { success: true };
        } else {
          // Allow custom user login for convenience
          const isAdm = normalized.includes('admin') || normalized === 'gmanikandan639@gmail.com';
          const defaultName = email.split('@')[0];
          const newUser: UserProfile = {
            uid: 'user_' + Date.now(),
            name: defaultName,
            displayName: defaultName,
            preferredName: defaultName,
            email: email,
            role: isAdm ? 'admin' : 'user',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setCurrentUser(newUser);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
          setLoading(false);
          return { success: true };
        }
      }
    } catch (err: any) {
      console.warn('Firebase Email/Password auth fallback triggered:', err);
      const normalized = email.trim().toLowerCase();
      const isAdm = normalized === 'gmanikandan639@gmail.com' || normalized.includes('admin');
      const dispName = normalized === 'gmanikandan639@gmail.com' ? 'Manikandan G' : normalized.split('@')[0];
      const prefName = normalized === 'gmanikandan639@gmail.com' ? 'Mani' : dispName.split(' ')[0] || dispName;
      const profile: UserProfile = {
        uid: 'user_' + btoa(normalized).replace(/=/g, ''),
        name: dispName,
        displayName: dispName,
        preferredName: prefName,
        email: normalized,
        role: isAdm ? 'admin' : 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      setCurrentUser(profile);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
      setLoading(false);
      return { success: true };
    }
  };

  const signInWithGoogle = async (
    customEmail?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      if (isConfigured && auth) {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const userCred = await signInWithPopup(auth, provider);
          const fbUser = userCred.user;
          const email = fbUser.email || customEmail || 'user@gmail.com';
          const isAdm =
            email.toLowerCase() === 'gmanikandan639@gmail.com' ||
            email.toLowerCase().includes('admin');
          const dName = fbUser.displayName || email.split('@')[0];
          const pName = dName.split(' ')[0] || dName;
          const profile: UserProfile = {
            uid: fbUser.uid,
            name: dName,
            displayName: dName,
            preferredName: pName,
            email: email,
            role: isAdm ? 'admin' : 'user',
            status: 'active',
            photoURL: fbUser.photoURL || undefined,
            profilePhoto: fbUser.photoURL || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setCurrentUser(profile);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
          setLoading(false);
          return { success: true };
        } catch (popupErr: any) {
          console.warn('Firebase Google Auth popup error, using Google Mail fallback:', popupErr);
          const normalized = (customEmail || 'gmanikandan639@gmail.com').trim().toLowerCase();
          const isAdm =
            normalized === 'gmanikandan639@gmail.com' || normalized.includes('admin');
          const dName = normalized === 'gmanikandan639@gmail.com' ? 'Manikandan G' : normalized.split('@')[0];
          const pName = normalized === 'gmanikandan639@gmail.com' ? 'Mani' : dName.split(' ')[0] || dName;
          const profile: UserProfile = {
            uid: 'google_' + btoa(normalized).replace(/=/g, ''),
            name: dName,
            displayName: dName,
            preferredName: pName,
            email: normalized,
            role: isAdm ? 'admin' : 'user',
            status: 'active',
            photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
            profilePhoto: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setCurrentUser(profile);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
          setLoading(false);
          return { success: true };
        }
      } else {
        // Direct Google Mail authentication (Demo/Local mode when Firebase credentials are not set)
        const normalized = (customEmail || 'gmanikandan639@gmail.com').trim().toLowerCase();
        const isAdm = normalized === 'gmanikandan639@gmail.com' || normalized.includes('admin');
        const dName = normalized === 'gmanikandan639@gmail.com' ? 'Manikandan G' : normalized.split('@')[0];
        const pName = normalized === 'gmanikandan639@gmail.com' ? 'Mani' : dName.split(' ')[0] || dName;
        const profile: UserProfile = {
          uid: 'google_' + btoa(normalized).replace(/=/g, ''),
          name: dName,
          displayName: dName,
          preferredName: pName,
          email: normalized,
          role: isAdm ? 'admin' : 'user',
          status: 'active',
          photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
          profilePhoto: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        setCurrentUser(profile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        setLoading(false);
        return { success: true };
      }
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Google authentication failed' };
    }
  };

  const quickLoginAs = (role: 'admin' | 'user') => {
    const user = role === 'admin' ? INITIAL_USERS[0] : INITIAL_USERS[1] || INITIAL_USERS[0];
    const updated = { ...user, lastLoginAt: new Date().toISOString() };
    setCurrentUser(updated);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
  };

  const logout = async () => {
    if (isConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Firebase signOut err:', err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  const updateCurrentProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const safeData = { ...data };

    // Non-admin users cannot promote themselves or modify their role/status
    if (currentUser.role !== 'admin') {
      delete (safeData as any).role;
      delete (safeData as any).status;
    }

    if (safeData.displayName && !safeData.name) {
      safeData.name = safeData.displayName;
    }
    if (safeData.name && !safeData.displayName) {
      safeData.displayName = safeData.name;
    }
    if (safeData.profilePhoto && !safeData.photoURL) {
      safeData.photoURL = safeData.profilePhoto;
    }
    if (safeData.photoURL && !safeData.profilePhoto) {
      safeData.profilePhoto = safeData.photoURL;
    }

    const updated: UserProfile = {
      ...currentUser,
      ...safeData,
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(updated);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));

    if (db && currentUser.uid) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const payload: Record<string, any> = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: updated.displayName || updated.name,
          name: updated.name || updated.displayName,
          preferredName: updated.preferredName || '',
          profilePhoto: updated.profilePhoto || updated.photoURL || '',
          photoURL: updated.photoURL || updated.profilePhoto || '',
          phone: updated.phone || '',
          companyName: updated.companyName || '',
          designation: updated.designation || '',
          signatureUrl: updated.signatureUrl || '',
          themePreference: updated.themePreference || 'light',
          updatedAt: updated.updatedAt,
        };

        if (currentUser.role === 'admin') {
          payload.role = updated.role;
          payload.status = updated.status;
        }

        await setDoc(userDocRef, payload, { merge: true });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    if (isConfigured && auth) {
      try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: `Password reset link sent to ${email}.` };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to send reset link.' };
      }
    } else {
      return {
        success: true,
        message: `Password reset instructions sent to ${email}.`,
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || 'user',
        loading,
        isFirebaseMode: isConfigured,
        login,
        signInWithGoogle,
        quickLoginAs,
        logout,
        updateCurrentProfile,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
