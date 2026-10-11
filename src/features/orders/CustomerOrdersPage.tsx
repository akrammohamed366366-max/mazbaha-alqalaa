import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../app/providers/StoreContext';
import { subscribeCustomerOrders } from '../../firebase/db';
import { OrderRecord } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatPrice, formatTime } from '../../lib/format';
import {
  Clock,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Flame,
  ChevronLeft,
  RotateCcw,
  LogIn,
} from 'lucide-react';

export const CustomerOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { menuItems, addToCart, showToast } = useStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeCustomerOrders(
      user.uid,
      (liveOrders) => {
        setOrders(liveOrders);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const handleReorder = (order: OrderRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    for (const item of order.items) {
      const menuItem = menuItems.find((m) => m.id === item.itemId) || {
        id: item.itemId,
        name: item.name,
        categoryId: '',
        description: '',
        tags: [],
        sortOrder: 1,
        active: true,
        available: true,
        variants: [{ id: item.variantId, label: item.variantLabel, price: item.unitPrice }],
      };
      const variant = menuItem.variants.find((v) => v.id === item.variantId) || {
        id: item.variantId,
        label: item.variantLabel,
        price: item.unitPrice,
      };
      addToCart(menuItem, variant, item.qty, item.note || '');
    }
    showToast(`تمت إضافة أصناف طلب #${order.orderNumber} إلى السلة بنجاح`, 'success');
    navigate('/cart');
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12 pb-20 text-center space-y-5" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-[#1E6B64]/10 text-[#1E6B64] flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <h1 className="font-headline font-black text-xl text-[#1F2A2E]">
            سجل طلباتي
          </h1>
          <p className="text-xs text-[#1F2A2E]/60 mt-1 leading-relaxed">
            سجّل دخولك لمتابعة طلباتك الحالية وتصفح سجل طلباتك السابقة وإعادة طلبها بضغطة واحدة.
          </p>
        </div>
        <Link
          to="/login?redirect=/orders"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#1E6B64] hover:bg-[#17534d] text-white text-xs font-bold transition-colors shadow-xs"
        >
          <LogIn className="w-4 h-4" />
          <span>تسجيل الدخول</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 text-start pb-16 space-y-6" dir="rtl">
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
            <h1 className="text-xl md:text-2xl font-headline font-black text-[#1F2A2E]">
              طلباتي السابقة
            </h1>
            <p className="text-xs text-[#1F2A2E]/60">
              متابعة جميع طلباتك وحالتها المباشرة
            </p>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-[#DDE5E3] p-5 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-28" />
                <div className="h-5 bg-gray-200 rounded-full w-20" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-24 pt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold font-headline text-[#1F2A2E]">
              لا توجد طلبات سابقة حتى الآن
            </h2>
            <p className="text-xs text-[#1F2A2E]/60 mt-1 max-w-sm mx-auto">
              اطلب الآن مشوياتك المفضلة من المنيو وتابع خطوات تجهيزها وتوصيلها لحظة بلحظة.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => navigate('/menu')}>
            <span>تصفح قائمة الطعام</span>
            <ArrowLeft className="w-4 h-4 ms-1" />
          </Button>
        </div>
      )}

      {/* Orders List */}
      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/order/${order.id}`)}
              className="bg-white rounded-3xl border border-[#DDE5E3] hover:border-[#1E6B64]/50 hover:shadow-xs transition-all p-5 sm:p-6 text-start cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center font-bold text-xs">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-sm text-[#1F2A2E] group-hover:text-[#C23B22] transition-colors">
                      طلب رقم {order.orderNumber}
                    </h3>
                    <div className="text-[11px] text-[#1F2A2E]/50 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <StatusBadge status={order.status} />
              </div>

              {/* Items Summary Line */}
              <div className="text-xs text-[#1F2A2E]/70 line-clamp-1 border-t border-[#DDE5E3]/60 pt-2.5">
                {order.items.map((it) => `${it.name} (${it.variantLabel} × ${it.qty})`).join('، ')}
              </div>

              {/* Footer: Total, Reorder button, and details link */}
              <div className="flex items-center justify-between pt-2 border-t border-[#DDE5E3]/40 flex-wrap gap-2">
                <div>
                  <span className="text-[10px] text-[#1F2A2E]/50 block">الإجمالي:</span>
                  <span className="text-sm font-black font-headline text-[#C23B22]">
                    {formatPrice(order.total)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Reorder Button */}
                  <button
                    type="button"
                    onClick={(e) => handleReorder(order, e)}
                    className="py-1.5 px-3 rounded-xl bg-[#F5F7F6] hover:bg-[#1E6B64] hover:text-white text-[#1E6B64] border border-[#DDE5E3] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>اطلب تاني</span>
                  </button>

                  <div className="flex items-center gap-1 text-xs font-bold text-[#1F2A2E]/70 group-hover:text-[#C23B22] transition-colors ps-2">
                    <span>التفاصيل</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

