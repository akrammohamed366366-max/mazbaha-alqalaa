/**
 * Types strictly matching docs/data-model.md v2 for مزبحة القلعة
 * Spark Free Plan: single-doc menu/current, settings.zones map, staff permissions in staff/{uid}
 */

export interface DeliveryZoneItem {
  name: string;
  fee: number;
  active: boolean;
  sortOrder?: number;
}

// For compatibility with UI lists
export interface DeliveryZone extends DeliveryZoneItem {
  id: string;
  branchId?: string;
}

export interface RestaurantSettings {
  nameAr: string;
  phone: string;
  whatsapp: string;
  address?: string;
  hours: {
    open: string;
    close: string;
  };
  isOrderingOpen: boolean;
  closedMessage?: string;
  minOrder: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  paymentMethods: {
    cod: boolean;
    transfer?: boolean;
  };
  transferInstructions?: string;
  zones: Record<string, DeliveryZoneItem>;
  currency?: 'EGP';
}

export interface Branch {
  id: string;
  nameAr: string;
  address: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface MenuItemVariant {
  id: string;
  label: string;
  price: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl?: string;
  tags: string[];
  sortOrder: number;
  active: boolean;
  available: boolean;
  featured?: boolean;
  variants: MenuItemVariant[];
}

export interface Offer {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  price?: number;
  active: boolean;
  sortOrder: number;
}

export interface MenuDocument {
  categories: Category[];
  items: MenuItem[];
  offers: Offer[];
  updatedAt?: any;
}

export type StaffRole = 'admin' | 'staff' | 'manager' | 'cashier' | 'kitchen' | 'driver';
export type StaffPreset = 'admin' | 'manager' | 'cashier' | 'kitchen' | 'driver' | 'custom';

export interface StaffPermissions {
  orders_view?: boolean;
  orders_manage?: boolean;
  orders_create?: boolean;
  payments_confirm?: boolean;
  assign_driver?: boolean;
  kitchen?: boolean;
  driver?: boolean;
  menu_manage?: boolean;
  reports_view?: boolean;
  settings_manage?: boolean;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  preset: StaffPreset;
  permissions: StaffPermissions;
  active: boolean;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
}

export type OrderStatus =
  | 'pending_payment'
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'transfer' | 'card' | 'wallet';

export interface OrderItem {
  itemId: string;
  name: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  note?: string;
}

export interface OrderDeliveryAddress {
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: number;
  ownerId?: string | null;
  branchId: 'main';
  source: 'web' | 'phone';
  customer: {
    name: string;
    phone: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  delivery: {
    type: 'delivery' | 'pickup';
    zoneId?: string | null;
    zoneName?: string | null;
    address?: OrderDeliveryAddress | null;
  };
  notes?: string;
  paymentMethod: PaymentMethod;
  transferRef?: string;
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  status: OrderStatus;
  statusLog: {
    status: OrderStatus;
    at: number;
    by: string;
  }[];
  cancelReason?: string;
  driverId?: string | null;
  driverName?: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile {
  name: string;
  phone: string;
  email?: string;
  addresses: OrderDeliveryAddress[];
  createdAt?: any;
  lastLoginAt?: any;
  lastOrderAt?: any;
}

export interface StoredCartLine {
  itemId: string;
  variantId: string;
  qty: number;
  note?: string;
}

export interface CartItem {
  id: string; // unique item-variant key
  itemId: string;
  name: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  note?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  isFound?: boolean;
  isValid?: boolean;
  invalidReason?: string;
}
