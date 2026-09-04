import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Read from import.meta.env or window fallback
export function getFirebaseConfig(): FirebaseConfig {
  const env = (import.meta as any).env || {};
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
}

const config = getFirebaseConfig();
export const isConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase initialized with Project ID:', config.projectId);

    // Validate connection test as required by skill
    getDocFromServer(doc(db, 'test', 'connection')).catch((err) => {
      if (err instanceof Error && err.message.includes('the client is offline')) {
        console.warn('Firebase client is offline. Verify network connection and project rules.');
      }
    });
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

export { app, auth, db };

// Error handling mandated by skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth;
  const currentUser = currentAuth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
