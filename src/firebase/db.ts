import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  RestaurantSettings,
  MenuDocument,
  Category,
  MenuItem,
  Offer,
  StaffUser,
  OrderRecord,
  OrderStatus,
  UserProfile,
  DeliveryZoneItem,
} from '../types';

// ==========================================
// 1. Settings (settings/restaurant)
// ==========================================

export const DEFAULT_SETTINGS: RestaurantSettings = {
  nameAr: 'مذبحة القلعة',
  phone: '01000000000',
  whatsapp: '01000000000',
  address: 'شارع صلاح سالم، بجوار قلعة صلاح الدين، القاهرة',
  hours: { open: '12:00', close: '02:00' },
  isOrderingOpen: true,
  closedMessage: '',
  minOrder: 100,
  deliveryEnabled: true,
  pickupEnabled: true,
  paymentMethods: {
    cod: true,
    transfer: true,
  },
  transferInstructions: 'التحويل عبر محفظة فودافون كاش أو إنستاباي على الرقم: 01000000000، ثم اكتب رقم المعاملة بالأسفل.',
  zones: {
    'zone-1': { name: 'القلعة ومحيطها', fee: 20, active: true, sortOrder: 1 },
    'zone-2': { name: 'وسط البلد والدرب الأحمر', fee: 30, active: true, sortOrder: 2 },
    'zone-3': { name: 'المعادي ومصر القديمة', fee: 40, active: true, sortOrder: 3 },
  },
  currency: 'EGP',
};

export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  const ref = doc(db, 'settings', 'restaurant');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return DEFAULT_SETTINGS;
  }
  const data = snap.data();
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    zones: data.zones || DEFAULT_SETTINGS.zones,
    paymentMethods: data.paymentMethods || DEFAULT_SETTINGS.paymentMethods,
  };
}

export function subscribeRestaurantSettings(
  callback: (settings: RestaurantSettings) => void,
  onError?: (err: Error) => void
): () => void {
  const ref = doc(db, 'settings', 'restaurant');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          ...DEFAULT_SETTINGS,
          ...data,
          zones: data.zones || DEFAULT_SETTINGS.zones,
          paymentMethods: data.paymentMethods || DEFAULT_SETTINGS.paymentMethods,
        });
      } else {
        callback(DEFAULT_SETTINGS);
      }
    },
    (err) => {
      console.warn('subscribeRestaurantSettings error:', err.message);
      if (onError) onError(err);
    }
  );
}

export async function updateRestaurantSettings(updates: Partial<RestaurantSettings>): Promise<void> {
  const ref = doc(db, 'settings', 'restaurant');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...DEFAULT_SETTINGS,
      ...updates,
    });
  } else {
    await updateDoc(ref, updates as any);
  }
}

// Zones management inside settings/restaurant.zones map
export async function updateDeliveryZoneInSettings(
  zoneId: string,
  zone: Partial<DeliveryZoneItem> | DeliveryZoneItem
): Promise<void> {
  const ref = doc(db, 'settings', 'restaurant');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? (snap.data() as RestaurantSettings) : DEFAULT_SETTINGS;
    const currentZones = { ...(data.zones || {}) };
    const existing = currentZones[zoneId] || { name: '', fee: 0, active: true, sortOrder: 1 };
    currentZones[zoneId] = {
      name: zone.name !== undefined ? zone.name : existing.name,
      fee: zone.fee !== undefined ? zone.fee : existing.fee,
      active: zone.active !== undefined ? zone.active : existing.active,
      sortOrder: zone.sortOrder !== undefined ? zone.sortOrder : existing.sortOrder,
    };
    tx.update(ref, { zones: currentZones });
  });
}

export async function deleteDeliveryZoneFromSettings(zoneId: string): Promise<void> {
  const ref = doc(db, 'settings', 'restaurant');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as RestaurantSettings;
    const currentZones = { ...(data.zones || {}) };
    delete currentZones[zoneId];
    tx.update(ref, { zones: currentZones });
  });
}

// ==========================================
// 2. Menu (menu/current - Single Document)
// ==========================================

