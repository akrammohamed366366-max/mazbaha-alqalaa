import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscribeDriverOrders, updateOrderStatusInDb } from '../../firebase/db';
import { OrderRecord } from '../../types';
import { formatPrice } from '../../lib/format';
import {
  Flame,
  Phone,
  MapPin,
  ExternalLink,
  CheckCircle2,
  LogOut,
  Package,
  AlertTriangle,
  Bike,
} from 'lucide-react';

export const DriverPage: React.FC = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  // Enforce noindex
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
      created = true;
    }
    metaRobots.content = 'noindex, nofollow';

    return () => {
      if (created && metaRobots && metaRobots.parentNode) {
        metaRobots.parentNode.removeChild(metaRobots);
      } else if (metaRobots) {
        metaRobots.content = 'index, follow';
      }
    };
  }, []);

  // Subscribe in real-time to orders assigned to current driver
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = subscribeDriverOrders(
      user.uid,
      (driverOrders) => {
        setIsLoading(false);
        // Filter strictly for ready and out_for_delivery
        const activeDriverOrders = driverOrders.filter(
          (o) => o.status === 'ready' || o.status === 'out_for_delivery'
        );
        setOrders(activeDriverOrders);
      },
      (err) => {
        setIsLoading(false);
        console.error('Driver orders subscription error:', err);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Action: Mark ready order as out_for_delivery, or out_for_delivery as delivered
  const handleStatusChange = async (orderId: string, newStatus: 'out_for_delivery' | 'delivered') => {
    setActionError(null);
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatusInDb(orderId, newStatus, {
        by: 'driver',
      });
    } catch (err: any) {
      console.error('Driver order status update error:', err);
      if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        setActionError('عفواً، ليس لديك صلاحية تحديث هذا الطلب');
      } else {
        setActionError('تعذر تحديث حالة الطلب: ' + (err.message || 'خطأ في الاتصال'));
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Cash to collect calculation
  const cashToCollect = orders
    .filter((o) => o.paymentMethod === 'cod' && o.paymentStatus !== 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen bg-[#F5F7F6] text-[#1F2A2E] p-4 max-w-lg mx-auto font-sans text-start space-y-4">
      {/* Header: Logo, Title "طلباتي", Logout ONLY */}
      <header className="bg-white rounded-3xl p-4 border border-[#DDE5E3] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E6B64] text-white flex items-center justify-center shadow-xs">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-headline font-black text-lg text-[#1F2A2E]">
              طلباتي
            </h1>
            <div className="text-[11px] text-[#1F2A2E]/60">مزبحة القلعة - توصيل الطلبات</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="p-2.5 rounded-xl border border-red-500/20 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="تسجيل الخروج"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج</span>
        </button>
      </header>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs text-red-700 hover:underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Summary: Active Orders Count + Cash to Collect */}
      <div className="bg-[#1F2A2E] text-white rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-white/70">
          <span>ملخص العهدة الحالية</span>
          <span className="font-bold text-teal-300">{orders.length} طلبات نشطة</span>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
          <div>
            <span className="text-[11px] text-white/60 block">المبلغ المطلوب تحصيله كاش:</span>
            <span className="text-2xl font-headline font-black text-amber-400">
              {formatPrice(cashToCollect)}
            </span>
          </div>
          <div className="text-[11px] text-white/50">
            {orders.filter((o) => o.paymentMethod === 'cod').length} طلب كاش
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-[#1F2A2E]/50 space-y-2">
            <div className="w-8 h-8 border-3 border-[#1E6B64] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">جاري تحميل الطلبات...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#DDE5E3] text-[#1F2A2E]/50 space-y-2">
            <Package className="w-12 h-12 mx-auto opacity-30 text-[#1E6B64]" />
            <h2 className="text-sm font-bold">لا توجد طلبات جارية للتوصيل حالياً</h2>
            <p className="text-xs">
              الطلبات المجهزة المعينة لك من الكاشير ستظهر هنا فور إسنادها
            </p>
          </div>
        ) : (
          orders.map((ord) => {
            // Build encoded Google Maps address query
            const addressParts = [
              ord.delivery.address?.street,
              ord.delivery.address?.building ? `عمارة ${ord.delivery.address.building}` : '',
              ord.delivery.zoneName || '',
              'القاهرة',
              'مصر',
            ].filter(Boolean);
            const addressString = addressParts.join('، ');
            const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(addressString)}`;

            const isUpdating = updatingOrderId === ord.id;

            return (
              <div
                key={ord.id}
                className="bg-white rounded-3xl border border-[#DDE5E3] p-5 shadow-xs space-y-4 text-start"
              >
                {/* Order Top Line */}
                <div className="flex items-center justify-between pb-3 border-b border-[#DDE5E3]">
                  <div>
                    <span className="font-headline font-black text-lg text-[#1F2A2E]">
                      طلب #{ord.orderNumber}
                    </span>
                    <div className="text-[11px] text-[#1E6B64] font-bold">
                      {ord.delivery.zoneName || 'توصيل'}
                    </div>
                  </div>

                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
                      ord.status === 'ready'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {ord.status === 'ready' ? 'جاهز بالفرع' : 'في الطريق للعميل'}
                  </span>
                </div>

                {/* Customer Details & Call Button */}
                <div className="p-3 bg-[#F5F7F6] rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#1F2A2E]">
                      {ord.customer.name}
                    </div>
                    <div className="text-xs text-[#1F2A2E]/70 font-mono mt-0.5">
                      {ord.customer.phone}
                    </div>
                  </div>

                  <a
                    href={`tel:${ord.customer.phone}`}
                    className="p-3 rounded-2xl bg-[#1E6B64] hover:bg-[#17534d] text-white flex items-center justify-center transition-colors shadow-xs"
                    aria-label="اتصال بالعميل"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                {/* Address Details with "افتح الخريطة" link */}
                <div className="space-y-2 text-xs">
                  {ord.delivery.address && (
                    <div className="flex items-start gap-2 text-[#1F2A2E]">
                      <MapPin className="w-4 h-4 text-[#C23B22] shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold leading-relaxed">
                          {ord.delivery.address.street}
                          {ord.delivery.address.building && `، عمارة ${ord.delivery.address.building}`}
                          {ord.delivery.address.floor && `، دور ${ord.delivery.address.floor}`}
                          {ord.delivery.address.apartment && `، شقة ${ord.delivery.address.apartment}`}
                        </div>
                        {ord.delivery.address.landmark && (
                          <div className="text-[11px] text-[#1F2A2E]/60">
                            علامة مميزة: {ord.delivery.address.landmark}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Open Maps Link (No embedded map) */}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#1E6B64] font-bold hover:underline pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>افتح العنوان على خرائط Google</span>
                  </a>
                </div>

                {/* Cash Box for Cash Orders */}
                {ord.paymentMethod === 'cod' ? (
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-900 font-bold block">
                        مطلوب تحصيل كاش:
                      </span>
                      <span className="font-headline font-black text-xl text-[#C23B22]">
                        {formatPrice(ord.total)}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-xl font-bold ${
                        ord.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-200/80 text-amber-950'
                      }`}
                    >
                      {ord.paymentStatus === 'paid' ? 'تم السداد' : 'كاش عند الاستلام'}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between font-bold">
                    <span>طريقة الدفع:</span>
                    <span>مدفوع إلكترونياً (لا يوجد كاش)</span>
                  </div>
                )}

                {/* Items Summary */}
                <div className="p-2.5 bg-[#F5F7F6] rounded-xl text-xs space-y-1">
                  <div className="text-[10px] text-[#1F2A2E]/50 font-bold">محتويات الطلب:</div>
                  {ord.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[#1F2A2E]">
                      <span>{it.qty} × {it.name} ({it.variantLabel})</span>
                    </div>
                  ))}
                  {ord.notes && (
                    <div className="text-[11px] text-amber-900 font-medium pt-1 border-t border-[#DDE5E3]">
                      ملاحظة العميل: {ord.notes}
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2">
                  {ord.status === 'ready' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(ord.id, 'out_for_delivery')}
                      className="w-full py-4 bg-[#1E6B64] hover:bg-[#17534d] active:bg-[#12423d] text-white font-bold rounded-2xl text-base shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      <Bike className="w-5 h-5" />
                      <span>{isUpdating ? 'جاري التحديث...' : 'استلمت الطلب وبدأت التوصيل'}</span>
                    </button>
                  )}

                  {ord.status === 'out_for_delivery' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(ord.id, 'delivered')}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl text-base shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{isUpdating ? 'جاري التسجيل...' : 'تم التوصيل'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
