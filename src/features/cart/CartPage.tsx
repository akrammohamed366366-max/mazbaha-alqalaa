import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../app/providers/StoreContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatPrice } from '../../lib/format';
import {
  ShoppingBag,
  Trash2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Plus,
  Minus,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const {
    cart,
    cartTotal,
    hasUnavailableItems,
    updateCartQty,
    removeFromCart,
    clearCart,
    settings,
  } = useStore();
  const navigate = useNavigate();

  const isOrderingOpen = settings.isOrderingOpen !== false;
  const isMinOrderMet = cartTotal >= settings.minOrder;
  const canProceedToCheckout = isOrderingOpen && isMinOrderMet && !hasUnavailableItems && cart.length > 0;

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <EmptyState
          title="السلة فاضية، اختار من المنيو"
          description="لم تقم بإضافة أي صنف من أصناف المشويات حتى الآن. تفضل بتصفح المنيو لاختيار وجبتك الشهية."
          icon={<ShoppingBag className="w-8 h-8" />}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/menu')}>
              <span>تصفح قائمة الطعام</span>
              <ArrowLeft className="w-4 h-4 ms-1" />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 text-start pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#DDE5E3]">
        <div className="flex items-center gap-3">
          <Link
            to="/menu"
            className="p-2 rounded-xl text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-white transition-colors"
            aria-label="العودة للمنيو"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-xl md:text-2xl font-headline font-black text-[#1F2A2E]">
            سلة المشتريات
          </h1>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs text-red-600 hover:text-red-700 font-bold px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
        >
          تفريغ السلة
        </button>
      </div>

      {/* Restaurant Closed Notification Banner */}
      {!isOrderingOpen && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <div className="font-bold text-sm">المطعم مغلق حالياً ولا يستقبل طلبات جديدة</div>
            <div className="text-[11px] text-amber-800/80 mt-0.5">
              {settings.closedMessage ||
                `ساعات العمل اليومية من ${settings.hours.open} حتى ${settings.hours.close}. يمكنك مراجعة وتعديل سلتك لحين بدء استقبال الطلبات.`}
            </div>
          </div>
        </div>
      )}

      {/* Flagged warning if any item became inactive or unavailable */}
      {hasUnavailableItems && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-bold">
            يحتوي طلبك على أصناف غير متاحة حالياً. يرجى إزالتها من السلة لمتابعة إتمام الطلب.
          </span>
        </div>
      )}

      {/* Cart Items List */}
      <div className="divide-y divide-[#DDE5E3] mt-4 bg-white rounded-3xl border border-[#DDE5E3] p-4 sm:p-6 shadow-xs">
        {cart.map((item) => (
          <div
            key={item.id}
            className={`py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              !item.isValid ? 'opacity-90' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-headline font-bold text-sm text-[#1F2A2E]">
                  {item.name}
                </h3>
                {!item.isValid && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-200">
                    غير متاح
                  </span>
                )}
              </div>

              <div className="text-xs text-[#1E6B64] font-medium mt-0.5">
                {item.variantLabel} • {formatPrice(item.unitPrice)}
              </div>

              {!item.isValid && (
                <div className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1.5 bg-red-50 p-2 rounded-xl border border-red-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.invalidReason || 'هذا الصنف لم يعد متوفراً، يرجى حذفه للمتابعة'}</span>
                </div>
              )}

              {item.note && (
                <div className="text-[11px] text-[#1F2A2E]/60 mt-1">
                  ملاحظة: {item.note}
                </div>
              )}
            </div>

            {/* Stepper & Price & Remove */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <div className="flex items-center border border-[#DDE5E3] bg-[#F5F7F6] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => updateCartQty(item.id, item.qty - 1)}
                  className="w-7 h-7 flex items-center justify-center text-[#1F2A2E] hover:bg-white rounded-lg transition-colors cursor-pointer"
                  aria-label="تقليل"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-bold font-mono">{item.qty}</span>
                <button
                  type="button"
                  disabled={item.qty >= 20}
                  onClick={() => updateCartQty(item.id, item.qty + 1)}
                  className="w-7 h-7 flex items-center justify-center text-[#1F2A2E] hover:bg-white rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                  aria-label="زيادة"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-20 text-start">
                <div className="text-xs font-bold text-[#C23B22]">
                  {formatPrice(item.lineTotal)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeFromCart(item.id)}
                className="p-2 text-[#1F2A2E]/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                aria-label="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Minimum Order Warning if applicable */}
      {!isMinOrderMet && cartTotal > 0 && (
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            الحد الأدنى للطلب هو {formatPrice(settings.minOrder)}. يرجى إضافة أصناف بقيمة {formatPrice(settings.minOrder - cartTotal)} لمتابعة الدفع.
          </span>
        </div>
      )}

      {/* Summary Box */}
      <div className="mt-6 bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#1F2A2E]/70 font-medium">إجمالي قيمة الأصناف:</span>
          <span className="font-headline font-black text-base text-[#1F2A2E]">
            {formatPrice(cartTotal)}
          </span>
        </div>
        <div className="text-xs text-[#1F2A2E]/50">
          * سيتم حساب تكلفة التوصيل في الخطوة التالية بناءً على منطقة التوصيل المحددة.
        </div>

        <div className="pt-3 border-t border-[#DDE5E3] flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to="/menu"
            className="text-xs font-bold text-[#1E6B64] hover:text-[#C23B22] flex items-center gap-1"
          >
            <span>+ إضافة المزيد من الأصناف</span>
          </Link>

          <Button
            variant="primary"
            size="lg"
            disabled={!canProceedToCheckout}
            onClick={() => navigate('/checkout')}
            className="w-full sm:w-auto"
          >
            <span>متابعة إتمام الطلب</span>
            <ArrowLeft className="w-4 h-4 ms-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