export const DEFAULT_MENU: MenuDocument = {
  categories: [
    { id: 'cat-1', name: 'مشويات على الفحم', sortOrder: 1, active: true },
    { id: 'cat-2', name: 'طواجن ومحاشي', sortOrder: 2, active: true },
    { id: 'cat-3', name: 'سلطات ومقبلات', sortOrder: 3, active: true },
    { id: 'cat-4', name: 'مشروبات وحلويات', sortOrder: 4, active: true },
  ],
  items: [
    {
      id: 'item-1',
      categoryId: 'cat-1',
      name: 'كباب بتلو بلدي',
      description: 'قطع كباب بتلو بلدي متبلة بالخلطة السرية ومسواة على الفحم الهادئ.',
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop',
      tags: ['كباب', 'بتلو', 'مميز'],
      sortOrder: 1,
      active: true,
      available: true,
      featured: true,
      variants: [
        { id: 'v-1', label: 'ربع كيلو', price: 180 },
        { id: 'v-2', label: 'نصف كيلو', price: 350 },
        { id: 'v-3', label: 'كيلو', price: 690 },
      ],
    },
    {
      id: 'item-2',
      categoryId: 'cat-1',
      name: 'كفتة مشوية على الفحم',
      description: 'كفتة لحم بلدي طازجة باللية الضاني وبهارات المذبحة الخاصة.',
      imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&auto=format&fit=crop',
      tags: ['كفتة', 'مشويات'],
      sortOrder: 2,
      active: true,
      available: true,
      featured: true,
      variants: [
        { id: 'v-1', label: 'ربع كيلو', price: 140 },
        { id: 'v-2', label: 'نصف كيلو', price: 270 },
        { id: 'v-3', label: 'كيلو', price: 530 },
      ],
    },
    {
      id: 'item-3',
      categoryId: 'cat-1',
      name: 'طرب بلدي أصيل',
      description: 'طرب لحم بلدي متبل ملفوف بمنديل ضاني خفيف ومقرمش من على الفحم.',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop',
      tags: ['طرب', 'ضاني'],
      sortOrder: 3,
      active: true,
      available: true,
      featured: true,
      variants: [
        { id: 'v-1', label: 'ربع كيلو', price: 160 },
        { id: 'v-2', label: 'نصف كيلو', price: 310 },
        { id: 'v-3', label: 'كيلو', price: 610 },
      ],
    },
    {
      id: 'item-4',
      categoryId: 'cat-1',
      name: 'ريش ضاني مشوية',
      description: 'ريش ضاني متبلة ومحمرة على الجمر بتسوية ممتازة.',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop',
      tags: ['ريش', 'ضاني'],
      sortOrder: 4,
      active: true,
      available: true,
      featured: false,
      variants: [
        { id: 'v-1', label: 'ربع كيلو', price: 210 },
        { id: 'v-2', label: 'نصف كيلو', price: 410 },
        { id: 'v-3', label: 'كيلو', price: 800 },
      ],
    },
  ],
  offers: [
    {
      id: 'off-1',
      title: 'صينية ملوك القلعة',
      subtitle: 'نص كباب + نص كفتة + نص طرب + ربع ريش + سلطات وعيش',
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop',
      price: 1100,
      active: true,
      sortOrder: 1,
    },
  ],
};

export async function getMenu(): Promise<MenuDocument> {
  const ref = doc(db, 'menu', 'current');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return DEFAULT_MENU;
  }
  return snap.data() as MenuDocument;
}

export function subscribeMenu(
  callback: (menu: MenuDocument) => void,
  onError?: (err: Error) => void
): () => void {
  const ref = doc(db, 'menu', 'current');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as MenuDocument);
      } else {
        callback(DEFAULT_MENU);
      }
    },
    (err) => {
      console.warn('subscribeMenu error:', err.message);
      if (onError) onError(err);
    }
  );
}

// ----------------------------------------------------------------------
// Menu mutations: Every change is a runTransaction on doc(db, 'menu', 'current')
// ----------------------------------------------------------------------

