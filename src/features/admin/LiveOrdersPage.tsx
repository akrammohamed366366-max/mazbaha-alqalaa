import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  subscribeLiveOrders,
  subscribeDrivers,
  updateOrderStatusInDb,
} from '../../firebase/db';
import { OrderRecord, OrderStatus, StaffUser } from '../../types';
import { formatPrice, formatTime, formatDate } from '../../lib/format';
import { playOrderChime } from '../../lib/sound';
import { OrderDrawer } from '../../components/admin/OrderDrawer';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { Button } from '../../components/ui/Button';
import {
  Package,
  ChefHat,
  CheckCircle2,
  Bike,
  Plus,
  Volume2,
  VolumeX,
  Clock,
  Phone,
  User,
  AlertTriangle,
  RotateCw,
  XCircle,
  CreditCard,
  Banknote,
  Wallet,
} from 'lucide-react';

export const LiveOrdersPage: React.FC = () => {
  const { user, role } = useAuth();

  // Orders and listeners
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [drivers, setDrivers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'pending_payment'>('board');

  // Sound alert toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mz_order_sound') === 'true';
  });

  // Track newly arrived orders for sound and visual highlighting
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());

  // Order Drawer state
  const [selectedDrawerOrder, setSelectedDrawerOrder] = useState<OrderRecord | null>(null);

  // Cancel Order Modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderRecord | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Assign Driver Modal state (when ready order is moved to out_for_delivery without driver)
  const [assignDriverOrder, setAssignDriverOrder] = useState<OrderRecord | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Error alert message
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  };

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('mz_order_sound', String(next));
    if (next) {
      playOrderChime();
    }
  };

  // Realtime subscription to live orders (automatically unsubs on tab hidden or page unmount)
  useEffect(() => {
    let unsubLive: (() => void) | null = null;

    const startSubscription = () => {
      if (document.hidden) return; // Don't subscribe while hidden
      if (unsubLive) return;

      setIsLoading(true);
      unsubLive = subscribeLiveOrders(
        (orders) => {
          setIsLoading(false);

          // Check for new orders
          if (!isInitialLoadRef.current) {
            const freshNewOrders = orders.filter(
              (o) => !knownOrderIdsRef.current.has(o.id) && o.status === 'new'
            );

            if (freshNewOrders.length > 0) {
              if (soundEnabled) {
                playOrderChime();
              }
              setNewlyArrivedIds((prev) => {
                const next = new Set(prev);
                freshNewOrders.forEach((o) => next.add(o.id));
                return next;
              });
            }
          } else {
            isInitialLoadRef.current = false;
          }

          // Update known IDs
          const ids = new Set<string>();
          orders.forEach((o) => ids.add(o.id));
          knownOrderIdsRef.current = ids;

          setAllOrders(orders);

          // Keep open drawer synchronized with latest order state
          setSelectedDrawerOrder((prev) => {
            if (!prev) return null;
            return orders.find((o) => o.id === prev.id) || prev;
          });
        },
        (err) => {
          setIsLoading(false);
          console.error('subscribeLiveOrders error:', err);
        }
      );
    };

    const stopSubscription = () => {
      if (unsubLive) {
        unsubLive();
        unsubLive = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopSubscription();
      } else {
        startSubscription();
      }
    };

    // Initial start
    startSubscription();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopSubscription();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [soundEnabled]);

  // Subscribe to drivers (unsubscribes when tab is hidden or component unmounts)
  useEffect(() => {
    let unsubDrivers: (() => void) | null = null;

    const startDriverSub = () => {
      if (document.hidden) return;
      if (unsubDrivers) return;
      unsubDrivers = subscribeDrivers((driverList) => {
        setDrivers(driverList.filter((d) => d.active !== false));
      });
    };

    const stopDriverSub = () => {
      if (unsubDrivers) {
        unsubDrivers();
        unsubDrivers = null;
      }
    };

    const handleDriverVisibility = () => {
      if (document.hidden) {
        stopDriverSub();
      } else {
        startDriverSub();
      }
    };

    startDriverSub();
    document.addEventListener('visibilitychange', handleDriverVisibility);

    return () => {
      stopDriverSub();
      document.removeEventListener('visibilitychange', handleDriverVisibility);
    };
  }, []);

  // Filter orders for the live board: today's completed/cancelled + all active undelivered
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  const boardOrders = allOrders.filter((o) => {
    if (o.status === 'pending_payment') return false;
    // Active orders are always shown
    if (o.status !== 'delivered' && o.status !== 'cancelled') return true;
    // Delivered or cancelled from today
    return (o.createdAt || 0) >= startOfDayMs;
  });

  const pendingPaymentOrders = allOrders.filter((o) => o.status === 'pending_payment');

  // Kanban Columns configuration
  // Column 2 combines accepted and preparing per Stitch flow
  const columns: {
    id: string;
    title: string;
    icon: any;
    filter: (o: OrderRecord) => boolean;
  }[] = [
    {
      id: 'new',
      title: 'جديد',
      icon: Package,
      filter: (o) => o.status === 'new',
    },
    {
      id: 'preparing',
      title: 'قيد التحضير',
      icon: ChefHat,
      filter: (o) => o.status === 'accepted' || o.status === 'preparing',
    },
    {
      id: 'ready',
      title: 'جاهز',
      icon: CheckCircle2,
      filter: (o) => o.status === 'ready',
    },
    {
      id: 'out_for_delivery',
      title: 'خرج للتوصيل',
      icon: Bike,
      filter: (o) => o.status === 'out_for_delivery',
    },
    {
      id: 'delivered',
      title: 'تم التوصيل',
      icon: CheckCircle2,
      filter: (o) => o.status === 'delivered',
    },
  ];

  // Execute status change with proper logging
  const handleUpdateStatus = async (
    order: OrderRecord,
    newStatus: OrderStatus,
    extra?: { driverId?: string; driverName?: string; cancelReason?: string }
  ) => {
    try {
      await updateOrderStatusInDb(order.id, newStatus, {
        ...extra,
        by: role || 'cashier',
      });
      // Remove highlight if present
      setNewlyArrivedIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    } catch (err: any) {
      console.error('Status update error:', err);
      if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        if (role === 'kitchen') {
          showError('عفواً، لا يملك طاقم المطبخ صلاحية تغيير الطلب إلى هذه الحالة');
        } else {
          showError('غير مصرح بتنفيذ هذا التغيير على الطلب');
        }
      } else {
        showError('تعذر تحديث حالة الطلب: ' + (err.message || 'خطأ في الشبكة'));
      }
    }
  };

  // Primary action button click on card
  const handlePrimaryAction = async (ord: OrderRecord) => {
    if (ord.status === 'new') {
      // "قبول" sets accepted (shown in قيد التحضير column)
      await handleUpdateStatus(ord, 'accepted');
    } else if (ord.status === 'accepted') {
      // "بدء التحضير" sets preparing
      await handleUpdateStatus(ord, 'preparing');
    } else if (ord.status === 'preparing') {
      // "جاهز" sets ready
      await handleUpdateStatus(ord, 'ready');
    } else if (ord.status === 'ready') {
      if (ord.delivery.type === 'delivery') {
        // If driver not assigned yet, open assignment modal
        if (!ord.driverId) {
          setAssignDriverOrder(ord);
          setSelectedDriverId(drivers[0]?.id || '');
        } else {
          await handleUpdateStatus(ord, 'out_for_delivery');
        }
      } else {
        // For pickup orders: "تم الاستلام" sets delivered
        await handleUpdateStatus(ord, 'delivered');
      }
    } else if (ord.status === 'out_for_delivery') {
      // "تم التوصيل" sets delivered
      await handleUpdateStatus(ord, 'delivered');
    }
  };

  // Confirm cancel with reason
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder || !cancelReasonText.trim()) return;
    setIsSubmittingCancel(true);
    try {
      await handleUpdateStatus(cancelModalOrder, 'cancelled', {
        cancelReason: cancelReasonText.trim(),
      });
      setCancelModalOrder(null);
      setCancelReasonText('');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Confirm assign driver and mark out_for_delivery
  const handleConfirmAssignDriver = async () => {
    if (!assignDriverOrder || !selectedDriverId) return;
    setIsSubmittingAssign(true);
    try {
      const driver = drivers.find((d) => d.id === selectedDriverId);
      await handleUpdateStatus(assignDriverOrder, 'out_for_delivery', {
        driverId: selectedDriverId,
        driverName: driver?.name || 'مندوب توصيل',
      });
      setAssignDriverOrder(null);
      setSelectedDriverId('');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-6 text-start">
      {/* Top Banner / Error Toast */}
      {errorToast && (
        <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="font-bold text-xs">{errorToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorToast(null)}
            className="text-white/80 hover:text-white text-xs px-2 py-1 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-black text-[#1F2A2E]">
            لوحة متابعة الطلبات الحية
          </h1>
          <p className="text-xs text-[#1F2A2E]/60 mt-1">
            متابعة مراحل إعداد المشويات وتوزيع الأوردرات لحظة بلحظة
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sound alert toggle button */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              soundEnabled
                ? 'border-emerald-500/40 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/30'
                : 'border-[#DDE5E3] bg-white text-[#1F2A2E]/60 hover:bg-[#F5F7F6]'
            }`}
            title={soundEnabled ? 'كتم صوت التنبيه' : 'تفعيل صوت التنبيه'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#1F2A2E]/40" />
            )}
            <span>{soundEnabled ? 'التنبيه الصوتي مفعّل' : 'تفعيل التنبيه الصوتي'}</span>
          </button>

          {/* New phone order button */}
          <Link to="/admin/new-order">
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4" />
              <span>+ طلب تليفوني جديد</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs: Live Board vs. Pending Payment */}
      <div className="flex items-center gap-2 border-b border-[#DDE5E3] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('board')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'board'
              ? 'bg-[#1E6B64] text-white shadow-xs'
              : 'text-[#1F2A2E]/70 hover:bg-black/5'
          }`}
        >
          <span>الطلبات الجارية ({boardOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending_payment')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'pending_payment'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-[#1F2A2E]/70 hover:bg-black/5'
          }`}
        >
          <span>في انتظار الدفع ({pendingPaymentOrders.length})</span>
          {pendingPaymentOrders.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      </div>

      {/* View 1: 5-Column Live Kanban Board */}
      {activeTab === 'board' && (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-[1450px] items-start">
            {columns.map((col) => {
              const Icon = col.icon;
              const columnOrders = boardOrders.filter(col.filter);

              return (
                <div
                  key={col.id}
                  className="flex-1 min-w-[280px] bg-white rounded-3xl border border-[#DDE5E3] p-4 shadow-xs space-y-3"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#DDE5E3]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-[#1E6B64]/10 text-[#1E6B64] flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-headline font-bold text-sm text-[#1F2A2E]">
                        {col.title}
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#1E6B64]/10 text-[#1E6B64]">
                      {columnOrders.length}
                    </span>
                  </div>

                  {/* Orders Cards List */}
                  <div className="space-y-3 min-h-[420px]">
                    {columnOrders.length === 0 ? (
                      <div className="py-14 text-center text-[#1F2A2E]/40 text-xs">
                        لا توجد طلبات في هذه المرحلة
                      </div>
                    ) : (
                      columnOrders.map((ord) => {
                        const isNewlyArrived = newlyArrivedIds.has(ord.id);
                        const diffMinutes = Math.floor(
                          (Date.now() - (ord.createdAt || Date.now())) / 60000
                        );
                        const isDelayed =
                          diffMinutes >= 15 &&
                          ord.status !== 'delivered' &&
                          ord.status !== 'cancelled';

                        const paymentChipLabel =
                          ord.paymentMethod === 'cod'
                            ? 'كاش'
                            : ord.transferRef
                            ? `تحويل: ${ord.transferRef}`
                            : 'تحويل';

                        const paymentChipColor =
                          ord.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300';

                        return (
                          <div
                            key={ord.id}
                            className={`bg-[#F5F7F6] rounded-2xl p-4 border transition-all duration-200 text-start space-y-3 relative ${
                              isNewlyArrived
                                ? 'border-[#C23B22] ring-2 ring-[#C23B22]/50 shadow-md bg-amber-50/30'
                                : isDelayed
                                ? 'border-red-300 shadow-xs'
                                : 'border-[#DDE5E3] hover:border-[#1E6B64]/40 shadow-2xs'
                            }`}
                          >
                            {/* Card Top: Order Number & Time */}
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setSelectedDrawerOrder(ord)}
                                className="font-headline font-black text-base text-[#1F2A2E] hover:text-[#1E6B64] cursor-pointer"
                              >
                                #{ord.orderNumber}
                              </button>
                              <div className="flex items-center gap-1 text-[11px] font-mono text-[#1F2A2E]/50">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(ord.createdAt)}</span>
                              </div>
                            </div>

                            {/* Delay warning badge after 15 min */}
                            {isDelayed && (
                              <div className="px-2.5 py-1 rounded-lg bg-red-100 border border-red-200 text-red-800 text-[10px] font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>تأخير: أكثر من 15 دقيقة ({diffMinutes} د)</span>
                              </div>
                            )}

                            {/* Customer Name (No truncation) */}
                            <div className="space-y-0.5">
                              <div className="font-bold text-xs text-[#1F2A2E] flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-[#1E6B64] shrink-0" />
                                <span className="whitespace-normal break-words">
                                  {ord.customer.name}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#1F2A2E]/70 font-mono flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-[#1E6B64] shrink-0" />
                                <a
                                  href={`tel:${ord.customer.phone}`}
                                  className="hover:underline"
                                >
                                  {ord.customer.phone}
                                </a>
                              </div>
                            </div>

                            {/* Items count & summary (No truncation) */}
                            <div className="py-2 border-y border-[#DDE5E3] text-xs space-y-1">
                              <div className="text-[11px] font-bold text-[#1F2A2E]/70">
                                عدد الأصناف: {ord.items.length} أصناف
                              </div>
                              <div className="space-y-0.5">
                                {ord.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="text-[11px] text-[#1F2A2E] whitespace-normal break-words flex justify-between"
                                  >
                                    <span>
                                      {it.qty} × {it.name} ({it.variantLabel})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Total & Payment Chip */}
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] text-[#1F2A2E]/50 block">الإجمالي:</span>
                                <span className="font-headline font-black text-sm text-[#C23B22]">
                                  {formatPrice(ord.total)}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${paymentChipColor}`}
                              >
                                {paymentChipLabel}
                              </span>
                            </div>

                            {/* Driver Badge if assigned */}
                            {ord.driverName && (
                              <div className="text-[10px] px-2 py-1 rounded-lg bg-[#1E6B64]/10 text-[#1E6B64] font-medium flex items-center gap-1.5">
                                <Bike className="w-3 h-3 shrink-0" />
                                <span className="whitespace-normal break-words">
                                  المندوب: {ord.driverName}
                                </span>
                              </div>
                            )}

                            {/* Primary Action Button (per column / status) */}
                            <div className="pt-1 space-y-1.5">
                              {ord.status === 'new' && (
                                <button
                                  type="button"
                                  onClick={() => handlePrimaryAction(ord)}
                                  className="w-full py-2.5 px-3 bg-[#1E6B64] hover:bg-[#17534d] active:bg-[#12423d] text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                                >
                                  قبول الطلب
                                </button>
                              )}

                              {ord.status === 'accepted' && (
                                <button
                                  type="button"
                                  onClick={() => handlePrimaryAction(ord)}
                                  className="w-full py-2.5 px-3 bg-[#C23B22] hover:bg-[#a9311b] active:bg-[#8f2714] text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                                >
                                  بدء التحضير
                                </button>
                              )}

                              {ord.status === 'preparing' && (
                                <button
                                  type="button"
                                  onClick={() => handlePrimaryAction(ord)}
                                  className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                                >
                                  جاهز للتسليم
                                </button>
                              )}

                              {ord.status === 'ready' && (
                                <button
                                  type="button"
                                  onClick={() => handlePrimaryAction(ord)}
                                  className="w-full py-2.5 px-3 bg-[#1E6B64] hover:bg-[#17534d] active:bg-[#12423d] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                                >
                                  {ord.delivery.type === 'delivery' ? (
                                    <>
                                      <Bike className="w-3.5 h-3.5" />
                                      <span>خرج للتوصيل</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>تم الاستلام من الفرع</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {ord.status === 'out_for_delivery' && (
                                <button
                                  type="button"
                                  onClick={() => handlePrimaryAction(ord)}
                                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>تم التوصيل</span>
                                </button>
                              )}

                              {/* Secondary actions: View Drawer / Cancel */}
                              <div className="flex items-center justify-between pt-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDrawerOrder(ord)}
                                  className="text-[11px] text-[#1E6B64] hover:underline font-bold"
                                >
                                  عرض التفاصيل
                                </button>

                                {ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelModalOrder(ord);
                                      setCancelReasonText('');
                                    }}
                                    className="text-[11px] text-red-600 hover:text-red-700 font-bold"
                                  >
                                    {ord.status === 'new' ? 'رفض الطلب' : 'إلغاء الطلب'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Pending Payment Orders (Read-only) */}
      {activeTab === 'pending_payment' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <div className="font-bold mb-1 flex items-center gap-1.5 text-amber-950">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>طلبات في انتظار الدفع الإلكتروني (قراءة فقط)</span>
            </div>
            هذه الطلبات أنشأها العملاء عبر بطاقة الدفع أو المحفظة الإلكترونية، وهي في انتظار إتمام عملية السداد من خلال بوابة الدفع (Webhook). لا يتم إرسالها للشواية أو المطبخ إلا بعد تأكيد الدفع التلقائي.
          </div>

          {pendingPaymentOrders.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-[#DDE5E3] text-[#1F2A2E]/40 space-y-2">
              <CreditCard className="w-12 h-12 mx-auto opacity-30 text-[#1E6B64]" />
              <div className="font-bold text-sm">لا توجد طلبات معلقة بالدفع الإلكتروني حالياً</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingPaymentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl border border-amber-200 p-5 shadow-xs space-y-3 text-start"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#DDE5E3]">
                    <span className="font-headline font-black text-base text-[#1F2A2E]">
                      #{ord.orderNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      في انتظار السداد
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="font-bold text-[#1F2A2E]">{ord.customer.name}</div>
                    <div className="text-[#1F2A2E]/70 font-mono">{ord.customer.phone}</div>
                  </div>

                  <div className="py-2 border-y border-[#DDE5E3] text-xs space-y-1">
                    <div className="text-[11px] text-[#1F2A2E]/60 font-bold">
                      {ord.items.length} أصناف
                    </div>
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[#1F2A2E]">
                        <span>{it.qty} × {it.name}</span>
                        <span className="font-mono">{formatPrice(it.lineTotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-[#1F2A2E]/50 block">الإجمالي:</span>
                      <span className="font-headline font-bold text-sm text-[#C23B22]">
                        {formatPrice(ord.total)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedDrawerOrder(ord)}
                      className="text-xs text-[#1E6B64] font-bold hover:underline"
                    >
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Drawer Slide-over */}
      {selectedDrawerOrder && (
        <OrderDrawer
          order={selectedDrawerOrder}
          onClose={() => setSelectedDrawerOrder(null)}
          onStatusChange={async (orderId, newStatus, extra) => {
            const ord = allOrders.find((o) => o.id === orderId);
            if (ord) await handleUpdateStatus(ord, newStatus, extra);
          }}
          currentRole={role}
        />
      )}

      {/* Cancel Order Modal with mandatory reason */}
      <BottomSheetModal
        isOpen={!!cancelModalOrder}
        onClose={() => setCancelModalOrder(null)}
        title={
          cancelModalOrder?.status === 'new'
            ? `رفض الطلب #${cancelModalOrder?.orderNumber}`
            : `إلغاء الطلب #${cancelModalOrder?.orderNumber}`
        }
      >
        <div className="space-y-4 text-start">
          <p className="text-xs text-[#1F2A2E]/70">
            يرجى كتابة سبب الإلغاء ليتم تسجيله في سجل حركة الطلب وإظهاره للعميل:
          </p>

          <textarea
            rows={3}
            value={cancelReasonText}
            onChange={(e) => setCancelReasonText(e.target.value)}
            placeholder="مثال: تعذر التواصل مع العميل هاتفياً، أو بناءً على طلب العميل..."
            className="w-full p-3 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-red-500"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOrder(null)}
              disabled={isSubmittingCancel}
            >
              رجوع
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!cancelReasonText.trim() || isSubmittingCancel}
              onClick={handleConfirmCancel}
            >
              {isSubmittingCancel ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
            </Button>
          </div>
        </div>
      </BottomSheetModal>

      {/* Assign Driver Modal (required when moving delivery order to out_for_delivery) */}
      <BottomSheetModal
        isOpen={!!assignDriverOrder}
        onClose={() => setAssignDriverOrder(null)}
        title={`تعيين مندوب التوصيل للطلب #${assignDriverOrder?.orderNumber}`}
      >
        <div className="space-y-4 text-start">
          <p className="text-xs text-[#1F2A2E]/70">
            يتطلب خروج الطلب للتوصيل اختيار أحد مناديب التوصيل المسجلين:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {drivers.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl text-amber-800 text-xs text-center">
                لا يوجد مناديب توصيل مسجلين حالياً.
              </div>
            ) : (
              drivers.map((drv) => (
                <button
                  key={drv.id}
                  type="button"
                  onClick={() => setSelectedDriverId(drv.id)}
                  className={`w-full p-3 rounded-xl border text-start flex items-center justify-between transition-colors cursor-pointer ${
                    selectedDriverId === drv.id
                      ? 'border-[#1E6B64] bg-[#1E6B64]/5 ring-1 ring-[#1E6B64]'
                      : 'border-[#DDE5E3] bg-white hover:bg-[#F5F7F6]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#1F2A2E]">{drv.name}</div>
                    <div className="text-[10px] text-[#1F2A2E]/50">مندوب توصيل</div>
                  </div>
                  {selectedDriverId === drv.id && (
                    <CheckCircle2 className="w-4 h-4 text-[#1E6B64]" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignDriverOrder(null)}
              disabled={isSubmittingAssign}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedDriverId || isSubmittingAssign}
              onClick={handleConfirmAssignDriver}
            >
              {isSubmittingAssign ? 'جاري الحفظ...' : 'تأكيد الخروج للتوصيل'}
            </Button>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
};
