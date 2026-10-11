import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '../../app/providers/StoreContext';
import { useAuth } from '../../hooks/useAuth';
import {
  saveCustomerProfile,
  getCustomerProfile,
  resendVerificationEmail,
  reloadCurrentUser,
} from '../../firebase/auth';
import { placeOrder, PlaceOrderInput } from '../../firebase/orders';
import { Button } from '../../components/ui/Button';
import { formatPrice } from '../../lib/format';
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Phone,
  User as UserIcon,
  Banknote,
  Send,
  AlertCircle,
  Truck,
  Store,
  Clock,
  AlertTriangle,
  FileText,
  LogIn,
  Mail,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/;

const checkoutSchema = z
  .object({
    deliveryType: z.enum(['delivery', 'pickup']),
    name: z
      .string()
      .trim()
      .min(1, 'يرجى إدخال اسم العميل')
      .max(80, 'الاسم طويل جداً (الحد الأقصى 80 حرفاً)'),
    phone: z
      .string()
      .trim()
      .regex(EGYPTIAN_PHONE_REGEX, 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01'),
    zoneId: z.string().optional(),
    street: z.string().optional(),
    building: z.string().max(40, 'رقم العمارة لا يتجاوز 40 حرفاً').optional(),
    floor: z.string().max(20, 'رقم الطابق لا يتجاوز 20 حرفاً').optional(),
    apartment: z.string().max(20, 'رقم الشقة لا يتجاوز 20 حرفاً').optional(),
    landmark: z.string().max(120, 'العلامة المميزة لا تتجاوز 120 حرفاً').optional(),
    paymentMethod: z.enum(['cod', 'transfer']),
    transferRef: z.string().max(40, 'مرجع التحويل لا يتجاوز 40 حرفاً').optional(),
    notes: z
      .string()
      .max(300, 'الملاحظات بحد أقصى 300 حرف')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryType === 'delivery') {
      if (!data.zoneId || data.zoneId.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['zoneId'],
          message: 'يرجى اختيار منطقة التوصيل',
        });
      }
      if (!data.street || data.street.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['street'],
          message: 'يرجى إدخال اسم الشارع والعنوان بالتفصيل',
        });
      } else if (data.street.trim().length > 200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['street'],
          message: 'العنوان طويل جداً (الحد الأقصى 200 حرف)',
        });
      }
    }
    if (data.paymentMethod === 'transfer') {
      if (!data.transferRef || data.transferRef.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transferRef'],
          message: 'يرجى إدخال رقم العملية أو آخر 4 أرقام من رقم التحويل (3 أحرف على الأقل)',
        });
      }
    }
  });

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    cartTotal,
    hasUnavailableItems,
    deliveryZones,
    settings,
    rawMenu,
    clearCart,
  } = useStore();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email verification state
  const isGoogleUser = user?.providerData?.some((p) => p.providerId === 'google.com');
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(
    Boolean(isGoogleUser || user?.emailVerified)
  );
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  // Active delivery zones
  const activeZones = deliveryZones.filter((z) => z.active);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryType: 'delivery',
      paymentMethod: 'cod',
      transferRef: '',
      zoneId: activeZones[0]?.id || '',
      name: user?.displayName || '',
      phone: '',
      street: '',
      building: '',
      floor: '',
      apartment: '',
      landmark: '',
      notes: '',
    },
  });

  // Redirect to login if guest
  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout', { replace: true });
    }
  }, [user, navigate]);

  // Prefill customer profile (name, phone, last address)
  useEffect(() => {
    if (!user?.uid) return;
    setIsEmailVerified(Boolean(isGoogleUser || user.emailVerified));

    getCustomerProfile(user.uid).then((prof) => {
      if (prof) {
        if (prof.name) setValue('name', prof.name);
        if (prof.phone) setValue('phone', prof.phone);
        if (prof.addresses && prof.addresses.length > 0) {
          const last = prof.addresses[prof.addresses.length - 1];
          if (last.street) setValue('street', last.street);
          if (last.building) setValue('building', last.building);
          if (last.floor) setValue('floor', last.floor);
          if (last.apartment) setValue('apartment', last.apartment);
          if (last.landmark) setValue('landmark', last.landmark);
        }
      } else if (user.displayName) {
        setValue('name', user.displayName);
      }
    });
  }, [user?.uid, isGoogleUser, setValue]);

  const handleResendVerification = async () => {
    if (!user) return;
    setResendingVerification(true);
    setVerificationNotice(null);
    try {
      await resendVerificationEmail(user);
      setVerificationNotice('تم إرسال رابط تأكيد جديد إلى بريدك الإلكتروني.');
    } catch {
      setVerificationNotice('تعذر إرسال الرابط، يرجى الانتظار دقيقة والمحاولة ثانية.');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleCheckReload = async () => {
    if (!user) return;
    setCheckingVerification(true);
    setVerificationNotice(null);
    try {
      const verified = await reloadCurrentUser(user);
      setIsEmailVerified(Boolean(verified || isGoogleUser));
      if (verified) {
        setVerificationNotice('تم تأكيد البريد الإلكتروني بنجاح!');
      } else {
        setVerificationNotice('لم يتم تأكيد البريد بعد، اضغط على الرابط في الرسالة.');
      }
    } catch {
      setVerificationNotice('حدث خطأ أثناء فحص حالة التفعيل.');
    } finally {
      setCheckingVerification(false);
    }
  };

  const deliveryType = watch('deliveryType');
  const selectedZoneId = watch('zoneId');
  const paymentMethod = watch('paymentMethod');
  const notesValue = watch('notes') || '';

  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId);
  const deliveryFee = deliveryType === 'delivery' ? selectedZone?.fee || 0 : 0;
  const finalTotal = cartTotal + deliveryFee;

  const isOrderingOpen = settings.isOrderingOpen !== false;
  const isBelowMinOrder = cartTotal < (settings.minOrder || 0);

  const onSubmit = async (data: CheckoutFormData) => {
    setServerError(null);

    if (!user) {
      setServerError('يرجى تسجيل الدخول أولاً لإتمام طلبك.');
      return;
    }

    if (!isOrderingOpen) {
      setServerError('عذراً، استقبال الطلبات متوقف حالياً.');
      return;
    }

    if (hasUnavailableItems) {
      setServerError('بعض الأصناف في سلتك لم تعد متوفرة. يرجى مراجعة السلة أولاً.');
      return;
    }

    if (isBelowMinOrder) {
      setServerError(`الحد الأدنى للطلب هو ${formatPrice(settings.minOrder)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload: PlaceOrderInput = {
        source: 'web',
        customer: {
          name: data.name.trim(),
          phone: data.phone.trim(),
        },
        items: cart.map((c) => ({
          itemId: c.itemId,
          variantId: c.variantId,
          qty: c.qty,
          note: c.note ? c.note.slice(0, 200) : '',
        })),
        delivery: {
          type: data.deliveryType,
          zoneId: data.deliveryType === 'delivery' ? data.zoneId : undefined,
          zoneName: data.deliveryType === 'delivery' ? selectedZone?.name : undefined,
          address:
            data.deliveryType === 'delivery'
              ? {
                  street: (data.street || '').trim(),
                  building: (data.building || '').trim().slice(0, 40),
                  floor: (data.floor || '').trim().slice(0, 20),
                  apartment: (data.apartment || '').trim().slice(0, 20),
                  landmark: (data.landmark || '').trim().slice(0, 120),
                }
              : undefined,
        },
        paymentMethod: data.paymentMethod,
        transferRef: data.paymentMethod === 'transfer' ? data.transferRef : '',
        notes: data.notes ? data.notes.trim().slice(0, 300) : '',
        currentMenu: rawMenu,
        currentSettings: settings,
      };

      // Client-side transaction (Spark Plan compliant)
      const result = await placeOrder(orderPayload);

      // Save customer profile to users/{uid}
      if (user?.uid) {
        try {
          await saveCustomerProfile(user.uid, {
            name: data.name.trim(),
            phone: data.phone.trim(),
            addresses:
              data.deliveryType === 'delivery' && data.street
                ? [
                    {
                      street: data.street.trim(),
                      building: data.building?.trim() || '',
                      floor: data.floor?.trim() || '',
                      apartment: data.apartment?.trim() || '',
                      landmark: data.landmark?.trim() || '',
                    },
                  ]
                : [],
          });
        } catch (profileErr) {
          console.warn('Could not save customer profile:', profileErr);
        }
      }

      // Clear the cart
      clearCart();

      // Navigate to tracking page
      navigate(`/order/${result.orderId}`);
    } catch (err: any) {
      console.error('placeOrder error:', err);
      setServerError(err.message || 'حدث خطأ أثناء تسجيل طلبك، يرجى إعادة المحاولة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm font-bold text-[#1F2A2E]">لا توجد عناصر في السلة لإتمام الطلب</p>
        <Button variant="primary" size="md" onClick={() => navigate('/menu')}>
          تصفح قائمة الطعام
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 text-start pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#DDE5E3]">
        <Link
          to="/cart"
          className="p-2 rounded-xl text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-white transition-colors"
          aria-label="العودة للسلة"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-headline font-black text-[#1F2A2E]">
            إتمام الطلب
          </h1>
          <p className="text-xs text-[#1F2A2E]/60">
            تأكيد بيانات الاستلام والحساب مباشرة
          </p>
        </div>
      </div>

      {/* Closed Banner if ordering is closed */}
      {!isOrderingOpen && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <div className="font-bold text-sm">المطعم مغلق حالياً ولا يستقبل طلبات جديدة</div>
            <div className="text-[11px] text-amber-800/80 mt-0.5">
              {settings.closedMessage ||
                `ساعات العمل اليومية من ${settings.hours.open} حتى ${settings.hours.close}`}
            </div>
          </div>
        </div>
      )}

      {/* Customer Authentication Notice if not logged in */}
      {!user && (
        <div className="mt-4 p-5 rounded-3xl bg-white border border-[#1E6B64]/30 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#1E6B64] font-bold text-sm">
            <LogIn className="w-5 h-5" />
            <span>تسجيل الدخول مطلوب لإتمام الطلب</span>
          </div>
          <p className="text-xs text-[#1F2A2E]/70 leading-relaxed">
            لتأكيد طلبك ومتابعة حالته وتوصيله لحظة بلحظة، يرجى تسجيل الدخول إلى حسابك. سلتك محفوظة وستعود إليها مباشرة.
          </p>
          <Link
            to="/login?redirect=/checkout"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#1E6B64] text-white font-bold text-xs hover:bg-[#17544e] transition-colors shadow-sm"
          >
            <span>تسجيل الدخول ومتابعة الطلب</span>
          </Link>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-bold leading-relaxed">{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        {/* Step 1: Delivery vs Pickup */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold font-headline text-[#1F2A2E] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#1E6B64]" />
            <span>طريقة الاستلام</span>
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue('deliveryType', 'delivery', { shouldValidate: true })}
              className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                deliveryType === 'delivery'
                  ? 'border-[#1E6B64] bg-[#1E6B64]/5 text-[#1E6B64] font-bold ring-1 ring-[#1E6B64]'
                  : 'border-[#DDE5E3] hover:border-[#1E6B64]/30 bg-white text-[#1F2A2E]/70'
              }`}
            >
              <Truck className="w-5 h-5" />
              <span className="text-xs">توصيل للعنوان</span>
            </button>

            <button
              type="button"
              onClick={() => setValue('deliveryType', 'pickup', { shouldValidate: true })}
              className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                deliveryType === 'pickup'
                  ? 'border-[#1E6B64] bg-[#1E6B64]/5 text-[#1E6B64] font-bold ring-1 ring-[#1E6B64]'
                  : 'border-[#DDE5E3] hover:border-[#1E6B64]/30 bg-white text-[#1F2A2E]/70'
              }`}
            >
              <Store className="w-5 h-5" />
              <span className="text-xs">استلام من المطعم</span>
            </button>
          </div>
        </div>

        {/* Step 2: Customer Contact Info */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold font-headline text-[#1F2A2E] flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-[#1E6B64]" />
            <span>بيانات العميل</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                الاسم بالكامل <span className="text-[#C23B22]">*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: أحمد محمود"
                maxLength={80}
                {...register('name')}
                className={`w-full px-3.5 py-2.5 bg-[#F5F7F6] border rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none transition-all ${
                  errors.name ? 'border-red-500' : 'border-[#DDE5E3] focus:border-[#1E6B64]'
                }`}
              />
              {errors.name && (
                <p className="text-[11px] text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                رقم الموبايل <span className="text-[#C23B22]">*</span>
              </label>
              <input
                type="tel"
                placeholder="01012345678"
                dir="ltr"
                maxLength={11}
                {...register('phone')}
                className={`w-full px-3.5 py-2.5 bg-[#F5F7F6] border rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none transition-all text-start font-mono ${
                  errors.phone ? 'border-red-500' : 'border-[#DDE5E3] focus:border-[#1E6B64]'
                }`}
              />
              {errors.phone && (
                <p className="text-[11px] text-red-600 mt-1 font-bold">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Address (Only if delivery) */}
        {deliveryType === 'delivery' && (
          <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold font-headline text-[#1F2A2E] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#1E6B64]" />
              <span>عنوان التوصيل</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                منطقة التوصيل <span className="text-[#C23B22]">*</span>
              </label>
              <select
                {...register('zoneId')}
                className={`w-full px-3.5 py-2.5 bg-[#F5F7F6] border rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none transition-all ${
                  errors.zoneId ? 'border-red-500' : 'border-[#DDE5E3] focus:border-[#1E6B64]'
                }`}
              >
                {activeZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — خدمة التوصيل: {formatPrice(z.fee)}
                  </option>
                ))}
              </select>
              {errors.zoneId && (
                <p className="text-[11px] text-red-600 mt-1">{errors.zoneId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                اسم الشارع والمنطقة <span className="text-[#C23B22]">*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: شارع المعز، بجوار مسجد الحاكم"
                maxLength={200}
                {...register('street')}
                className={`w-full px-3.5 py-2.5 bg-[#F5F7F6] border rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none transition-all ${
                  errors.street ? 'border-red-500' : 'border-[#DDE5E3] focus:border-[#1E6B64]'
                }`}
              />
              {errors.street && (
                <p className="text-[11px] text-red-600 mt-1">{errors.street.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">رقم العمارة</label>
                <input
                  type="text"
                  placeholder="مثال: 14"
                  maxLength={40}
                  {...register('building')}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">الدور</label>
                <input
                  type="text"
                  placeholder="مثال: 3"
                  maxLength={20}
                  {...register('floor')}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">رقم الشقة</label>
                <input
                  type="text"
                  placeholder="مثال: 12"
                  maxLength={20}
                  {...register('apartment')}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">علامة مميزة (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: أمام صيدلية النصر"
                maxLength={120}
                {...register('landmark')}
                className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64]"
              />
            </div>
          </div>
        )}

        {/* Step 4: Payment Method */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold font-headline text-[#1F2A2E] flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#1E6B64]" />
            <span>طريقة الدفع</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cash on Delivery */}
            {settings.paymentMethods?.cod !== false && (
              <button
                type="button"
                onClick={() => setValue('paymentMethod', 'cod')}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'cod'
                    ? 'border-[#1E6B64] bg-[#1E6B64]/5 text-[#1E6B64] font-bold ring-1 ring-[#1E6B64]'
                    : 'border-[#DDE5E3] hover:border-[#1E6B64]/30 bg-white text-[#1F2A2E]'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">كاش عند الاستلام</span>
              </button>
            )}

            {/* Transfer (Vodafone Cash / InstaPay) */}
            {settings.paymentMethods?.transfer !== false && (
              <button
                type="button"
                onClick={() => setValue('paymentMethod', 'transfer')}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'border-[#1E6B64] bg-[#1E6B64]/5 text-[#1E6B64] font-bold ring-1 ring-[#1E6B64]'
                    : 'border-[#DDE5E3] hover:border-[#1E6B64]/30 bg-white text-[#1F2A2E]'
                }`}
              >
                <Send className="w-5 h-5 text-[#1E6B64]" />
                <span className="text-xs">تحويل (فودافون كاش / إنستاباي)</span>
              </button>
            )}
          </div>

          {/* Transfer Instructions & Ref Input */}
          {paymentMethod === 'transfer' && (
            <div className="p-4 rounded-2xl bg-[#1E6B64]/5 border border-[#1E6B64]/20 space-y-3 animate-in fade-in">
              <div className="text-xs text-[#1F2A2E] font-medium leading-relaxed">
                {settings.transferInstructions ||
                  'يرجى تحويل إجمالي المبلغ على محفظة فودافون كاش أو إنستاباي، ثم إدخال رقم العملية للتأكيد.'}
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  رقم العملية أو آخر 4 أرقام من رقم التحويل <span className="text-[#C23B22]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: 9876 أو كود العملية"
                  maxLength={40}
                  {...register('transferRef')}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs text-[#1F2A2E] focus:outline-none transition-all ${
                    errors.transferRef ? 'border-red-500' : 'border-[#DDE5E3] focus:border-[#1E6B64]'
                  }`}
                />
                {errors.transferRef && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.transferRef.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 5: Customer Notes */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1F2A2E] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#1E6B64]" />
              <span>ملاحظات إضافية على الطلب (اختياري):</span>
            </label>
            <span className="text-[10px] text-[#1F2A2E]/50 font-mono">
              {notesValue.length}/300
            </span>
          </div>
          <textarea
            rows={2}
            maxLength={300}
            placeholder="مثال: يرجى تسوية المشويات جيداً، إضافة ليمون زيادة..."
            {...register('notes')}
            className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] resize-none"
          />
        </div>

        {/* Order Summary & Submit Box */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold font-headline text-[#1F2A2E]">ملخص الحساب</h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#1F2A2E]/70">
              <span>المجموع الفرعي ({cart.length} أصناف):</span>
              <span className="font-bold text-[#1F2A2E]">{formatPrice(cartTotal)}</span>
            </div>

            <div className="flex justify-between text-[#1F2A2E]/70">
              <span>خدمة التوصيل:</span>
              <span className="font-bold text-[#1F2A2E]">
                {deliveryType === 'delivery' ? formatPrice(deliveryFee) : 'استلام من المطعم'}
              </span>
            </div>

            <div className="pt-3 border-t border-[#DDE5E3] flex justify-between items-center text-sm font-black text-[#1F2A2E]">
              <span>الإجمالي المطلوب:</span>
              <span className="text-lg text-[#C23B22] font-headline">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Email Verification Required Banner */}
          {!isEmailVerified && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-2 text-start">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Mail className="w-4 h-4 text-amber-700 shrink-0" />
                <span>البريد الإلكتروني غير مفعّل: ({user?.email})</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                وفقاً لسياسة الأمان، لا يمكن إتمام الطلب إلا بعد تأكيد البريد الإلكتروني. يرجى فتح الرابط المرسل إلى بريدك لتأكيد حسابك.
              </p>
              {verificationNotice && (
                <div className="text-[11px] font-bold text-amber-900 bg-amber-100 p-2 rounded-xl">
                  {verificationNotice}
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="text-xs font-bold text-[#1E6B64] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>أعد إرسال الرابط</span>
                </button>
                <button
                  type="button"
                  onClick={handleCheckReload}
                  disabled={checkingVerification}
                  className="text-xs font-bold text-[#C23B22] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingVerification ? 'animate-spin' : ''}`} />
                  <span>خلصت التفعيل (فحص)</span>
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isSubmitting || !isOrderingOpen || isBelowMinOrder || !user || !isEmailVerified}
            className="mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {!isEmailVerified
                ? 'يرجى تفعيل البريد الإلكتروني لإتمام الطلب'
                : isSubmitting
                ? 'جاري تسجيل الطلب...'
                : 'تأكيد وإرسال الطلب'}
            </span>
            <ArrowLeft className="w-4 h-4 ms-1" />
          </Button>
        </div>
      </form>
    </div>
  );
};