export async function addCategoryInMenu(cat: Omit<Category, 'id'>): Promise<string> {
  const ref = doc(db, 'menu', 'current');
  const newId = `cat-${Date.now()}`;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? (snap.data() as MenuDocument) : DEFAULT_MENU;
    const categories = [...(data.categories || [])];
    if (categories.length >= 40) throw new Error('الحد الأقصى للتصنيفات هو 40 تصنيفاً.');
    categories.push({ ...cat, id: newId });
    tx.set(
      ref,
      {
        categories,
        items: data.items || [],
        offers: data.offers || [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
  return newId;
}

export async function updateCategoryInMenu(catId: string, updates: Partial<Category>): Promise<void> {
  const ref = doc(db, 'menu', 'current');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as MenuDocument;
    const categories = (data.categories || []).map((c) =>
      c.id === catId ? { ...c, ...updates } : c
    );
    tx.update(ref, {
      categories,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteCategoryInMenu(catId: string): Promise<void> {
  const ref = doc(db, 'menu', 'current');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as MenuDocument;
    const categories = (data.categories || []).filter((c) => c.id !== catId);
    tx.update(ref, {
      categories,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function reorderCategoriesInMenu(
  orderedCategoryIds: (string | { id: string; sortOrder?: number })[]
): Promise<void> {
  const ref = doc(db, 'menu', 'current');
  const ids = orderedCategoryIds.map((item) => (typeof item === 'string' ? item : item.id));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as MenuDocument;
    const catMap = new Map((data.categories || []).map((c) => [c.id, c]));
    const categories = ids
      .map((id, idx) => {
        const c = catMap.get(id);
        return c ? { ...c, sortOrder: idx + 1 } : null;
      })
      .filter(Boolean) as Category[];
    tx.update(ref, {
      categories,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function addMenuItemInMenu(item: Omit<MenuItem, 'id'>): Promise<string> {
  const ref = doc(db, 'menu', 'current');
  const newId = `item-${Date.now()}`;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? (snap.data() as MenuDocument) : DEFAULT_MENU;
    const items = [...(data.items || [])];
    if (items.length >= 200) throw new Error('الحد الأقصى للأصناف في القائمة هو 200 صنف.');
    items.push({ ...item, id: newId });
    tx.set(
      ref,
      {
        categories: data.categories || [],
        items,
        offers: data.offers || [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
  return newId;
}

export async function updateMenuItemInMenu(itemId: string, updates: Partial<MenuItem>): Promise<void> {
  const ref = doc(db, 'menu', 'current');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as MenuDocument;
    const items = (data.items || []).map((it) =>
      it.id === itemId ? { ...it, ...updates } : it
    );
    tx.update(ref, {
      items,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteMenuItemInMenu(itemId: string): Promise<void> {
  const ref = doc(db, 'menu', 'current');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as MenuDocument;
    const items = (data.items || []).filter((it) => it.id !== itemId);
    tx.update(ref, {
      items,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function toggleMenuItemAvailableInMenu(itemId: string, available: boolean): Promise<void> {
  return updateMenuItemInMenu(itemId, { available });
}

export async function toggleMenuItemActiveInMenu(itemId: string, active: boolean): Promise<void> {
  return updateMenuItemInMenu(itemId, { active });
}

export async function addOfferInMenu(offer: Omit<Offer, 'id'>): Promise<string> {
  const ref = doc(db, 'menu', 'current');
  const newId = `off-${Date.now()}`;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? (snap.data() as MenuDocument) : DEFAULT_MENU;
    const offers = [...(data.offers || [])];
    if (offers.length >= 20) throw new Error('الحد الأقصى للعروض الترويجية هو 20 عرضاً.');
    offers.push({ ...offer, id: newId });
    tx.set(
      ref,
      {
        categories: data.categories || [],
        items: data.items || [],
        offers,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
  return newId;
}

export async function updateOfferInMenu(offerId: string, updates: Partial<Offer>): Promise<void> {
  const ref = doc(db, 'menu', 'current');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as MenuDocument;
    const offers = (data.offers || []).map((o) =>
      o.id === offerId ? { ...o, ...updates } : o
    );
    tx.update(ref, {
      offers,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteOfferInMenu(offerId: string): Promise<void> {
  const ref = doc(db, 'menu', 'current');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as MenuDocument;
    const offers = (data.offers || []).filter((o) => o.id !== offerId);
    tx.update(ref, {
      offers,
      updatedAt: serverTimestamp(),
    });
  });
}

// ==========================================
// 3. Staff (staff/{uid})
// ==========================================

export function subscribeStaff(
  callback: (staffList: StaffUser[]) => void,
  onError?: (err: Error) => void
): () => void {
  const staffCol = collection(db, 'staff');
  const q = query(staffCol, limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const staffList = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'staff',
          preset: data.preset || 'cashier',
          permissions: data.permissions || {},
          active: data.active ?? true,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          updatedAt: data.updatedAt,
        } as StaffUser;
      });
      callback(staffList);
    },
    (err) => {
      console.warn('subscribeStaff error:', err.message);
      if (onError) onError(err);
    }
  );
}

export function subscribeDrivers(
  callback: (drivers: StaffUser[]) => void,
  onError?: (err: Error) => void
): () => void {
  const staffCol = collection(db, 'staff');
  return onSnapshot(
    staffCol,
    (snap) => {
      const drivers = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as StaffUser))
        .filter((s) => s.active && (s.preset === 'driver' || s.permissions?.driver === true));
      callback(drivers);
    },
    (err) => {
      console.warn('subscribeDrivers error:', err.message);
      if (onError) onError(err);
    }
  );
}

export async function createStaffInDb(uid: string, staffData: Omit<StaffUser, 'id'>): Promise<void> {
  const ref = doc(db, 'staff', uid);
  await setDoc(ref, {
    ...staffData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateStaffInDb(uid: string, updates: Partial<StaffUser>): Promise<void> {
  const ref = doc(db, 'staff', uid);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStaffFromDb(uid: string): Promise<void> {
  const ref = doc(db, 'staff', uid);
  await deleteDoc(ref);
}

// ==========================================
// 4. Orders (orders/{id})
// ==========================================

export async function getOrderById(orderId: string): Promise<OrderRecord | null> {
  const ref = doc(db, 'orders', orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as OrderRecord;
}

export async function getOrderByNumber(orderNumber: number, ownerId?: string): Promise<OrderRecord | null> {
  const ordersCol = collection(db, 'orders');
  try {
    const constraints: any[] = [where('orderNumber', '==', orderNumber), limit(1)];
    if (ownerId) {
      constraints.unshift(where('ownerId', '==', ownerId));
    }
    const q = query(ordersCol, ...constraints);
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as OrderRecord;
    }
  } catch (err: any) {
    console.warn('getOrderByNumber error:', err?.message || err);
    if (
      err?.code === 'resource-exhausted' ||
      err?.code === 'unavailable' ||
      err?.message?.includes('resource-exhausted') ||
      err?.message?.includes('unavailable')
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firebase-quota-exhausted'));
        window.dispatchEvent(new CustomEvent('firebase-service-unavailable'));
      }
    }
  }
  return null;
}

export function subscribeOrder(
  orderId: string,
  callback: (order: OrderRecord | null) => void,
  onError?: (err: Error) => void
): () => void {
  const ref = doc(db, 'orders', orderId);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as OrderRecord) : null);
    },
    (err) => {
      console.warn(`subscribeOrder (${orderId}) error:`, err.message);
      if (onError) onError(err);
    }
  );
}

export function subscribeLiveOrders(
  callback: (orders: OrderRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const ordersCol = collection(db, 'orders');

  // Start of today timestamp (00:00:00.000)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Store orders from both streams
  let todayOrders: OrderRecord[] = [];
  let olderUndeliveredOrders: OrderRecord[] = [];

  const emitCombined = () => {
    const map = new Map<string, OrderRecord>();
    // Put today's orders
    todayOrders.forEach((o) => map.set(o.id, o));
    // Put older undelivered
    olderUndeliveredOrders.forEach((o) => map.set(o.id, o));
    const combined = Array.from(map.values());
    combined.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return timeB - timeA;
    });
    callback(combined);
  };

  // Query 1: where createdAt >= startOfToday (limited to 50)
  let q1 = query(
    ordersCol,
    where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  let unsub1: (() => void) | null = null;
  let unsub2: (() => void) | null = null;

  try {
    unsub1 = onSnapshot(
      q1,
      (snap) => {
        todayOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderRecord));
        emitCombined();
      },
      (err) => {
        console.warn('subscribeLiveOrders q1 error, falling back:', err.message);
        if (
          err.code === 'resource-exhausted' ||
          err.code === 'unavailable' ||
          err.message?.includes('resource-exhausted') ||
          err.message?.includes('unavailable')
        ) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('firebase-quota-exhausted'));
            window.dispatchEvent(new CustomEvent('firebase-service-unavailable'));
          }
        }
        if (onError) onError(err);
        // Fallback: limited latest 50
        const fallbackQ = query(ordersCol, limit(50));
        unsub1 = onSnapshot(
          fallbackQ,
          (snapFallback) => {
            todayOrders = snapFallback.docs.map((d) => ({ id: d.id, ...d.data() } as OrderRecord));
            emitCombined();
          },
          (fallbackErr) => {
            console.warn('Fallback orders query error:', fallbackErr.message);
          }
        );
      }
    );
  } catch (err: any) {
    console.warn('Failed to start q1:', err);
  }

  // Query 2: undelivered older orders (status in active statuses, limited to 30)
  try {
    const activeStatuses: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready', 'out_for_delivery'];
    const q2 = query(
      ordersCol,
      where('status', 'in', activeStatuses),
      where('createdAt', '<', Timestamp.fromDate(startOfToday)),
      limit(30)
    );

    unsub2 = onSnapshot(
      q2,
      (snap) => {
        olderUndeliveredOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderRecord));
        emitCombined();
      },
      (err) => {
        // Fallback if composite index is pending: filter locally or ignore
        console.warn('subscribeLiveOrders q2 (older undelivered) error:', err.message);
      }
    );
  } catch (err: any) {
    console.warn('Failed to start q2:', err);
  }

  return () => {
    if (unsub1) unsub1();
    if (unsub2) unsub2();
  };
}

export function subscribeDriverOrders(
  driverUid: string,
  callback: (orders: OrderRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const ordersCol = collection(db, 'orders');
  // Driver queries their assigned orders directly
  const q = query(
    ordersCol,
    where('driverId', '==', driverUid),
    limit(30)
  );

  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderRecord));
      callback(orders);
    },
    (err) => {
      console.warn('subscribeDriverOrders error:', err.message);
      if (onError) onError(err);
    }
  );
}

export function subscribeCustomerOrders(
  customerUid: string,
  callback: (orders: OrderRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const ordersCol = collection(db, 'orders');
  const q = query(
    ordersCol,
    where('ownerId', '==', customerUid),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderRecord));
      callback(orders);
    },
    (err) => {
      console.warn('subscribeCustomerOrders error, falling back to unordered query:', err.message);
      const fallbackQuery = query(
        ordersCol,
        where('ownerId', '==', customerUid),
        limit(30)
      );
      return onSnapshot(
        fallbackQuery,
        (snap2) => {
          const orders = snap2.docs.map((d) => ({ id: d.id, ...d.data() } as OrderRecord));
          orders.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return timeB - timeA;
          });
          callback(orders);
        },
        (err2) => {
          if (onError) onError(err2);
        }
      );
    }
  );
}

export async function updateOrderStatusInDb(
  orderId: string,
  newStatus: OrderStatus,
  extra?: {
    driverId?: string;
    driverName?: string;
    cancelReason?: string;
    by?: string;
    paymentStatus?: 'paid' | 'unpaid';
  }
): Promise<void> {
  const ref = doc(db, 'orders', orderId);
  const patch: any = {
    status: newStatus,
    updatedAt: serverTimestamp(),
    statusLog: arrayUnion({
      status: newStatus,
      at: Date.now(),
      by: extra?.by || 'staff',
    }),
  };

  if (extra?.driverId !== undefined) patch.driverId = extra.driverId;
  if (extra?.driverName !== undefined) patch.driverName = extra.driverName;
  if (extra?.cancelReason !== undefined) patch.cancelReason = extra.cancelReason;
  if (extra?.paymentStatus !== undefined) patch.paymentStatus = extra.paymentStatus;

  await updateDoc(ref, patch);
}

export async function updateOrderPaymentStatusInDb(
  orderId: string,
  paymentStatus: 'paid' | 'unpaid'
): Promise<void> {
  const ref = doc(db, 'orders', orderId);
  await updateDoc(ref, {
    paymentStatus,
    updatedAt: serverTimestamp(),
    statusLog: arrayUnion({
      status: 'payment_status_updated' as OrderStatus,
      at: Date.now(),
      by: auth.currentUser?.uid || 'staff',
    }),
  });
}

export async function assignOrderDriverInDb(
  orderId: string,
  driverId: string,
  driverName: string
): Promise<void> {
  const ref = doc(db, 'orders', orderId);
  await updateDoc(ref, {
    driverId,
    driverName,
    updatedAt: serverTimestamp(),
    statusLog: arrayUnion({
      status: 'driver_assigned' as OrderStatus,
      at: Date.now(),
      by: auth.currentUser?.uid || 'staff',
    }),
  });
}

// ==========================================
// 5. Customer Profile (users/{uid})
// ==========================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ==========================================
// 6. Setup / Bootstrap helpers (Prompt S6)
// ==========================================

export async function initializeOrderCounterIfMissing(): Promise<void> {
  const ref = doc(db, 'counters', 'orders');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      value: 1000,
      lastOrderId: '',
    });
  }
}

