import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscribeLiveOrders, updateOrderStatusInDb } from '../../firebase/db';
import { OrderRecord } from '../../types';
import { formatTime } from '../../lib/format';
import { playOrderChime } from '../../lib/sound';
import {
  ChefHat,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Volume2,
  VolumeX,
  LogOut,
  AlertTriangle,
  Bike,
  Store,
} from 'lucide-react';

export const KitchenPage: React.FC = () => {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mz_kitchen_sound') === 'true';
  });

  // Timer tick for live elapsed time updates
  const [now, setNow] = useState<number>(Date.now());
  const [actionError, setActionError] = useState<string | null>(null);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('mz_kitchen_sound', String(next));
    if (next) playOrderChime();
  };

  // Realtime subscription to live orders
  useEffect(() => {
    const unsub = subscribeLiveOrders(
      (allOrders) => {
        // Filter strictly for accepted and preparing orders
        const kitchenList = allOrders.filter(
          (o) => o.status === 'accepted' || o.status === 'preparing'
        );
        setOrders(kitchenList);
      },
      (err) => {
        console.error('Kitchen orders subscription error:', err);
      }
    );
    return () => unsub();
  }, []);

  // Update order status from kitchen
  const handleKitchenStatusChange = async (orderId: string, newStatus: 'preparing' | 'ready') => {
    setActionError(null);
    try {
      await updateOrderStatusInDb(orderId, newStatus, {
        by: role || 'kitchen',
      });
    } catch (err: any) {
      console.error('Kitchen status update error:', err);
      if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        setActionError('عفواً، لا يملك طاقم المطبخ صلاحية تنفيذ هذا الإجراء');
      } else {
        setActionError('تعذر تحديث حالة الطلب: ' + (err.message || 'خطأ في الاتصال'));
      }
    }
  };

  // Helper for formatted elapsed time
  const formatElapsed = (createdAtMs: number) => {
    const totalSeconds = Math.max(0, Math.floor((now - createdAtMs) / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Two columns: جديد (accepted) و قيد التحضير (preparing)
  const acceptedOrders = orders.filter((o) => o.status === 'accepted');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');

  return (
    <div className="min-h-screen bg-[#1F2A2E] text-white p-4 sm:p-6 font-sans select-none text-start flex flex-col">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3">
          {(role === 'admin' || role === 'manager') && (
            <Link
              to="/admin/orders"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="العودة للإدارة"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C23B22] text-white flex items-center justify-center shadow-md">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-headline font-black text-white">
                شاشة المطبخ والشواية
              </h1>
              <div className="text-xs text-amber-400 font-bold">
                إجمالي الطلبات على الشواية: {orders.length} طلب
              </div>
            </div>
          </div>
        </div>

        {/* Header Right: Sound Toggle + Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                : 'border-white/10 bg-white/5 text-white/50'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {soundEnabled ? 'التنبيه الصوتي مفعّل' : 'تفعيل الصوت'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </button>
        </div>
      </header>

      {/* Action Error Banner */}
      {actionError && (
        <div className="mb-4 p-4 bg-red-900/60 border border-red-500/40 rounded-2xl text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs text-red-300 hover:underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Two-Column Tablet Landscape Queue */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Column 1: جديد (Accepted - Waiting to Start) */}
        <div className="bg-[#28363B] rounded-3xl border border-white/10 p-4 sm:p-5 flex flex-col space-y-4 min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-lg font-headline font-bold text-white">
                طلبات جديدة جاهزة للشواية ({acceptedOrders.length})
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {acceptedOrders.length === 0 ? (
              <div className="py-20 text-center text-white/30 text-xs">
                لا توجد طلبات جديدة بانتظار الشواية
              </div>
            ) : (
              acceptedOrders.map((ord) => {
                const elapsedStr = formatElapsed(ord.createdAt);
                const isDelayed =
                  Math.floor((now - (ord.createdAt || now)) / 60000) >= 15;

                return (
                  <div
                    key={ord.id}
                    className="bg-[#1F2A2E] rounded-2xl border-2 border-white/10 p-5 space-y-4 shadow-lg text-start"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl font-headline font-black text-white">
                          #{ord.orderNumber}
                        </span>
                        {/* Delivery / Pickup Chip only */}
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white/10 text-white/90 flex items-center gap-1">
                          {ord.delivery.type === 'delivery' ? (
                            <>
                              <Bike className="w-3.5 h-3.5 text-teal-400" />
                              <span>توصيل دليفري</span>
                            </>
                          ) : (
                            <>
                              <Store className="w-3.5 h-3.5 text-amber-400" />
                              <span>استلام من الفرع</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Elapsed Timer */}
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold ${
                          isDelayed
                            ? 'bg-red-950/80 text-red-300 border border-red-500/40 animate-pulse'
                            : 'bg-black/30 text-amber-300'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>منذ {elapsedStr}</span>
                      </div>
                    </div>

                    {/* Items Big List (NO PRICES) */}
                    <div className="space-y-2.5">
                      {ord.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-start justify-between"
                        >
                          <div>
                            <div className="text-base sm:text-lg font-bold text-white leading-tight">
                              {it.name}
                            </div>
                            <div className="text-xs text-amber-300 font-bold mt-1">
                              الحجم: {it.variantLabel}
                            </div>
                            {it.note && (
                              <div className="text-xs text-red-300 mt-1.5 bg-red-950/50 p-1 rounded font-medium">
                                ملاحظة: {it.note}
                              </div>
                            )}
                          </div>
                          <div className="text-2xl sm:text-3xl font-headline font-black text-[#C23B22] shrink-0 ps-3">
                            × {it.qty}
                          </div>
                        </div>
                      ))}
                    </div>

                    {ord.notes && (
                      <div className="text-xs text-amber-200 bg-amber-950/30 p-2.5 rounded-xl border border-amber-500/20">
                        <span className="font-bold">ملاحظات الطلب: </span>
                        <span>{ord.notes}</span>
                      </div>
                    )}

                    {/* Primary Button: "ابدأ التحضير" */}
                    <button
                      type="button"
                      onClick={() => handleKitchenStatusChange(ord.id, 'preparing')}
                      className="w-full py-4 bg-[#C23B22] hover:bg-[#a9311b] active:bg-[#8f2714] text-white font-bold rounded-2xl text-base shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer"
                    >
                      <Flame className="w-5 h-5" />
                      <span>ابدأ التحضير على الشواية</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: قيد التحضير (Preparing - On Charcoal) */}
        <div className="bg-[#28363B] rounded-3xl border border-white/10 p-4 sm:p-5 flex flex-col space-y-4 min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#C23B22] animate-ping" />
              <h2 className="text-lg font-headline font-bold text-white">
                قيد التحضير على الفحم ({preparingOrders.length})
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <div className="py-20 text-center text-white/30 text-xs">
                لا توجد طلبات جاري تحضيرها حالياً
              </div>
            ) : (
              preparingOrders.map((ord) => {
                const elapsedStr = formatElapsed(ord.createdAt);
                const isDelayed =
                  Math.floor((now - (ord.createdAt || now)) / 60000) >= 15;

                return (
                  <div
                    key={ord.id}
                    className="bg-[#1F2A2E] rounded-2xl border-2 border-[#C23B22] p-5 space-y-4 shadow-xl text-start"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl font-headline font-black text-white">
                          #{ord.orderNumber}
                        </span>
                        {/* Delivery / Pickup Chip only */}
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white/10 text-white/90 flex items-center gap-1">
                          {ord.delivery.type === 'delivery' ? (
                            <>
                              <Bike className="w-3.5 h-3.5 text-teal-400" />
                              <span>توصيل دليفري</span>
                            </>
                          ) : (
                            <>
                              <Store className="w-3.5 h-3.5 text-amber-400" />
                              <span>استلام من الفرع</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Elapsed Timer */}
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold ${
                          isDelayed
                            ? 'bg-red-950/80 text-red-300 border border-red-500/40 animate-pulse'
                            : 'bg-black/30 text-amber-300'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>منذ {elapsedStr}</span>
                      </div>
                    </div>

                    {/* Items Big List (NO PRICES) */}
                    <div className="space-y-2.5">
                      {ord.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-start justify-between"
                        >
                          <div>
                            <div className="text-base sm:text-lg font-bold text-white leading-tight">
                              {it.name}
                            </div>
                            <div className="text-xs text-amber-300 font-bold mt-1">
                              الحجم: {it.variantLabel}
                            </div>
                            {it.note && (
                              <div className="text-xs text-red-300 mt-1.5 bg-red-950/50 p-1 rounded font-medium">
                                ملاحظة: {it.note}
                              </div>
                            )}
                          </div>
                          <div className="text-2xl sm:text-3xl font-headline font-black text-[#C23B22] shrink-0 ps-3">
                            × {it.qty}
                          </div>
                        </div>
                      ))}
                    </div>

                    {ord.notes && (
                      <div className="text-xs text-amber-200 bg-amber-950/30 p-2.5 rounded-xl border border-amber-500/20">
                        <span className="font-bold">ملاحظات الطلب: </span>
                        <span>{ord.notes}</span>
                      </div>
                    )}

                    {/* Primary Button: "جاهز" */}
                    <button
                      type="button"
                      onClick={() => handleKitchenStatusChange(ord.id, 'ready')}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-2xl text-base shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>جاهز للتسليم</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
