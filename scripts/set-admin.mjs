// Run locally ONCE to create the first admin. Never ship this to the frontend.
// 1) Create the user in Firebase Console > Authentication (email + password)
// 2) Download a service account key OUTSIDE the repo and point to it:
//      export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
// 3) node scripts/set-admin.mjs <uid> "<display name>"
import admin from 'firebase-admin';

admin.initializeApp();
const [uid, name = 'Admin'] = process.argv.slice(2);
if (!uid) {
  console.error('Usage: node scripts/set-admin.mjs <uid> "<name>"');
  process.exit(1);
}
await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
await admin.firestore().doc(`staff/${uid}`).set({
  name, role: 'admin', active: true,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});
console.log('Admin role set. Sign out and sign in again for it to apply.');