/**
 * Prompt S6: Admin-only setup button helper
 * Creates missing documents once:
 * - settings/restaurant with safe defaults
 * - menu/current with empty arrays (or keeps existing)
 * - counters/orders with { value: 1000, lastOrderId: '' }
 * Does nothing if they already exist.
 */
export async function initializeInitialSystemDocumentsOnce(): Promise<{
  settingsCreated: boolean;
  menuCreated: boolean;
  counterCreated: boolean;
}> {
  let settingsCreated = false;
  let menuCreated = false;
  let counterCreated = false;

  // 1. settings/restaurant
  const settingsRef = doc(db, 'settings', 'restaurant');
  const settingsSnap = await getDoc(settingsRef);
  if (!settingsSnap.exists()) {
    await setDoc(settingsRef, DEFAULT_SETTINGS);
    settingsCreated = true;
  }

  // 2. menu/current
  const menuRef = doc(db, 'menu', 'current');
  const menuSnap = await getDoc(menuRef);
  if (!menuSnap.exists()) {
    await setDoc(menuRef, {
      categories: [],
      items: [],
      offers: [],
      updatedAt: serverTimestamp(),
    });
    menuCreated = true;
  }

  // 3. counters/orders
  const counterRef = doc(db, 'counters', 'orders');
  const counterSnap = await getDoc(counterRef);
  if (!counterSnap.exists()) {
    await setDoc(counterRef, {
      value: 1000,
      lastOrderId: '',
    });
    counterCreated = true;
  }

  return { settingsCreated, menuCreated, counterCreated };
}

