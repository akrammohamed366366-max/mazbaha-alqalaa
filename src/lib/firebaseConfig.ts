/**
 * Committed fallback Firebase web configuration.
 * Used when import.meta.env.VITE_FIREBASE_* values are empty.
 */
export const defaultFirebaseConfig = {
  apiKey: 'AIzaSyDummyApiKeyForDevPreview12345678',
  authDomain: 'mazbaha-elqalaa-dev.firebaseapp.com',
  projectId: 'mazbaha-elqalaa-dev',
  storageBucket: 'mazbaha-elqalaa-dev.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef1234567890',
};

export type FirebaseWebConfig = typeof defaultFirebaseConfig;

export default defaultFirebaseConfig;
