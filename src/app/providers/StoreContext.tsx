import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  RestaurantSettings,
  Branch,
  DeliveryZone,
  Category,
  MenuItem,
  MenuItemVariant,
  OrderRecord,
  StaffUser,
  CartItem,
  StoredCartLine,
  OrderStatus,
  Offer,
  MenuDocument,
} from '../../types';
import {
  MOCK_SETTINGS,
  MOCK_BRANCH,
  MOCK_DELIVERY_ZONES,
  MOCK_CATEGORIES,
  MOCK_MENU_ITEMS,
  MOCK_ORDERS,
  MOCK_STAFF,
} from '../../lib/mockData';
import {
  subscribeRestaurantSettings,
  updateRestaurantSettings as updateRestaurantSettingsInDb,
  subscribeMenu,
  updateMenuItemInMenu,
  addMenuItemInMenu,
  deleteMenuItemInMenu,
  updateDeliveryZoneInSettings,
  deleteDeliveryZoneFromSettings,
  subscribeLiveOrders,
  updateOrderStatusInDb,
  DEFAULT_SETTINGS,
  DEFAULT_MENU,
} from '../../firebase/db';

const CART_STORAGE_KEY = 'mz_cart_v1';

interface StoreContextType {
  settings: RestaurantSettings;
  updateSettings: (newSettings: Partial<RestaurantSettings>) => void;
  branch: Branch;
  rawMenu: MenuDocument;
  categories: Category[];
  menuItems: MenuItem[];
  offers: Offer[];
  isMenuLoading: boolean;
  menuError: string | null;
  retryLoadMenu: () => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  deleteMenuItem: (id: string) => void;
  deliveryZones: DeliveryZone[];
  updateDeliveryZone: (id: string, updates: Partial<DeliveryZone>) => void;
  orders: OrderRecord[];
  updateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    driverInfo?: { driverId?: string; driverName?: string; cancelReason?: string }
  ) => void;
  createOrder: (orderData: Partial<OrderRecord>) => OrderRecord;
  staffList: StaffUser[];
  addStaff: (user: Omit<StaffUser, 'id'>) => void;
  updateStaff: (id: string, updates: Partial<StaffUser>) => void;
  deleteStaff: (id: string) => void;
  currentStaff: StaffUser | null;
  setCurrentStaff: (staff: StaffUser | null) => void;
  // Cart
  cart: CartItem[];
  hasUnavailableItems: boolean;
  addToCart: (item: MenuItem, variant: MenuItemVariant, qty?: number, note?: string) => void;
  updateCartQty: (cartId: string, qty: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  // Selected Dish modal/bottom sheet
  selectedDish: MenuItem | null;
  setSelectedDish: (dish: MenuItem | null) => void;
  // Global Toast
  toast: { message: string; type?: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Helper to safely read cart lines from localStorage (contains ONLY ids, quantities, notes. NO PRICES.)
function getInitialStoredCart(): StoredCartLine[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p: any) => ({
          itemId: String(p.itemId || ''),
          variantId: String(p.variantId || ''),
          qty: Math.max(1, Math.min(20, Number(p.qty) || 1)),
          note: typeof p.note === 'string' ? p.note.slice(0, 200) : '',
        }))
        .filter((line) => line.itemId && line.variantId);
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS);
  const [branch, setBranch] = useState<Branch>(MOCK_BRANCH);
  const [rawMenu, setRawMenu] = useState<MenuDocument>(DEFAULT_MENU);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_MENU.categories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU.items);
  const [offers, setOffers] = useState<Offer[]>(DEFAULT_MENU.offers);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(MOCK_DELIVERY_ZONES);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>(MOCK_STAFF);
  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(MOCK_STAFF[0]);

  // Loading and error states for Firestore menu sync
  const [isMenuLoading, setIsMenuLoading] = useState<boolean>(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Dish details modal
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);

  // Global Toast
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ===================================================================
  // Realtime Firestore Subscriptions: EXACTLY 2 reads for customer session:
  // 1. settings/restaurant (includes zones map)
  // 2. menu/current (categories, items, offers)
  // ===================================================================
  const [retryCounter, setRetryCounter] = useState(0);
  const retryLoadMenu = useCallback(() => {
    setIsMenuLoading(true);
    setMenuError(null);
    setRetryCounter((c) => c + 1);
  }, []);

  // Prompt S6: Global friendly banner for customers when Firebase hits quota or is unavailable
  useEffect(() => {
    const handleServiceBusy = () => {
      setMenuError('الموقع مشغول دلوقتي، جرّب بعد شوية');
    };
    window.addEventListener('firebase-quota-exhausted', handleServiceBusy);
    window.addEventListener('firebase-service-unavailable', handleServiceBusy);
    return () => {
      window.removeEventListener('firebase-quota-exhausted', handleServiceBusy);
      window.removeEventListener('firebase-service-unavailable', handleServiceBusy);
    };
  }, []);

  useEffect(() => {
    setIsMenuLoading(true);
    setMenuError(null);

    // 1. Settings subscription (includes zones map)
    const unsubSettings = subscribeRestaurantSettings(
      (data) => {
        if (data) {
          setSettings(data);
          // Convert settings.zones map to UI list
          const zoneList: DeliveryZone[] = Object.entries(data.zones || {}).map(([id, z]) => ({
            id,
            name: z.name,
            fee: z.fee,
            active: z.active,
            sortOrder: z.sortOrder,
            branchId: 'main',
          })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setDeliveryZones(zoneList);

          // Prompt S6: Update Schema.org JSON-LD dynamically from settings
          try {
            let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
            if (!script) {
              script = document.createElement('script');
              script.type = 'application/ld+json';
              document.head.appendChild(script);
            }
            const schemaObj = {
              '@context': 'https://schema.org',
              '@type': 'Restaurant',
              name: data.nameAr || 'مذبحة القلعة',
              image: `${import.meta.env.BASE_URL}og-image.jpg`,
              description: 'مطعم مشويات على الفحم البلدي: كباب وكفتة وريش وطرب ودجاج مشوي مع توصيل أونلاين.',
              servesCuisine: 'Egyptian',
              priceRange: '$$',
              address: {
                '@type': 'PostalAddress',
                streetAddress: data.address || 'شارع صلاح سالم، بجوار قلعة صلاح الدين',
                addressLocality: 'القاهرة',
                addressRegion: 'القاهرة',
                addressCountry: 'EG',
              },
              telephone: data.phone ? `+2${data.phone}` : '+201000000000',
              openingHoursSpecification: [
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                  opens: data.hours?.open || '12:00',
                  closes: data.hours?.close || '02:00',
                },
              ],
              hasMenu: '/menu',
            };
            script.textContent = JSON.stringify(schemaObj, null, 2);
          } catch (err) {
            console.warn('Failed to sync JSON-LD schema:', err);
          }
        }
      },
      (err) => {
        console.warn('subscribeRestaurantSettings error:', err.message);
        const errAny = err as any;
        if (
          errAny.code === 'resource-exhausted' ||
          errAny.code === 'unavailable' ||
          err.message?.includes('resource-exhausted') ||
          err.message?.includes('unavailable') ||
          err.message?.includes('quota')
        ) {
          setMenuError('الموقع مشغول دلوقتي، جرّب بعد شوية');
        }
      }
    );

    // 2. Menu subscription (single document menu/current)
    const unsubMenu = subscribeMenu(
      (menuDoc) => {
        if (menuDoc) {
          setRawMenu(menuDoc);
          setCategories(
            [...(menuDoc.categories || [])]
              .filter((c) => c.active !== false)
              .sort((a, b) => a.sortOrder - b.sortOrder)
          );
          setMenuItems(
            [...(menuDoc.items || [])]
              .filter((i) => i.active !== false)
              .sort((a, b) => a.sortOrder - b.sortOrder)
          );
          setOffers(
            [...(menuDoc.offers || [])]
              .filter((o) => o.active !== false)
              .sort((a, b) => a.sortOrder - b.sortOrder)
          );
        }
        setIsMenuLoading(false);
      },
      (err) => {
        console.warn('Menu load error:', err.message);
        const errAny = err as any;
        const isQuota =
          errAny.code === 'resource-exhausted' ||
          errAny.code === 'unavailable' ||
          err.message?.includes('resource-exhausted') ||
          err.message?.includes('unavailable') ||
          err.message?.includes('quota');

        if (isQuota) {
          setMenuError('الموقع مشغول دلوقتي، جرّب بعد شوية');
        } else {
          setMenuError('الموقع مشغول دلوقتي، جرّب بعد شوية');
        }

        // Graceful offline fallback to DEFAULT_MENU so dishes remain browsable
        setRawMenu((prev) => {
          if (!prev || (prev.items && prev.items.length === 0)) {
            setCategories(DEFAULT_MENU.categories.filter((c) => c.active !== false));
            setMenuItems(DEFAULT_MENU.items.filter((i) => i.active !== false));
            setOffers(DEFAULT_MENU.offers.filter((o) => o.active !== false));
            return DEFAULT_MENU;
          }
          return prev;
        });

        setIsMenuLoading(false);
      }
    );

    return () => {
      unsubSettings();
      unsubMenu();
    };
  }, [retryCounter]);

  // ==========================================
  // Cart State (Persisted in localStorage with ONLY IDs and quantities)
  // ==========================================
  const [storedCartLines, setStoredCartLines] = useState<StoredCartLine[]>(getInitialStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedCartLines));
    } catch {
      // Ignore storage write error
    }
  }, [storedCartLines]);

  // Derive cart items dynamically from realtime menuItems (NO price from localStorage)
  const cart: CartItem[] = useMemo(() => {
    return storedCartLines
      .map((line) => {
        const dish = menuItems.find((item) => item.id === line.itemId);
        if (!dish) {
          return {
            id: `${line.itemId}-${line.variantId}`,
            itemId: line.itemId,
            name: 'صنف غير متوفر حالياً',
            variantId: line.variantId,
            variantLabel: '',
            unitPrice: 0,
            qty: line.qty,
            lineTotal: 0,
            note: line.note,
            isAvailable: false,
            isActive: false,
            isFound: false,
            isValid: false,
            invalidReason: 'تم حذف الصنف من قائمة الطعام',
          };
        }

        const variant = (dish.variants || []).find((v) => v.id === line.variantId);
        if (!variant) {
          return {
            id: `${line.itemId}-${line.variantId}`,
            itemId: dish.id,
            name: dish.name,
            variantId: line.variantId,
            variantLabel: 'خيار غير متاح',
            unitPrice: 0,
            qty: line.qty,
            lineTotal: 0,
            note: line.note,
            imageUrl: dish.imageUrl,
            isAvailable: false,
            isActive: dish.active,
            isFound: true,
            isValid: false,
            invalidReason: 'الحجم المحدد غير متوفر حالياً',
          };
        }

        const isAvail = dish.available !== false;
        const isAct = dish.active !== false;
        const valid = isAvail && isAct;

        return {
          id: `${dish.id}-${variant.id}`,
          itemId: dish.id,
          name: dish.name,
          variantId: variant.id,
          variantLabel: variant.label,
          unitPrice: variant.price,
          qty: line.qty,
          lineTotal: variant.price * line.qty,
          note: line.note,
          imageUrl: dish.imageUrl,
          isAvailable: isAvail,
          isActive: isAct,
          isFound: true,
          isValid: valid,
          invalidReason: !isAvail ? 'الصنف غير متاح اليوم' : !isAct ? 'الصنف متوقف مؤقتاً' : undefined,
        };
      });
  }, [storedCartLines, menuItems]);

  const hasUnavailableItems = useMemo(() => {
    return cart.some((item) => item.isValid === false);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => (item.isValid ? sum + item.lineTotal : sum), 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return storedCartLines.reduce((sum, item) => sum + item.qty, 0);
  }, [storedCartLines]);

  const addToCart = (item: MenuItem, variant: MenuItemVariant, qty = 1, note = '') => {
    setStoredCartLines((prev) => {
      const existingIndex = prev.findIndex(
        (line) => line.itemId === item.id && line.variantId === variant.id
      );

      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = Math.min(20, next[existingIndex].qty + qty);
        next[existingIndex] = {
          ...next[existingIndex],
          qty: newQty,
          note: note ? note.slice(0, 200) : next[existingIndex].note,
        };
        return next;
      }

      return [
        ...prev,
        {
          itemId: item.id,
          variantId: variant.id,
          qty: Math.min(20, Math.max(1, qty)),
          note: note ? note.slice(0, 200) : '',
        },
      ];
    });

    showToast(`تمت إضافة "${item.name}" إلى السلة بنجاح`);
  };

  const updateCartQty = (cartId: string, qty: number) => {
    setStoredCartLines((prev) => {
      if (qty <= 0) {
        return prev.filter((line) => `${line.itemId}-${line.variantId}` !== cartId);
      }
      return prev.map((line) => {
        if (`${line.itemId}-${line.variantId}` === cartId) {
          return { ...line, qty: Math.min(20, Math.max(1, qty)) };
        }
        return line;
      });
    });
  };

  const removeFromCart = (cartId: string) => {
    setStoredCartLines((prev) => prev.filter((line) => `${line.itemId}-${line.variantId}` !== cartId));
    showToast('تم حذف الصنف من السلة', 'info');
  };

  const clearCart = () => {
    setStoredCartLines([]);
  };

  // ==========================================
  // Mutations
  // ==========================================
  const updateSettings = async (newSettings: Partial<RestaurantSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    try {
      await updateRestaurantSettingsInDb(newSettings);
      showToast('تم حفظ الإعدادات بنجاح');
    } catch (e: any) {
      showToast('حدث خطأ أثناء حفظ الإعدادات', 'error');
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      await updateMenuItemInMenu(id, updates);
      showToast('تم تحديث بيانات الصنف');
    } catch {
      showToast('تعذر تحديث الصنف', 'error');
    }
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    try {
      await addMenuItemInMenu(item);
      showToast('تمت إضافة الصنف بنجاح');
    } catch {
      showToast('تعذر إضافة الصنف', 'error');
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      await deleteMenuItemInMenu(id);
      showToast('تم حذف الصنف', 'info');
    } catch {
      showToast('تعذر حذف الصنف', 'error');
    }
  };

  const updateDeliveryZone = async (id: string, updates: Partial<DeliveryZone>) => {
    try {
      const zoneData = {
        name: updates.name || '',
        fee: updates.fee ?? 0,
        active: updates.active ?? true,
        sortOrder: updates.sortOrder ?? 1,
      };
      await updateDeliveryZoneInSettings(id, zoneData);
      showToast('تم تحديث منطقة التوصيل');
    } catch {
      showToast('تعذر تحديث المنطقة', 'error');
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    driverInfo?: { driverId?: string; driverName?: string; cancelReason?: string }
  ) => {
    try {
      await updateOrderStatusInDb(orderId, newStatus, driverInfo);
      showToast('تم تحديث حالة الطلب بنجاح');
    } catch (err: any) {
      showToast('تعذر تحديث حالة الطلب', 'error');
    }
  };

  const createOrder = (orderData: Partial<OrderRecord>): OrderRecord => {
    const newOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber: 1000 + orders.length + 1,
      branchId: 'main',
      source: 'web',
      customer: orderData.customer || { name: 'عميل', phone: '01000000000' },
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      deliveryFee: orderData.deliveryFee || 0,
      total: orderData.total || 0,
      delivery: orderData.delivery || { type: 'pickup' },
      notes: orderData.notes,
      paymentMethod: orderData.paymentMethod || 'cod',
      paymentStatus: 'unpaid',
      status: 'new',
      statusLog: [{ status: 'new', at: Date.now(), by: 'customer' }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const addStaff = (user: Omit<StaffUser, 'id'>) => {
    const newUser: StaffUser = {
      ...user,
      id: `staff-${Date.now()}`,
    };
    setStaffList((prev) => [...prev, newUser]);
  };

  const updateStaff = (id: string, updates: Partial<StaffUser>) => {
    setStaffList((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteStaff = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        updateSettings,
        branch,
        rawMenu,
        categories,
        menuItems,
        offers,
        isMenuLoading,
        menuError,
        retryLoadMenu,
        updateMenuItem,
        addMenuItem,
        deleteMenuItem,
        deliveryZones,
        updateDeliveryZone,
        orders,
        updateOrderStatus,
        createOrder,
        staffList,
        addStaff,
        updateStaff,
        deleteStaff,
        currentStaff,
        setCurrentStaff,
        cart,
        hasUnavailableItems,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
        selectedDish,
        setSelectedDish,
        toast,
        showToast,
        hideToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