// ==========================================
// 7. Backward Compatibility / Adapters
// ==========================================

export const subscribeOrderById = subscribeOrder;

export async function getOrders(limitCount: number = 50): Promise<OrderRecord[]> {
  const ordersCol = collection(db, 'orders');
  try {
    const q = query(ordersCol, orderBy('createdAt', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderRecord));
  } catch {
    const snap = await getDocs(query(ordersCol, limit(limitCount)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderRecord));
  }
}

export async function getOrdersByRange(startMs?: number, endMs?: number): Promise<OrderRecord[]> {
  const orders = await getOrders(100);
  if (!startMs && !endMs) return orders;
  return orders.filter((o) => {
    let t = 0;
    if (o.createdAt && typeof o.createdAt.toMillis === 'function') {
      t = o.createdAt.toMillis();
    } else if (o.createdAt && o.createdAt.seconds) {
      t = o.createdAt.seconds * 1000;
    } else if (typeof o.createdAt === 'number') {
      t = o.createdAt;
    }
    if (startMs && t < startMs) return false;
    if (endMs && t > endMs) return false;
    return true;
  });
}

// Menu compatibility adapters mapped to single doc menu/current
export function subscribeCategories(
  callback: (categories: Category[]) => void,
  onlyActive?: boolean
): () => void {
  return subscribeMenu((menu) => {
    let cats = menu.categories || [];
    if (onlyActive) cats = cats.filter((c) => c.active !== false);
    callback(cats);
  });
}

