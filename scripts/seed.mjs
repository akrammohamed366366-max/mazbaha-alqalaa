// Seeds settings + one branch + sample delivery zones. Values are PLACEHOLDERS to edit later.
// Run with GOOGLE_APPLICATION_CREDENTIALS set (or the emulator env vars).
import admin from 'firebase-admin';
admin.initializeApp();
const db = admin.firestore();

await db.doc('settings/restaurant').set({
  nameAr: 'مزبحة القلعة',
  isOrderingOpen: true,
  phone: '',
  whatsapp: '',
  hours: { open: '12:00', close: '02:00' },
  minOrder: 100,
  deliveryEnabled: true,
  pickupEnabled: true,
  paymentMethods: { cod: true, card: false, wallet: false },
  currency: 'EGP',
}, { merge: true });

await db.doc('branches/main').set({
  nameAr: 'الفرع الرئيسي', address: '', phone: '', lat: null, lng: null, active: true,
}, { merge: true });

const zones = [
  { id: 'zone-1', name: 'المنطقة الأولى', fee: 20, active: true },
  { id: 'zone-2', name: 'المنطقة الثانية', fee: 30, active: true },
];
for (const z of zones) {
  await db.doc(`deliveryZones/${z.id}`).set({ name: z.name, fee: z.fee, active: z.active, branchId: 'main' }, { merge: true });
}
console.log('Seed done.');
