import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  subscribeRestaurantSettings,
  updateRestaurantSettings,
  subscribeDeliveryZones,
  addDeliveryZoneToDb,
  updateDeliveryZone,
  deleteDeliveryZoneFromDb,
  subscribeBranch,
  updateBranchInDb,
  initializeInitialSystemDocumentsOnce,
} from '../../firebase/db';
import { RestaurantSettings, DeliveryZone, Branch } from '../../types';
import { formatPrice } from '../../lib/format';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import {
  Settings,
  Clock,
  MapPin,
  Truck,
  Store,
  Phone,
  MessageCircle,
  CreditCard,
  Banknote,
  Send,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle2,
  Building,
  Database,
  Sparkles,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [openTime, setOpenTime] = useState('11:00');
  const [closeTime, setCloseTime] = useState('02:00');
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);
  const [closedMessage, setClosedMessage] = useState('');
  const [minOrder, setMinOrder] = useState('100');
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);

  // Payment methods
  const [codEnabled, setCodEnabled] = useState(true);
  const [transferEnabled, setTransferEnabled] = useState(true);
  const [transferInstructions, setTransferInstructions] = useState('');

  // Branch fields
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  // Delivery Zone Modal state
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneFee, setZoneFee] = useState('20');
  const [isSavingZone, setIsSavingZone] = useState(false);

  // Subscriptions
  useEffect(() => {
    const unsubSettings = subscribeRestaurantSettings((s) => {
      setSettings(s);
      setNameAr(s.nameAr || '');
      setPhone(s.phone || '');
      setWhatsapp(s.whatsapp || '');
      setOpenTime(s.hours?.open || '11:00');
      setCloseTime(s.hours?.close || '02:00');
      setIsOrderingOpen(s.isOrderingOpen !== false);
      setClosedMessage(s.closedMessage || '');
      setMinOrder(String(s.minOrder || 100));
      setDeliveryEnabled(s.deliveryEnabled !== false);
      setPickupEnabled(s.pickupEnabled !== false);
      setCodEnabled(s.paymentMethods?.cod !== false);
      setTransferEnabled(s.paymentMethods?.transfer !== false);
      setTransferInstructions(s.transferInstructions || '');
    });

    const unsubBranch = subscribeBranch('main', (b) => {
      if (b) {
        setBranch(b);
        setBranchAddress(b.address || '');
        setBranchPhone(b.phone || '');
      }
    });

    const unsubZones = subscribeDeliveryZones((zones) => {
      setDeliveryZones(zones);
    }, false); // include both active and inactive

    return () => {
      unsubSettings();
      unsubBranch();
      unsubZones();
    };
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMsg('عفواً، تعديل الإعدادات العامة متاح فقط للمدير العام (Admin)');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      await updateRestaurantSettings({
        nameAr: nameAr.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        hours: {
          open: openTime,
          close: closeTime,
        },
        isOrderingOpen,
        closedMessage: closedMessage.trim(),
        minOrder: Number(minOrder) || 0,
        deliveryEnabled,
        pickupEnabled,
        paymentMethods: {
          cod: codEnabled,
          transfer: transferEnabled,
        },
        transferInstructions: transferInstructions.trim(),
      });

      // Update main branch
      await updateBranchInDb('main', {
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Settings save error:', err);
      setErrorMsg('تعذر حفظ الإعدادات: ' + (err.message || 'خطأ في الصلاحيات'));
    } finally {
      setIsSaving(false);
    }
  };

  // Zone CRUD
  const handleOpenAddZone = () => {
    setEditingZone(null);
    setZoneName('');
    setZoneFee('20');
    setIsZoneModalOpen(true);
  };

  const handleOpenEditZone = (z: DeliveryZone) => {
    setEditingZone(z);
    setZoneName(z.name);
    setZoneFee(String(z.fee));
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;
    setIsSavingZone(true);

    try {
      if (editingZone) {
        await updateDeliveryZone(editingZone.id, {
          name: zoneName.trim(),
          fee: Number(zoneFee) || 0,
        });
      } else {
        await addDeliveryZoneToDb({
          name: zoneName.trim(),
          fee: Number(zoneFee) || 0,
          active: true,
        });
      }
      setIsZoneModalOpen(false);
    } catch (err: any) {
      setErrorMsg('تعذر حفظ منطقة التوصيل');
    } finally {
      setIsSavingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId: string, zName: string) => {
    if (!confirm(`هل أنت متأكد من حذف منطقة التوصيل "${zName}"؟`)) return;
    try {
      await deleteDeliveryZoneFromDb(zoneId);
    } catch {
      setErrorMsg('تعذر حذف منطقة التوصيل');
    }
  };

  const handleToggleZoneActive = async (zone: DeliveryZone) => {
    try {
      await updateDeliveryZone(zone.id, { active: !zone.active });
    } catch {
      setErrorMsg('تعذر تغيير حالة تفعيل المنطقة');
    }
  };

  // Prompt S6: Admin-only setup button to create missing base documents once
  const [isInitializingDocs, setIsInitializingDocs] = useState(false);
  const [initDocsResult, setInitDocsResult] = useState<string | null>(null);

  const handleInitializeSystemDocs = async () => {
    setIsInitializingDocs(true);
    setInitDocsResult(null);
    setErrorMsg(null);
    try {
      const res = await initializeInitialSystemDocumentsOnce();
      const createdItems: string[] = [];
      if (res.settingsCreated) createdItems.push('الإعدادات (settings/restaurant)');
      if (res.menuCreated) createdItems.push('قائمة الطعام (menu/current)');
      if (res.counterCreated) createdItems.push('عداد الطلبات (counters/orders)');

      if (createdItems.length > 0) {
        setInitDocsResult(`تم إنشاء المستندات الناقصة بنجاح: ${createdItems.join('، ')}`);
      } else {
        setInitDocsResult('جميع المستندات الأساسية (الإعدادات، المنيو، عداد الطلبات) موجودة بالفعل ولا تحتاج لتهيئة.');
      }
    } catch (err: any) {
      console.error('Error initializing system docs:', err);
      setErrorMsg('حدث خطأ أثناء فحص وتهيئة مستندات النظام: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsInitializingDocs(false);
    }
  };

  return (
    <div className="space-y-6 text-start max-w-4xl pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-black text-[#1F2A2E]">
            إعدادات المطعم والتشغيل
          </h1>
          <p className="text-xs text-[#1F2A2E]/60 mt-1">
            التحكم في مواعيد العمل، مناطق التوصيل، بوابات الدفع، وبيانات الفرع
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Setup Button (Prompt S6) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleInitializeSystemDocs}
              disabled={isInitializingDocs}
              className="px-3.5 py-2 bg-[#1E6B64]/10 hover:bg-[#1E6B64]/20 text-[#1E6B64] border border-[#1E6B64]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="فحص وإنشاء المستندات الأساسية الناقصة في قاعدة البيانات (settings/restaurant, menu/current, counters/orders)"
            >
              <Database className="w-4 h-4" />
              <span>{isInitializingDocs ? 'جاري الفحص...' : 'تهيئة مستندات النظام'}</span>
            </button>
          )}

          {saveSuccess && (
            <div className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ الإعدادات بنجاح</span>
            </div>
          )}
        </div>
      </div>

      {initDocsResult && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
          <span>{initDocsResult}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* 1. PROMINENT SWITCH: استقبال الطلبات */}
        <div className="bg-white rounded-3xl border-2 border-[#DDE5E3] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DDE5E3]">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    isOrderingOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                <h2 className="text-lg font-headline font-black text-[#1F2A2E]">
                  استقبال الطلبات (أونلاين وهاتفياً)
                </h2>
              </div>
              <p className="text-xs text-[#1F2A2E]/60 mt-1">
                التحكم اللحظي في فتح أو إغلاق استقبال الأوردرات في المطعم
              </p>
            </div>

            {/* Prominent Switch Button */}
            <button
              type="button"
              onClick={() => setIsOrderingOpen(!isOrderingOpen)}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2 ${
                isOrderingOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-500/20'
                  : 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-500/20'
              }`}
            >
              <span>{isOrderingOpen ? 'مفتوح - نستقبل الطلبات' : 'مغلق - الطلبات متوقفة'}</span>
            </button>
          </div>

          {/* Closed Message */}
          {!isOrderingOpen && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
              <label className="block text-xs font-bold text-amber-950">
                رسالة الإغلاق الموجهة للعملاء (تظهر عند محاولة الطلب)
              </label>
              <input
                type="text"
                value={closedMessage}
                onChange={(e) => setClosedMessage(e.target.value)}
                placeholder="مثال: نعتذر عن استقبال الطلبات حالياً لانتهاء كمية اليوم، ونرحب بكم غداً من 11 صباحاً"
                className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
              />
            </div>
          )}

          {/* Delivery & Pickup on/off + Min order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1F2A2E] block">خدمة التوصيل</span>
                <span className="text-[10px] text-[#1F2A2E]/50">إتاحة الدليفري للعملاء</span>
              </div>
              <input
                type="checkbox"
                checked={deliveryEnabled}
                onChange={(e) => setDeliveryEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#1E6B64] cursor-pointer"
              />
            </div>

            <div className="p-3.5 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1F2A2E] block">الاستلام من الفرع</span>
                <span className="text-[10px] text-[#1F2A2E]/50">إتاحة استلام التيك أواي</span>
              </div>
              <input
                type="checkbox"
                checked={pickupEnabled}
                onChange={(e) => setPickupEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#1E6B64] cursor-pointer"
              />
            </div>

            <div className="p-3.5 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3]">
              <label className="text-xs font-bold text-[#1F2A2E] block mb-1">
                الحد الأدنى للطلب
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full p-1.5 bg-white border border-[#DDE5E3] rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-xs text-[#1F2A2E]/60 whitespace-nowrap">ج.م</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Restaurant Info & Contact */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DDE5E3]">
            <Settings className="w-5 h-5 text-[#1E6B64]" />
            <h2 className="text-base font-headline font-bold text-[#1F2A2E]">
              بيانات المطعم ومواعيد العمل
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                اسم المطعم الرسمي
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  ساعة الفتح
                </label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  ساعة الإغلاق
                </label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                رقم هاتف الاتصال المباشر
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#1E6B64] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                رقم واتساب خدمة العملاء
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-[#1E6B64] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Delivery Zones CRUD */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE5E3]">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#1E6B64]" />
              <h2 className="text-base font-headline font-bold text-[#1F2A2E]">
                مناطق ورسوم التوصيل ({deliveryZones.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={handleOpenAddZone}
              className="py-1.5 px-3 bg-[#1E6B64]/10 text-[#1E6B64] hover:bg-[#1E6B64]/20 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة منطقة توصيل</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {deliveryZones.map((zone) => (
              <div
                key={zone.id}
                className="p-3.5 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-[#1F2A2E]">{zone.name}</div>
                  <div className="text-[11px] text-[#C23B22] font-mono font-bold mt-0.5">
                    رسوم التوصيل: {formatPrice(zone.fee)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleZoneActive(zone)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      zone.active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}
                  >
                    {zone.active ? 'مفعلة' : 'معطلة'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditZone(zone)}
                    className="p-1.5 text-[#1E6B64] hover:bg-[#1E6B64]/10 rounded-lg cursor-pointer"
                    title="تعديل المنطقة"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteZone(zone.id, zone.name)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="حذف المنطقة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Payment Method Toggles */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DDE5E3]">
            <Banknote className="w-5 h-5 text-[#1E6B64]" />
            <div>
              <h2 className="text-base font-headline font-bold text-[#1F2A2E]">
                طرق الدفع المتاحة للعملاء
              </h2>
              <p className="text-[11px] text-[#1F2A2E]/50">
                تفعيل الدفع النقدي والتحويل اليدوي (فودافون كاش / إنستاباي)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* COD Switch */}
            <div className="p-4 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Banknote className="w-5 h-5 text-[#1E6B64]" />
                <div>
                  <div className="text-xs font-bold text-[#1F2A2E]">كاش عند الاستلام</div>
                  <div className="text-[10px] text-[#1F2A2E]/50">سداد نقدي للمندوب أو عند استلام الطلب بالفرع</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#1E6B64] cursor-pointer"
              />
            </div>

            {/* Transfer Switch */}
            <div className="p-4 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-[#1E6B64]" />
                <div>
                  <div className="text-xs font-bold text-[#1F2A2E]">تحويل (فودافون كاش / إنستاباي)</div>
                  <div className="text-[10px] text-[#1F2A2E]/50">تحويل يدوي للرقم وإدخال مرجع المعاملة</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={transferEnabled}
                onChange={(e) => setTransferEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#1E6B64] cursor-pointer"
              />
            </div>
          </div>

          {/* Transfer Instructions Textarea */}
          <div className="space-y-1.5 pt-2 border-t border-[#DDE5E3]">
            <label className="block text-xs font-bold text-[#1F2A2E]">
              تعليمات التحويل (تظهر للعميل في صفحة الدفع):
            </label>
            <textarea
              rows={3}
              maxLength={400}
              value={transferInstructions}
              onChange={(e) => setTransferInstructions(e.target.value)}
              placeholder="مثال: يرجى تحويل إجمالي المبلغ على محفظة فودافون كاش أو إنستاباي على الرقم: 010xxxxxxxx، ثم كتابة رقم العملية بالأسفل للتأكيد."
              className="w-full p-3 bg-[#F5F7F6] border border-[#DDE5E3] rounded-2xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64] leading-relaxed resize-none"
            />
            <p className="text-[10px] text-[#1F2A2E]/50">
              اكتب هنا رقم المحفظة أو حساب إنستاباي والتعليمات التي تظهر للعميل عند اختيار طريقة التحويل.
            </p>
          </div>
        </div>

        {/* 5. Branches List UI */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE5E3]">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-[#1E6B64]" />
              <div>
                <h2 className="text-base font-headline font-bold text-[#1F2A2E]">
                  فروع المطعم المسجلة
                </h2>
                <p className="text-[11px] text-[#1F2A2E]/50">
                  فرع رئيسي واحد حالياً (مهيأ معمارياً للتوسع المستقبلي)
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-[#1F2A2E] flex items-center gap-2">
                <Store className="w-4 h-4 text-[#1E6B64]" />
                <span>{branch?.nameAr || 'الفرع الرئيسي - القلعة'}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                فرع نشط
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#DDE5E3]">
              <div>
                <label className="block text-[11px] font-bold text-[#1F2A2E] mb-1">
                  عنوان الفرع التفصيلي
                </label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="عنوان الفرع"
                  className="w-full p-2 bg-white border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2A2E] mb-1">
                  هاتف الفرع
                </label>
                <input
                  type="tel"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="هاتف الفرع"
                  dir="ltr"
                  className="w-full p-2 bg-white border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        {isAdmin && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-4 px-6 bg-[#1E6B64] hover:bg-[#17534d] active:bg-[#12423d] text-white font-bold rounded-2xl text-sm transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'جاري حفظ التعديلات...' : 'حفظ كافة إعدادات المطعم والتشغيل'}
            </button>
          </div>
        )}
      </form>

      {/* Delivery Zone Modal */}
      <BottomSheetModal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        title={editingZone ? `تعديل منطقة: ${editingZone.name}` : 'إضافة منطقة توصيل جديدة'}
      >
        <form onSubmit={handleSaveZone} className="space-y-4 text-start">
          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
              اسم المنطقة / الحي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="مثال: وسط البلد، الدقي، المنيل..."
              required
              className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
              رسوم التوصيل (ج.م) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={zoneFee}
              onChange={(e) => setZoneFee(e.target.value)}
              placeholder="20"
              required
              className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64] font-mono font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsZoneModalOpen(false)}
              className="px-4 py-2 bg-[#F5F7F6] text-[#1F2A2E] rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSavingZone || !zoneName.trim()}
              className="px-4 py-2 bg-[#1E6B64] hover:bg-[#17534d] text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSavingZone ? 'جاري الحفظ...' : 'حفظ المنطقة'}
            </button>
          </div>
        </form>
      </BottomSheetModal>
    </div>
  );
};