export function subscribeMenuItems(
  callback: (items: MenuItem[]) => void,
  onlyActive?: boolean
): () => void {
  return subscribeMenu((menu) => {
    let items = menu.items || [];
    if (onlyActive) items = items.filter((i) => i.active !== false);
    callback(items);
  });
}

export function subscribeOffers(
  callback: (offers: Offer[]) => void,
  onlyActive?: boolean
): () => void {
  return subscribeMenu((menu) => {
    let offers = menu.offers || [];
    if (onlyActive) offers = offers.filter((o) => o.active !== false);
    callback(offers);
  });
}

export const addCategoryToDb = addCategoryInMenu;
export const updateCategoryInDb = updateCategoryInMenu;
export const deleteCategoryFromDb = deleteCategoryInMenu;
export const reorderCategoriesInDb = reorderCategoriesInMenu;

export const addMenuItemToDb = addMenuItemInMenu;
export const updateMenuItem = updateMenuItemInMenu;
export const deleteMenuItemFromDb = deleteMenuItemInMenu;

export const addOfferToDb = addOfferInMenu;
export const updateOfferInDb = updateOfferInMenu;
export const deleteOfferFromDb = deleteOfferInMenu;

export const subscribeStaffMembers = subscribeStaff;

export function subscribeDeliveryZones(
  callback: (zones: (DeliveryZoneItem & { id: string })[]) => void,
  onlyActive?: boolean
): () => void {
  return subscribeRestaurantSettings((settings) => {
    if (!settings || !settings.zones) {
      callback([]);
      return;
    }
    let list = Object.entries(settings.zones).map(([id, z]) => ({
      id,
      name: z.name,
      fee: z.fee,
      active: z.active,
      sortOrder: z.sortOrder,
    }));
    if (onlyActive) list = list.filter((z) => z.active !== false);
    callback(list);
  });
}

