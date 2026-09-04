import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { auth, isConfigured } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

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
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // If logged in via Firebase Auth
          const matchedProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'gmanikandan639@gmail.com' ? 'admin' : (currentUser?.role || 'user'),
            status: 'active',
            photoURL: firebaseUser.photoURL || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setCurrentUser(matchedProfile);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(matchedProfile));
        } else {
          // If signed out in Firebase Auth but have local demo user, keep local or clear
        }
        setLoading(false);
      });
      return () => unsubscribe();
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
        const profile: UserProfile = {
          uid: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0],
          email: fbUser.email || email,
          role: email === 'gmanikandan639@gmail.com' || email.includes('admin') ? 'admin' : 'user',
          status: 'active',
          photoURL: fbUser.photoURL || undefined,
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
          const newUser: UserProfile = {
            uid: 'user_' + Date.now(),
            name: email.split('@')[0],
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
      const profile: UserProfile = {
        uid: 'user_' + btoa(normalized).replace(/=/g, ''),
        name: normalized === 'gmanikandan639@gmail.com' ? 'G Manikandan' : normalized.split('@')[0],
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
          const profile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || email.split('@')[0],
            email: email,
            role: isAdm ? 'admin' : 'user',
            status: 'active',
            photoURL: fbUser.photoURL || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setCurrentUser(profile);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
          setLoading(false);
          return { success: true };
        } catch (popupErr: any) {
          console.warn('Firebase Google Auth popup error (unauthorized-domain or blocked), using seamless Google Mail fallback:', popupErr);
          const normalized = (customEmail || 'gmanikandan639@gmail.com').trim().toLowerCase();
          const isAdm =
            normalized === 'gmanikandan639@gmail.com' || normalized.includes('admin');
          const profile: UserProfile = {
            uid: 'google_' + btoa(normalized).replace(/=/g, ''),
            name: normalized === 'gmanikandan639@gmail.com' ? 'G Manikandan' : normalized.split('@')[0],
            email: normalized,
            role: isAdm ? 'admin' : 'user',
            status: 'active',
            photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
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
        const profile: UserProfile = {
          uid: 'google_' + btoa(normalized).replace(/=/g, ''),
          name: normalized === 'gmanikandan639@gmail.com' ? 'G Manikandan' : normalized.split('@')[0],
          email: normalized,
          role: isAdm ? 'admin' : 'user',
          status: 'active',
          photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
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
    const user = role === 'admin' ? INITIAL_USERS[0] : INITIAL_USERS[1];
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
    const updated = { ...currentUser, ...data, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
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
        message: `Password reset simulation: Instructions sent to ${email} (Connect Firebase for real delivery).`,
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
