import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from './config';
import { RestaurantSettings, MenuDocument, OrderDeliveryAddress } from '../types';

export interface PlaceOrderItemInput {
  itemId: string;
  variantId: string;
  qty: number;
  note?: string;
}

export interface PlaceOrderInput {
  source?: 'web' | 'phone';
  customer: {
    name: string;
    phone: string;
  };
  delivery: {
    type: 'delivery' | 'pickup';
    zoneId?: string | null;
    zoneName?: string | null;
    address?: OrderDeliveryAddress | null;
  };
  items: PlaceOrderItemInput[];
  notes?: string;
  paymentMethod: 'cod' | 'transfer';
  transferRef?: string;
  currentMenu?: MenuDocument;
  currentSettings?: RestaurantSettings;
}

export interface PlaceOrderResult {
  orderId: string;
  orderNumber: number;
  total: number;
}

/**
 * Places an order using a client-side Firestore transaction (Spark Plan compliant).
 * Conforms strictly to authoritative firestore.rules.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const isPhoneOrder = input.source === 'phone';
  const currentUser = auth.currentUser;

  if (!isPhoneOrder && !currentUser) {
    throw new Error('يرجى تسجيل الدخول أولاً لإتمام الطلب.');
  }

  // 1. Fetch or use current menu and settings snapshots to build prices
  let menu = input.currentMenu;
  let settings = input.currentSettings;

  if (!menu) {
    const menuSnap = await getDoc(doc(db, 'menu', 'current'));
    if (!menuSnap.exists()) {
      throw new Error('قائمة الطعام غير متوفرة حالياً.');
    }
    menu = menuSnap.data() as MenuDocument;
  }

  if (!settings) {
    const settingsSnap = await getDoc(doc(db, 'settings', 'restaurant'));
    if (!settingsSnap.exists()) {
      throw new Error('إعدادات المطعم غير متوفرة حالياً.');
    }
    settings = settingsSnap.data() as RestaurantSettings;
  }

  if (!isPhoneOrder && !settings.isOrderingOpen) {
    throw new Error('المطعم مغلق حالياً ولا يستقبل طلبات جديدة.');
  }

  // 2. Validate and build items with server-equivalent prices from menu
  if (!input.items || input.items.length === 0 || input.items.length > 20) {
    throw new Error('عدد الأصناف في الطلب يجب أن يكون بين 1 و 20 صنفاً.');
  }

  let subtotal = 0;
  const orderItems = input.items.map((line) => {
    const menuItem = menu!.items.find((it) => it.id === line.itemId);
    if (!menuItem || menuItem.active === false || menuItem.available === false) {
      throw new Error(`الصنف ${menuItem?.name || line.itemId} غير متاح للطلب.`);
    }

    const variant = menuItem.variants.find((v) => v.id === line.variantId);
    if (!variant) {
      throw new Error(`الحجم أو الخيار غير صالح للصنف ${menuItem.name}.`);
    }

    const qty = Math.max(1, Math.min(20, Math.floor(line.qty || 1)));
    const unitPrice = Math.floor(variant.price);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    return {
      itemId: menuItem.id,
      name: menuItem.name,
      variantId: variant.id,
      variantLabel: variant.label,
      unitPrice,
      qty,
      lineTotal,
      note: line.note ? line.note.trim().slice(0, 200) : '',
    };
  });

  // 3. Compute delivery fee
  let deliveryFee = 0;
  let deliveryData: {
    type: 'delivery' | 'pickup';
    zoneId: string | null;
    zoneName: string | null;
    address: OrderDeliveryAddress | null;
  };

  if (input.delivery.type === 'pickup') {
    deliveryFee = 0;
    deliveryData = {
      type: 'pickup',
      zoneId: null,
      zoneName: null,
      address: null,
    };
  } else {
    const zoneId = input.delivery.zoneId || '';
    const zone = settings.zones?.[zoneId];
    if (!zone || !zone.active) {
      throw new Error('يرجى اختيار منطقة توصيل صالحة ومفعلة.');
    }
    deliveryFee = Math.floor(zone.fee);
    deliveryData = {
      type: 'delivery',
      zoneId,
      zoneName: zone.name,
      address: {
        street: input.delivery.address?.street?.trim() || '',
        building: input.delivery.address?.building?.trim() || '',
        floor: input.delivery.address?.floor?.trim() || '',
        apartment: input.delivery.address?.apartment?.trim() || '',
        landmark: input.delivery.address?.landmark?.trim() || '',
      },
    };
  }

  const total = subtotal + deliveryFee;

  // Validate minOrder for web customer orders
  if (!isPhoneOrder && subtotal < (settings.minOrder || 0)) {
    throw new Error(`الحد الأدنى للطلب هو ${settings.minOrder} ج.م`);
  }

  // Validate transfer payment reference
  if (input.paymentMethod === 'transfer') {
    const ref = (input.transferRef || '').trim();
    if (ref.length < 3 || ref.length > 40) {
      throw new Error('يرجى إدخال رقم العملية أو آخر 4 أرقام من رقم التحويل (3 إلى 40 حرفاً).');
    }
  }

  // 4. Generate order reference first so id is available
  const orderRef = doc(collection(db, 'orders'));
  const countersRef = doc(db, 'counters', 'orders');
  let orderNumber = 1001;

  try {
    await runTransaction(db, async (tx) => {
      // Read counters/orders
      const countersSnap = await tx.get(countersRef);
      if (!countersSnap.exists()) {
        throw new Error('عداد الطلبات غير مهيأ. يرجى تهيئة العداد من لوحة الإدارة.');
      }

      const currentVal = countersSnap.data()?.value || 1000;
      orderNumber = currentVal + 1;

      // Update counters/orders with new number and lastOrderId
      tx.update(countersRef, {
        value: orderNumber,
        lastOrderId: orderRef.id,
      });

      // Construct exact order document matching orderShapeOk in rules
      const orderPayload: any = {
        orderNumber,
        ownerId: isPhoneOrder ? null : currentUser!.uid,
        branchId: 'main',
        source: isPhoneOrder ? 'phone' : 'web',
        customer: {
          name: input.customer.name.trim().slice(0, 80),
          phone: input.customer.phone.trim(),
        },
        items: orderItems,
        subtotal,
        deliveryFee,
        total,
        delivery: deliveryData,
        notes: input.notes ? input.notes.trim().slice(0, 300) : '',
        paymentMethod: input.paymentMethod,
        transferRef: input.paymentMethod === 'transfer' ? (input.transferRef || '').trim() : '',
        paymentStatus: 'unpaid',
        status: 'new',
        statusLog: [
          {
            status: 'new',
            at: Date.now(),
            by: isPhoneOrder ? (currentUser?.uid || 'staff') : 'customer',
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.set(orderRef, orderPayload);

      // If customer order, update user document with lastOrderAt (rate-limiting in rules)
      if (!isPhoneOrder && currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        tx.update(userRef, {
          lastOrderAt: serverTimestamp(),
        });
      }
    });

    return {
      orderId: orderRef.id,
      orderNumber,
      total,
    };
  } catch (err: any) {
    console.error('placeOrder transaction error:', err);
    const code = err?.code || '';
    const message = err?.message || '';

    if (code === 'permission-denied' || message.includes('permission-denied') || message.includes('PERMISSION_DENIED')) {
      throw new Error(
        'مقدرناش نسجل الطلب. اتأكد إن المطعم مفتوح وإن بريدك متفعّل وإن عدّى دقيقتين من آخر طلب'
      );
    }
    if (code === 'resource-exhausted' || message.includes('resource-exhausted') || message.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('الموقع مشغول دلوقتي، جرّب بعد شوية');
    }
    throw err;
  }
}

/**
 * Allows customer to cancel their order only while status == 'new'
 */
export async function cancelCustomerOrder(orderId: string, cancelReason?: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status: 'cancelled',
    cancelReason: cancelReason || 'تم الإلغاء بواسطة العميل',
    statusLog: arrayUnion({
      status: 'cancelled',
      at: Date.now(),
      by: 'customer',
    }),
    updatedAt: serverTimestamp(),
  });
}