export async function addDeliveryZoneToDb(
  zone: Omit<DeliveryZoneItem, 'id'> & { id?: string }
): Promise<string> {
  const zoneId = zone.id || `zone-${Date.now()}`;
  await updateDeliveryZoneInSettings(zoneId, {
    name: zone.name,
    fee: zone.fee,
    active: zone.active ?? true,
    sortOrder: zone.sortOrder ?? 1,
  });
  return zoneId;
}

export async function updateDeliveryZone(
  zoneId: string,
  updates: Partial<DeliveryZoneItem>
): Promise<void> {
  await updateDeliveryZoneInSettings(zoneId, updates);
}

export const deleteDeliveryZoneFromDb = deleteDeliveryZoneFromSettings;

// Branch adapters (Single main branch for Spark plan)
export function subscribeBranch(
  _branchId: string,
  callback: (branch: any) => void
): () => void {
  return subscribeRestaurantSettings((settings) => {
    callback({
      id: 'main',
      nameAr: settings.nameAr || 'الفرع الرئيسي',
      address: settings.address || '',
      phone: settings.phone || '',
      active: true,
    });
  });
}

export async function updateBranchInDb(
  _branchId: string,
  updates: any
): Promise<void> {
  await updateRestaurantSettings({
    nameAr: updates.nameAr,
    address: updates.address,
    phone: updates.phone,
  });
}

import { processAndUploadImage } from '../lib/uploadImage';

// Upload adapters (Spark plan: uses Cloudinary unsigned upload with client-side compression, zero Firebase Storage)
export async function uploadMenuImage(_itemId: string, file: File): Promise<string> {
  return await processAndUploadImage(file);
}

export async function uploadOfferImage(_offerId: string, file: File): Promise<string> {
  return await processAndUploadImage(file);
}
