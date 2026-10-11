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

// Safe environment variable accessor for both Vite client and Node scripts
const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || 'AIzaSyDummyApiKeyForDevPreview12345678',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'mazbaha-elqalaa-dev.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || 'mazbaha-elqalaa-dev',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '123456789012',
  appId: getEnv('VITE_FIREBASE_APP_ID') || '1:123456789012:web:abcdef1234567890',
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
};

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);

// Prompt S6: App Check with reCAPTCHA v3, initialized BEFORE any Firestore call
function initAppCheckInstance(): AppCheck | null {
  if (typeof window === 'undefined') return null;
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
if (getEnv('VITE_USE_EMULATORS') === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch {
    // Prevent duplicate connection errors during fast reload
  }
}
