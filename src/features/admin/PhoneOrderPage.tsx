import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../app/providers/StoreContext';
import { placeOrder, PlaceOrderResult } from '../../firebase/orders';
import { getOrderById } from '../../firebase/db';
import { formatPrice } from '../../lib/format';
import { MenuItem, MenuItemVariant, OrderRecord } from '../../types';
import { OrderReceiptPrint } from '../../components/admin/OrderReceiptPrint';
import {
  PhoneCall,
  Search,
  Plus,
  Minus,
  Trash2,
  Bike,
  Store,
  CheckCircle2,
  AlertCircle,
  Printer,
  Send,
  Banknote,
  ArrowRight,
} from 'lucide-react';

interface BasketItem {
  id: string; // itemId-variantId
  itemId: string;
  name: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  note?: string;
}

export const PhoneOrderPage: React.FC = () => {
  const { menuItems, categories, deliveryZones } = useStore();
  const navigate = useNavigate();

  // Active items and categories
  const activeCategories = categories.filter((c) => c.active !== false);
  const activeItems = menuItems.filter((i) => i.active !== false && i.available !== false);

  // Form Fields
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [zoneId, setZoneId] = useState<string>(deliveryZones[0]?.id || '');
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'transfer'>('cod');

  // Menu browser state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // Selected item to configure variant / note before adding
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemNote, setItemNote] = useState('');

  // Basket lines
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success dialog state
  const [successResult, setSuccessResult] = useState<PlaceOrderResult | null>(null);
  const [createdOrderRecord, setCreatedOrderRecord] = useState<OrderRecord | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Calculation
  const selectedZone = deliveryZones.find((z) => z.id === zoneId) || deliveryZones[0];
  const deliveryFee = deliveryType === 'delivery' ? selectedZone?.fee || 20 : 0;
  const subtotal = basket.reduce((sum, line) => sum + line.lineTotal, 0);
  const total = subtotal + deliveryFee;

  // Filter menu items by search and category
  const filteredItems = activeItems.filter((item) => {
    const matchesCat = selectedCat === 'all' || item.categoryId === selectedCat;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Open item configurator
  const handleOpenItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedVariant(item.variants?.[0] || null);
    setItemQty(1);
    setItemNote('');
  };

  // Add configured item to basket
  const handleAddConfiguredItem = () => {
    if (!selectedItem || !selectedVariant) return;

    const key = `${selectedItem.id}-${selectedVariant.id}`;
    setBasket((prev) => {
      const existingIndex = prev.findIndex((b) => b.id === key);
      if (existingIndex > -1) {
        return prev.map((b, idx) =>
          idx === existingIndex
            ? {
                ...b,
                qty: Math.min(20, b.qty + itemQty),
                lineTotal: Math.min(20, b.qty + itemQty) * b.unitPrice,
                note: itemNote.trim() || b.note,
              }
            : b
        );
      }

      return [
        ...prev,
        {
          id: key,
          itemId: selectedItem.id,
          name: selectedItem.name,
          variantId: selectedVariant.id,
          variantLabel: selectedVariant.label,
          unitPrice: selectedVariant.price,
          qty: itemQty,
          lineTotal: selectedVariant.price * itemQty,
          note: itemNote.trim() || undefined,
        },
      ];
    });

    setSelectedItem(null);
  };

  // Stepper adjustments in basket
  const handleUpdateQty = (key: string, delta: number) => {
    setBasket((prev) =>
      prev
        .map((b) => {
          if (b.id !== key) return b;
          const newQty = b.qty + delta;
          if (newQty <= 0) return null;
          return {
            ...b,
            qty: Math.min(20, newQty),
            lineTotal: Math.min(20, newQty) * b.unitPrice,
          };
        })
        .filter(Boolean) as BasketItem[]
    );
  };

  const handleRemoveLine = (key: string) => {
    setBasket((prev) => prev.filter((b) => b.id !== key));
  };

  // Phone validation with exact message
  const validatePhone = (value: string): boolean => {
    const regex = /^01[0125][0-9]{8}$/;
    if (!regex.test(value.trim())) {
      setPhoneError('رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  // Submit order via placeOrder callable
  const handleSubmitPhoneOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate name
    if (!callerName.trim()) {
      setFormError('يرجى إدخال اسم العميل');
      return;
    }

    // Validate phone
    if (!validatePhone(callerPhone)) {
      return;
    }

    // Validate basket
    if (basket.length === 0) {
      setFormError('يرجى اختيار صنف واحد على الأقل للطلب');
      return;
    }

    // Validate address if delivery
    if (deliveryType === 'delivery') {
      if (!street.trim()) {
        setFormError('يرجى إدخال اسم الشارع والعنوان بالتفصيل');
        return;
      }
      if (!zoneId) {
        setFormError('يرجى اختيار منطقة التوصيل');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await placeOrder({
        source: 'phone',
        customer: {
          name: callerName.trim(),
          phone: callerPhone.trim(),
        },
        items: basket.map((b) => ({
          itemId: b.itemId,
          variantId: b.variantId,
          qty: b.qty,
          note: b.note || undefined,
        })),
        delivery: {
          type: deliveryType,
          zoneId: deliveryType === 'delivery' ? zoneId : undefined,
          zoneName: deliveryType === 'delivery' ? selectedZone?.name : undefined,
          address:
            deliveryType === 'delivery'
              ? {
                  street: street.trim(),
                  building: building.trim() || undefined,
                  floor: floor.trim() || undefined,
                  apartment: apartment.trim() || undefined,
                  landmark: landmark.trim() || undefined,
                }
              : undefined,
        },
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      setSuccessResult(res);

      // Fetch created order record for print modal
      if (res.orderId) {
        try {
          const rec = await getOrderById(res.orderId);
          setCreatedOrderRecord(rec);
        } catch {
          // If offline or delayed, we will use basic details
        }
      }
    } catch (err: any) {
      console.error('placeOrder error:', err);
      const code = err.code;
      const msg = err.message || '';

      if (code === 'failed-precondition' || msg.includes('failed-precondition')) {
        if (msg.includes('closed') || msg.includes('Ordering is currently closed')) {
          setFormError('نظام استقبال الطلبات مغلق حالياً بالإعدادات');
        } else if (msg.includes('unavailable')) {
          setFormError('أحد الأصناف المطلوبة غير متاح حالياً');
        } else if (msg.includes('Minimum order') || msg.includes('minOrder')) {
          setFormError('قيمة الطلب أقل من الحد الأدنى المسموح به');
        } else {
          setFormError('تعذر إتمام الطلب: الشروط غير مستوفاة');
        }
      } else if (code === 'invalid-argument' || msg.includes('invalid-argument')) {
        setFormError('يرجى التأكد من صحة بيانات الطلب ورقم الهاتف وعنوان التوصيل');
      } else {
        setFormError('حدث خطأ أثناء إرسال الطلب، يرجى إعادة المحاولة');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form for new order
  const handleResetForNew = () => {
    setCallerName('');
    setCallerPhone('');
    setPhoneError(null);
    setStreet('');
    setBuilding('');
    setFloor('');
    setApartment('');
    setLandmark('');
    setNotes('');
    setBasket([]);
    setSuccessResult(null);
    setCreatedOrderRecord(null);
    setFormError(null);
  };

  return (
    <div className="space-y-6 text-start">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-black text-[#1F2A2E]">
            تسجيل طلب تليفوني جديد
          </h1>
          <p className="text-xs text-[#1F2A2E]/60 mt-1">
            استقبال أوردرات الهاتف والكول سنتر وحفظها مباشرة عبر النظام
          </p>
        </div>
      </div>

      {/* Two Column Layout: Menu on one side, Order on the other */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Menu Picker (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#DDE5E3] p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-base text-[#1F2A2E]">
              قائمة أصناف المشويات
            </h2>
            <span className="text-xs text-[#1F2A2E]/50">
              {filteredItems.length} صنف متاح
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#1F2A2E]/40 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كباب، كفتة، ريش، طرب..."
              className="w-full pr-10 pl-4 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
            />
          </div>

          {/* Categories Horizontal Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCat('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                selectedCat === 'all'
                  ? 'bg-[#1E6B64] text-white shadow-xs'
                  : 'bg-[#F5F7F6] text-[#1F2A2E]/70 hover:bg-[#DDE5E3]'
              }`}
            >
              الكل
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedCat === cat.id
                    ? 'bg-[#1E6B64] text-white shadow-xs'
                    : 'bg-[#F5F7F6] text-[#1F2A2E]/70 hover:bg-[#DDE5E3]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-[#1F2A2E]/40 text-xs">
                لا توجد أصناف مطابقة للبحث
              </div>
            ) : (
              filteredItems.map((item) => {
                const minPrice = Math.min(...item.variants.map((v) => v.price));

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] flex flex-col justify-between space-y-2 hover:border-[#1E6B64]/50 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#1F2A2E] leading-snug">
                        {item.name}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-[#1F2A2E]/60 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#DDE5E3] flex items-center justify-between">
                      <span className="font-headline font-bold text-xs text-[#C23B22]">
                        من {formatPrice(minPrice)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenItem(item)}
                        className="px-3 py-1.5 bg-[#1E6B64] hover:bg-[#17534d] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>اختيار الحجم</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Left Column: Order Form & Basket (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#DDE5E3] p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE5E3]">
            <h2 className="font-headline font-bold text-base text-[#1F2A2E]">
              تفاصيل الأوردر التليفوني
            </h2>
            <span className="text-xs font-bold text-[#1E6B64] font-mono">
              {basket.length} أصناف
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPhoneOrder} className="space-y-4">
            {/* Delivery / Pickup Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3]">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  deliveryType === 'delivery'
                    ? 'bg-[#1E6B64] text-white shadow-xs'
                    : 'text-[#1F2A2E]/70 hover:text-[#1F2A2E]'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>توصيل دليفري</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  deliveryType === 'pickup'
                    ? 'bg-[#1E6B64] text-white shadow-xs'
                    : 'text-[#1F2A2E]/70 hover:text-[#1F2A2E]'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>استلام من الفرع</span>
              </button>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                اسم العميل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={80}
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="اسم العميل المتصل"
                required
                className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
              />
            </div>

            {/* Customer Phone (Egyptian regex) */}
            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                رقم الموبايل <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                maxLength={11}
                value={callerPhone}
                onChange={(e) => {
                  setCallerPhone(e.target.value);
                  if (phoneError) validatePhone(e.target.value);
                }}
                onBlur={(e) => validatePhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                required
                className={`w-full p-2.5 bg-[#F5F7F6] border rounded-xl text-xs text-[#1F2A2E] focus:outline-none ${
                  phoneError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[#DDE5E3] focus:border-[#1E6B64]'
                }`}
              />
              {phoneError && (
                <p className="text-[11px] text-red-600 mt-1 font-bold">
                  {phoneError}
                </p>
              )}
            </div>

            {/* Delivery address fields */}
            {deliveryType === 'delivery' && (
              <div className="space-y-3 pt-2 border-t border-[#DDE5E3]">
                {/* Zone dropdown */}
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    منطقة التوصيل <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64] cursor-pointer"
                  >
                    {deliveryZones
                      .filter((z) => z.active !== false)
                      .map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} ({formatPrice(zone.fee)})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Street address */}
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    اسم الشارع والحي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="الشارع، المربع السكني..."
                    required
                    className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                  />
                </div>

                {/* Building, floor, apartment */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-[#1F2A2E]/70 mb-1">رقم العمارة</label>
                    <input
                      type="text"
                      maxLength={40}
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                      placeholder="12"
                      className="w-full p-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#1F2A2E]/70 mb-1">الدور</label>
                    <input
                      type="text"
                      maxLength={20}
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="3"
                      className="w-full p-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#1F2A2E]/70 mb-1">الشقة</label>
                    <input
                      type="text"
                      maxLength={20}
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                      placeholder="6"
                      className="w-full p-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                    />
                  </div>
                </div>

                {/* Landmark */}
                <div>
                  <label className="block text-[11px] text-[#1F2A2E]/70 mb-1">علامة مميزة</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="بجوار مسجد، أمام مدرسة..."
                    className="w-full p-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                  />
                </div>
              </div>
            )}

            {/* Payment Method Options: كاش / تحويل */}
            <div className="pt-2 border-t border-[#DDE5E3]">
              <label className="block text-xs font-bold text-[#1F2A2E] mb-2">
                طريقة الدفع
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-[#1E6B64] bg-[#1E6B64]/10 text-[#1E6B64] ring-1 ring-[#1E6B64]'
                      : 'border-[#DDE5E3] bg-[#F5F7F6] text-[#1F2A2E]/70'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>كاش عند الاستلام</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'transfer'
                      ? 'border-[#1E6B64] bg-[#1E6B64]/10 text-[#1E6B64] ring-1 ring-[#1E6B64]'
                      : 'border-[#DDE5E3] bg-[#F5F7F6] text-[#1F2A2E]/70'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>تحويل / محفظة</span>
                </button>
              </div>
            </div>

            {/* Customer Notes */}
            <div>
              <label className="block text-[11px] font-bold text-[#1F2A2E] mb-1">
                ملاحظات عامة للطلب (حد أقصى 300 حرف)
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: زيادة طحينة، سلطة بلدي حارة، الاتصال عند الوصول..."
                className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
              />
            </div>

            {/* Selected Basket Lines Preview */}
            <div className="pt-2 border-t border-[#DDE5E3] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#1F2A2E]">
                <span>أصناف الطلب المختارة:</span>
                <span>{basket.length} صنف</span>
              </div>

              {basket.length === 0 ? (
                <div className="p-4 bg-[#F5F7F6] rounded-2xl border border-dashed border-[#DDE5E3] text-center text-xs text-[#1F2A2E]/50">
                  السلة فارغة. اختر أصناف المشويات من القائمة على اليمين.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto p-1">
                  {basket.map((line) => (
                    <div
                      key={line.id}
                      className="p-3 bg-[#F5F7F6] rounded-xl border border-[#DDE5E3] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold text-[#1F2A2E]">
                        <span>{line.name}</span>
                        <span>{formatPrice(line.lineTotal)}</span>
                      </div>

                      <div className="text-[11px] text-[#1F2A2E]/60 flex justify-between">
                        <span>الحجم: {line.variantLabel}</span>
                        <span>سعر الوحدة: {formatPrice(line.unitPrice)}</span>
                      </div>

                      {line.note && (
                        <div className="text-[10px] text-amber-900 bg-amber-50 p-1 rounded">
                          ملاحظة: {line.note}
                        </div>
                      )}

                      {/* Stepper & remove */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-[#DDE5E3] p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(line.id, -1)}
                            className="p-1 text-[#1F2A2E]/60 hover:text-red-600 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold font-mono px-2">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(line.id, 1)}
                            className="p-1 text-[#1F2A2E]/60 hover:text-[#1E6B64] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="حذف الصنف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary Totals */}
            <div className="pt-3 border-t border-[#DDE5E3] space-y-1 text-xs">
              <div className="flex justify-between text-[#1F2A2E]/70">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{formatPrice(subtotal)}</span>
              </div>

              {deliveryType === 'delivery' && (
                <div className="flex justify-between text-[#1F2A2E]/70">
                  <span>خدمة التوصيل ({selectedZone?.name}):</span>
                  <span className="font-mono">{formatPrice(deliveryFee)}</span>
                </div>
              )}

              <div className="flex justify-between font-headline font-bold text-base text-[#C23B22] pt-2 border-t border-[#DDE5E3]">
                <span>الإجمالي:</span>
                <span className="font-mono">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || basket.length === 0}
              className="w-full py-3.5 px-4 bg-[#1E6B64] hover:bg-[#17534d] active:bg-[#12423d] text-white font-bold rounded-2xl text-sm transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري تسجيل الطلب بالسيرفر...' : 'تسجيل وتأكيد الطلب التليفوني'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Item Variant / Note Configurator Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-[#1F2A2E]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 text-start border border-[#DDE5E3] shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDE5E3]">
              <div className="font-headline font-bold text-base text-[#1F2A2E]">
                {selectedItem.name}
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-xs text-[#1F2A2E]/50 hover:text-[#1F2A2E]"
              >
                إلغاء
              </button>
            </div>

            {/* Variants Radio Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1F2A2E]">اختر الوزن / الحجم:</label>
              <div className="space-y-1.5">
                {selectedItem.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`w-full p-2.5 rounded-xl border text-start flex items-center justify-between transition-colors cursor-pointer ${
                      selectedVariant?.id === v.id
                        ? 'border-[#1E6B64] bg-[#1E6B64]/5 ring-1 ring-[#1E6B64]'
                        : 'border-[#DDE5E3] hover:bg-[#F5F7F6]'
                    }`}
                  >
                    <span className="text-xs font-bold text-[#1F2A2E]">{v.label}</span>
                    <span className="text-xs font-headline font-bold text-[#C23B22]">
                      {formatPrice(v.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-[#1F2A2E]">الكمية المطلوبة:</span>
              <div className="flex items-center gap-3 bg-[#F5F7F6] rounded-xl border border-[#DDE5E3] p-1">
                <button
                  type="button"
                  onClick={() => setItemQty((q) => Math.max(1, q - 1))}
                  className="p-1 hover:text-red-600 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold font-mono px-2">{itemQty}</span>
                <button
                  type="button"
                  onClick={() => setItemQty((q) => Math.min(20, q + 1))}
                  className="p-1 hover:text-[#1E6B64] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Item Note */}
            <div>
              <label className="block text-[11px] text-[#1F2A2E]/70 mb-1">
                ملاحظات الصنف (تسوية، سلطات...)
              </label>
              <input
                type="text"
                maxLength={200}
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="مثال: تسوية زيادة، بقدونس إضافي..."
                className="w-full p-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
              />
            </div>

            {/* Add Button */}
            <button
              type="button"
              onClick={handleAddConfiguredItem}
              className="w-full py-3 bg-[#1E6B64] hover:bg-[#17534d] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              إضافة للأوردر ({formatPrice((selectedVariant?.price || 0) * itemQty)})
            </button>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {successResult && (
        <div className="fixed inset-0 z-50 bg-[#1F2A2E]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-5 border border-[#DDE5E3] shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="font-headline font-black text-2xl text-[#1F2A2E]">
                تم تسجيل الطلب #{successResult.orderNumber} بنجاح!
              </h3>
              <p className="text-xs text-[#1F2A2E]/60 mt-1">
                تم حفظ الطلب بالسيرفر وتوجيهه لشاشة المطبخ والشواية مباشرة
              </p>
              <div className="text-sm font-bold text-[#C23B22] font-mono mt-2">
                إجمالي الحساب: {formatPrice(successResult.total)}
              </div>
            </div>

            {/* Actions: Print receipt, Go to Live Orders, Create Another */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="w-full py-3 bg-[#1E6B64] hover:bg-[#17534d] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة فاتورة 80 مم للطلب</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin/orders')}
                  className="py-2.5 px-4 bg-[#F5F7F6] hover:bg-[#DDE5E3] text-[#1F2A2E] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  الذهاب للطلبات الحية
                </button>

                <button
                  type="button"
                  onClick={handleResetForNew}
                  className="py-2.5 px-4 bg-[#1F2A2E] hover:bg-[#28363B] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  تسجيل طلب جديد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print View Modal */}
      {showPrintModal && createdOrderRecord && (
        <OrderReceiptPrint
          order={createdOrderRecord}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
