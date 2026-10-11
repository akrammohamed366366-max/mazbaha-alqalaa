import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../app/providers/StoreContext';
import { useAuth } from '../../hooks/useAuth';
import { subscribeOrderById, getOrderByNumber } from '../../firebase/db';
import { OrderRecord, OrderStatus } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatPrice, formatTime } from '../../lib/format';
import {
  Clock,
  Phone,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Package,
  Flame,
  ChefHat,
  Truck,
  Check,
} from 'lucide-react';

interface TimelineStep {
  status: OrderStatus;
  label: string;
  description: string;
}

const ORDER_STEPS: TimelineStep[] = [
  { status: 'new', label: 'تم استلام الطلب', description: 'وصل طلبك للمطعم وجاري مراجعته' },
  { status: 'accepted', label: 'تم قبول الطلب', description: 'تم تأكيد الطلب وإرساله لمنطقة التجهيز' },
  { status: 'preparing', label: 'على الشواية', description: 'اللحوم الطازجة تتبل وتشوى على جمر الفحم' },
  { status: 'ready', label: 'الطلب جاهز', description: 'تم الانتهاء من الشواء والتغليف الحراري' },
  { status: 'out_for_delivery', label: 'في الطريق إليك', description: 'طلبك مع مندوب التوصيل وسيقوم بالتواصل معك' },
  { status: 'delivered', label: 'تم التسليم', description: 'بالهناء والشفاء، نتمنى لك وجبة شهية' },
];

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { settings, branch, menuItems, addToCart } = useStore();
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('معرف الطلب غير محدد');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 1. First attempt realtime onSnapshot on orders/{id}
    const unsub = subscribeOrderById(
      id,
      (liveOrder) => {
        if (liveOrder) {
          // Verify ownership: customer cannot open another customer's order
          if (!isStaff && user?.uid && liveOrder.ownerId && liveOrder.ownerId !== user.uid) {
            setError('ليس لديك صلاحية لعرض هذا الطلب');
            setOrder(null);
          } else {
            setOrder(liveOrder);
            setError(null);
          }
          setLoading(false);
        } else {
          // If not found by document id, check if id is an orderNumber
          const num = Number(id);
          if (!isNaN(num) && num > 0) {
            getOrderByNumber(num, isStaff ? undefined : (user?.uid || ''))
              .then((matched) => {
                if (matched) {
                  if (!isStaff && user?.uid && matched.ownerId && matched.ownerId !== user.uid) {
                    setError('ليس لديك صلاحية لعرض هذا الطلب');
                    setOrder(null);
                  } else {
                    setOrder(matched);
                    setError(null);
                  }
                } else {
                  setError('لم يتم العثور على الطلب');
                }
                setLoading(false);
              })
              .catch(() => {
                setError('لم يتم العثور على الطلب');
                setLoading(false);
              });
          } else {
            setError('لم يتم العثور على الطلب');
            setLoading(false);
          }
        }
      },
      (err) => {
        console.warn('Order subscription error:', err);
        // Security rules rejection: permission-denied
        setError('لم يتم العثور على الطلب أو ليس لديك صلاحية لعرضه');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id, user?.uid, isStaff]);

  // Refill cart for "إعادة الطلب"
  const handleReorder = () => {
    if (!order) return;
    for (const item of order.items) {
      const liveItem = menuItems.find((m) => m.id === item.itemId);
      if (liveItem) {
        const variant = liveItem.variants.find((v) => v.id === item.variantId) || liveItem.variants[0];
        if (variant) {
          addToCart(liveItem, variant, item.qty, item.note);
        }
      }
    }
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#1E6B64] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-[#1F2A2E]/70">جاري تحميل بيانات الطلب المباشرة...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold font-headline text-[#1F2A2E]">
          {error || 'لم يتم العثور على الطلب'}
        </h1>
        <p className="text-xs text-[#1F2A2E]/60">
          تأكد من رقم الطلب أو ارجع لقائمة الطعام لطلب وجبة جديدة.
        </p>
        <Button variant="primary" size="md" onClick={() => navigate('/menu')}>
          تصفح قائمة الطعام
        </Button>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const statusHierarchy: OrderStatus[] = [
    'new',
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
  ];
  const currentStepIndex = statusHierarchy.indexOf(order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 text-start pb-16 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#DDE5E3]">
        <div className="flex items-center gap-3">
          <Link
            to="/menu"
            className="p-2 rounded-xl text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-white transition-colors"
            aria-label="العودة للمنيو"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-headline font-black text-[#1F2A2E]">
                طلب رقم {order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-[#1F2A2E]/60 mt-0.5">
              تاريخ الطلب: {formatTime(order.createdAt)} • {branch.nameAr}
            </p>
          </div>
        </div>

        {/* Contact Restaurant Actions */}
        <div className="flex items-center gap-2">
          {settings.phone && (
            <a
              href={`tel:${settings.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#DDE5E3] rounded-xl text-xs font-bold text-[#1E6B64] hover:bg-[#1E6B64]/5 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">اتصل بالمطعم</span>
            </a>
          )}
          {settings.whatsapp && (
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">واتساب</span>
            </a>
          )}
        </div>
      </div>

      {/* CASE A: Cancelled Order View */}
      {isCancelled ? (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-start space-y-4 shadow-xs">
          <div className="flex items-center gap-3 text-red-700">
            <XCircle className="w-7 h-7 shrink-0" />
            <div>
              <h2 className="text-base font-bold font-headline">تم إلغاء هذا الطلب</h2>
              <p className="text-xs text-red-600/80 mt-0.5">
                نأسف لعدم التمكن من تنفيذ الطلب حالياً.
              </p>
            </div>
          </div>

          {order.cancelReason && (
            <div className="p-3.5 bg-white rounded-2xl border border-red-200 text-xs text-red-800">
              <span className="font-bold block mb-1">سبب الإلغاء:</span>
              <span>{order.cancelReason}</span>
            </div>
          )}

          {/* Refund Notice without promises */}
          <div className="text-xs text-red-700/80 leading-relaxed bg-red-100/40 p-3 rounded-xl">
            {order.paymentStatus === 'paid'
              ? 'هنتواصل معاك بخصوص المبلغ.'
              : 'نظراً لأن طريقة السداد كانت كاش عند الاستلام، فلم يتم خصم أي مبالغ.'}
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleReorder}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة الطلب</span>
            </Button>
            {settings.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-xl text-xs font-bold text-red-800 hover:bg-white/80"
              >
                <Phone className="w-4 h-4" />
                <span>اتصل بالمطعم</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        /* CASE B: Vertical Timeline (No map, no driver card, no ETA or progress percentage) */
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-6">
          <h2 className="text-sm font-bold font-headline text-[#1F2A2E] pb-3 border-b border-[#DDE5E3]">
            مراحل تجهيز الطلب
          </h2>

          <div className="relative ps-6 space-y-6 before:absolute before:start-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE5E3]">
            {ORDER_STEPS.map((st, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <div key={st.status} className="relative flex items-start gap-4">
                  {/* Step Dot */}
                  <div
                    className={`absolute -start-6 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-[#C23B22] text-white ring-4 ring-[#C23B22]/20'
                        : isPast
                        ? 'bg-[#1E6B64] text-white'
                        : 'bg-white border-2 border-[#DDE5E3] text-transparent'
                    }`}
                  >
                    {(isPast || isCurrent) && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div>
                    <h3
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-[#C23B22] text-sm'
                          : isPast
                          ? 'text-[#1F2A2E]'
                          : 'text-[#1F2A2E]/40'
                      }`}
                    >
                      {st.label}
                    </h3>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isCurrent
                          ? 'text-[#1F2A2E]/80'
                          : isPast
                          ? 'text-[#1F2A2E]/60'
                          : 'text-[#1F2A2E]/30'
                      }`}
                    >
                      {st.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold font-headline text-[#1F2A2E] pb-3 border-b border-[#DDE5E3]">
          أصناف الطلب
        </h2>

        <div className="divide-y divide-[#DDE5E3]">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#1F2A2E]">
                  {item.name} <span className="text-[#C23B22]">× {item.qty}</span>
                </div>
                <div className="text-[11px] text-[#1F2A2E]/60 mt-0.5">
                  الحجم: {item.variantLabel}
                </div>
                {item.note && (
                  <div className="text-[10px] text-[#1F2A2E]/50">
                    ملاحظة: {item.note}
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-[#1F2A2E]">
                {formatPrice(item.lineTotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals Breakdown */}
        <div className="pt-4 border-t border-[#DDE5E3] space-y-2 text-xs">
          <div className="flex justify-between text-[#1F2A2E]/70">
            <span>قيمة المشويات:</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>

          <div className="flex justify-between text-[#1F2A2E]/70">
            <span>
              تكلفة التوصيل ({order.delivery.type === 'delivery' ? order.delivery.zoneName || 'المنطقة' : 'استلام من المطعم'}):
            </span>
            <span>{formatPrice(order.deliveryFee)}</span>
          </div>

          <div className="pt-2 border-t border-[#DDE5E3] flex justify-between font-bold text-sm text-[#1F2A2E]">
            <span>الإجمالي النهائي:</span>
            <span className="font-headline font-black text-xl text-[#C23B22]">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Details & Payment Line */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4 text-xs">
        <h2 className="text-sm font-bold font-headline text-[#1F2A2E] pb-2 border-b border-[#DDE5E3]">
          بيانات العميل والسداد
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[#1F2A2E]/60 block mb-0.5">الاسم:</span>
            <span className="font-bold text-[#1F2A2E]">{order.customer.name}</span>
          </div>

          <div>
            <span className="text-[#1F2A2E]/60 block mb-0.5">رقم الموبايل:</span>
            <span className="font-bold text-[#1F2A2E] font-mono">{order.customer.phone}</span>
          </div>

          {order.delivery.type === 'delivery' && order.delivery.address && (
            <div className="sm:col-span-2">
              <span className="text-[#1F2A2E]/60 block mb-0.5">عنوان التوصيل:</span>
              <span className="font-bold text-[#1F2A2E]">
                {order.delivery.address.street}
                {order.delivery.address.building && `، عمارة ${order.delivery.address.building}`}
                {order.delivery.address.floor && `، ${order.delivery.address.floor}`}
                {order.delivery.address.apartment && `، ${order.delivery.address.apartment}`}
                {order.delivery.address.landmark && ` (علامة مميزة: ${order.delivery.address.landmark})`}
              </span>
            </div>
          )}

          <div>
            <span className="text-[#1F2A2E]/60 block mb-0.5">الدفع:</span>
            <span className="font-bold text-[#1F2A2E]">
              {order.paymentMethod === 'cod' ? (
                'كاش عند الاستلام'
              ) : (
                <>
                  <span>تحويل</span>
                  {order.transferRef && (
                    <span className="font-mono text-xs text-[#1E6B64] mr-1">
                      ({order.transferRef})
                    </span>
                  )}
                </>
              )}
            </span>
          </div>

          <div>
            <span className="text-[#1F2A2E]/60 block mb-0.5">حالة السداد:</span>
            <span
              className={`font-bold ${
                order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {order.paymentStatus === 'paid'
                ? 'تم تأكيد الدفع'
                : order.paymentMethod === 'transfer'
                ? 'في انتظار تأكيد التحويل'
                : 'كاش عند الاستلام'}
            </span>
          </div>

          {order.notes && (
            <div className="sm:col-span-2">
              <span className="text-[#1F2A2E]/60 block mb-0.5">ملاحظات العميل:</span>
              <span className="text-[#1F2A2E]">{order.notes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
