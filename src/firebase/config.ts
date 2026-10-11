import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
  connectFirestoreEmulator,
  setLogLevel,
} from 'firebase/firestore';

import { defaultFirebaseConfig } from '../lib/firebaseConfig';

// Safe environment variable accessor for both Vite client and Node scripts
const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const val = import.meta.env[key];
    if (typeof val === 'string' && val.trim().length > 0) return val;
  }
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key];
    if (typeof val === 'string' && val.trim().length > 0) return val;
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || defaultFirebaseConfig.apiKey || '',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || defaultFirebaseConfig.authDomain || '',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || defaultFirebaseConfig.projectId || '',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || defaultFirebaseConfig.storageBucket || '',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || defaultFirebaseConfig.messagingSenderId || '',
  appId: getEnv('VITE_FIREBASE_APP_ID') || defaultFirebaseConfig.appId || '',
};

export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey.trim().length > 0 && firebaseConfig.projectId.trim().length > 0
);

if (!isFirebaseConfigured) {
  console.warn('Firebase configuration missing (apiKey or projectId is empty). Running in uninitialized mode.');
}

function initFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export const app: FirebaseApp | null = initFirebaseApp();

export const auth: Auth = app ? getAuth(app) : ({} as Auth);

// Prompt S6: App Check with reCAPTCHA v3, initialized BEFORE any Firestore call
function initAppCheckInstance(): AppCheck | null {
  if (!app || typeof window === 'undefined') return null;
  const siteKey = getEnv('VITE_APPCHECK_SITE_KEY') || getEnv('VITE_RECAPTCHA_SITE_KEY');
  try {
    if (siteKey) {
      return initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (import.meta.env?.DEV) {
      // In development without live key, enable debug token
      // @ts-expect-error global flag for debug token
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
  } catch (err) {
    console.warn('App Check initialization:', err);
  }
  return null;
}

export const appCheck: AppCheck | null = initAppCheckInstance();

// Initialize Firestore with persistentLocalCache to cut repeat reads
function initFirestoreInstance(): Firestore {
  if (!app) return {} as Firestore;
  try {
    setLogLevel('error');
  } catch {
    // Ignore in unsupported environments
  }
  try {
    if (typeof window !== 'undefined') {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    }
  } catch {
    // If already initialized (e.g. HMR or SSR), get existing instance
  }
  return getFirestore(app);
}

export const db: Firestore = initFirestoreInstance();

// Connect to emulators if enabled
if (app && getEnv('VITE_USE_EMULATORS') === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch {
    // Prevent duplicate connection errors during fast reload
  }
}
