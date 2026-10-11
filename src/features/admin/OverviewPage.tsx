import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getOrdersByRange } from '../../firebase/db';
import { OrderRecord } from '../../types';
import { formatPrice, formatTime, formatDate } from '../../lib/format';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  XCircle,
  Download,
  Calendar,
  CreditCard,
  Banknote,
  Wallet,
  Clock,
  User,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

type RangeOption = 'today' | 'week' | 'month';

// In-memory 5-minute cache for overview reports to prevent redundant Firestore queries
const overviewCache = new Map<RangeOption, { data: OrderRecord[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const OverviewPage: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<RangeOption>('week');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showMonthWarningModal, setShowMonthWarningModal] = useState<boolean>(false);

  // Calculate start and end timestamp based on selectedRange
  const { startMs, endMs } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();

    if (selectedRange === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (selectedRange === 'week') {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }

    return { startMs: start.getTime(), endMs: end.getTime() };
  }, [selectedRange]);

  // Load orders for range (with 5-minute in-memory cache and never auto-refresh)
  useEffect(() => {
    let isCancelled = false;

    // Check memory cache first
    const cached = overviewCache.get(selectedRange);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setOrders(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    getOrdersByRange(startMs, endMs)
      .then((data) => {
        if (!isCancelled) {
          overviewCache.set(selectedRange, { data, timestamp: Date.now() });
          setOrders(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading orders by range:', err);
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedRange, startMs, endMs]);

  // Calculations: Exclude cancelled from sales
  const validOrders = useMemo(
    () => orders.filter((o) => o.status !== 'cancelled'),
    [orders]
  );
  const cancelledOrders = useMemo(
    () => orders.filter((o) => o.status === 'cancelled'),
    [orders]
  );

  // 1. KPIs
  const totalSales = useMemo(
    () => validOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    [validOrders]
  );
  const totalOrdersCount = orders.length;
  const avgOrderValue = validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0;
  const cancelledCount = cancelledOrders.length;

  // 2. Sales per day
  const salesPerDayData = useMemo(() => {
    const map = new Map<string, number>();

    // Seed all days in range
    const cur = new Date(startMs);
    while (cur.getTime() <= endMs) {
      const key = `${cur.getMonth() + 1}/${cur.getDate()}`;
      map.set(key, 0);
      cur.setDate(cur.getDate() + 1);
    }

    // Populate sales
    validOrders.forEach((o) => {
      const d = new Date(o.createdAt || Date.now());
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + (o.total || 0));
      }
    });

    return Array.from(map.entries()).map(([day, sales]) => ({
      day,
      sales,
    }));
  }, [startMs, endMs, validOrders]);

  // 3. Top Items sold
  const topItemsData = useMemo(() => {
    const map = new Map<string, number>();
    validOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const key = it.name;
        map.set(key, (map.get(key) || 0) + (it.qty || 1));
      });
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [validOrders]);

  // 4. Payment Method Split
  const paymentSplitData = useMemo(() => {
    let codCount = 0;
    let cardCount = 0;
    let walletCount = 0;

    validOrders.forEach((o) => {
      if (o.paymentMethod === 'cod') codCount += 1;
      else if (o.paymentMethod === 'card') cardCount += 1;
      else if (o.paymentMethod === 'wallet') walletCount += 1;
      else codCount += 1;
    });

    const list = [
      { name: 'كاش عند الاستلام', value: codCount, color: '#1E6B64' },
      { name: 'بطاقة بنكية', value: cardCount, color: '#C23B22' },
      { name: 'محفظة إلكترونية', value: walletCount, color: '#1F2A2E' },
    ];

    return list.filter((item) => item.value > 0);
  }, [validOrders]);

  // Export CSV handler (UTF-8 with BOM for Arabic Excel)
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('لا توجد طلبات لتصديرها في هذه الفترة');
      return;
    }

    const headers = [
      'رقم الطلب',
      'العميل',
      'رقم الهاتف',
      'نوع الاستلام',
      'المنطقة',
      'المجموع الفرعي',
      'خدمة التوصيل',
      'الإجمالي',
      'طريقة الدفع',
      'حالة الدفع',
      'حالة الطلب',
      'التاريخ والوقت',
    ];

    const rows = orders.map((o) => [
      `#${o.orderNumber}`,
      `"${o.customer.name.replace(/"/g, '""')}"`,
      `"${o.customer.phone}"`,
      o.delivery.type === 'delivery' ? 'توصيل' : 'استلام',
      `"${(o.delivery.zoneName || '').replace(/"/g, '""')}"`,
      o.subtotal,
      o.deliveryFee,
      o.total,
      o.paymentMethod === 'cod' ? 'كاش' : o.paymentMethod === 'card' ? 'كارت' : 'محفظة',
      o.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع',
      o.status,
      `"${formatDate(o.createdAt)} ${formatTime(o.createdAt)}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mazbaha-orders-${selectedRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusArabicLabels: Record<string, string> = {
    new: 'جديد',
    accepted: 'مقبول',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    out_for_delivery: 'خرج للتوصيل',
    delivered: 'تم التوصيل',
    cancelled: 'ملغي',
    pending_payment: 'في انتظار الدفع',
  };

  return (
    <div className="space-y-6 text-start">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-black text-[#1F2A2E]">
            تحليلات الأداء والمبيعات
          </h1>
          <p className="text-xs text-[#1F2A2E]/60 mt-1">
            مؤشرات الإيرادات الفعلية، حركة الطلبات، والأصناف الأكثر طلباً
          </p>
        </div>

        {/* Range Selector + Export CSV */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Range Buttons */}
          <div className="bg-white p-1 rounded-2xl border border-[#DDE5E3] flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedRange('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedRange === 'today'
                  ? 'bg-[#1E6B64] text-white shadow-xs'
                  : 'text-[#1F2A2E]/70 hover:bg-[#F5F7F6]'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setSelectedRange('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedRange === 'week'
                  ? 'bg-[#1E6B64] text-white shadow-xs'
                  : 'text-[#1F2A2E]/70 hover:bg-[#F5F7F6]'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedRange !== 'month') {
                  setShowMonthWarningModal(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedRange === 'month'
                  ? 'bg-[#1E6B64] text-white shadow-xs'
                  : 'text-[#1F2A2E]/70 hover:bg-[#F5F7F6]'
              }`}
            >
              آخر 30 يوماً
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-white hover:bg-[#F5F7F6] border border-[#DDE5E3] text-[#1F2A2E] font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#1E6B64]" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards (مبيعات، عدد الطلبات، متوسط قيمة الطلب، ملغية) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: المبيعات */}
        <div className="bg-white p-5 rounded-3xl border border-[#DDE5E3] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#1E6B64]">
            <span className="text-xs font-bold text-[#1F2A2E]/70">إجمالي المبيعات</span>
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-headline text-[#1F2A2E] font-mono">
            {formatPrice(totalSales)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            مستبعد منها الطلبات الملغية
          </div>
        </div>

        {/* KPI 2: عدد الطلبات */}
        <div className="bg-white p-5 rounded-3xl border border-[#DDE5E3] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#C23B22]">
            <span className="text-xs font-bold text-[#1F2A2E]/70">عدد الطلبات</span>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-headline text-[#1F2A2E] font-mono">
            {totalOrdersCount}
          </div>
          <div className="text-[11px] text-[#1F2A2E]/60">
            إجمالي المسجل بالفترة
          </div>
        </div>

        {/* KPI 3: متوسط قيمة الطلب */}
        <div className="bg-white p-5 rounded-3xl border border-[#DDE5E3] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-bold text-[#1F2A2E]/70">متوسط قيمة الطلب</span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-headline text-[#1F2A2E] font-mono">
            {formatPrice(avgOrderValue)}
          </div>
          <div className="text-[11px] text-[#1F2A2E]/60">
            متوسط سلة المشتريات
          </div>
        </div>

        {/* KPI 4: الطلبات الملغية */}
        <div className="bg-white p-5 rounded-3xl border border-[#DDE5E3] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-red-600">
            <span className="text-xs font-bold text-[#1F2A2E]/70">الطلبات الملغية</span>
            <XCircle className="w-5 h-5" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-headline text-red-600 font-mono">
            {cancelledCount}
          </div>
          <div className="text-[11px] text-red-500/80 font-medium">
            طلبات لم تكتمل
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Per Day Chart (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-[#DDE5E3] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1E6B64]" />
              <h2 className="font-headline font-bold text-sm text-[#1F2A2E]">
                المبيعات اليومية خلال الفترة
              </h2>
            </div>
            <span className="text-xs font-mono text-[#1F2A2E]/50">ج.م</span>
          </div>

          <div className="w-full h-72 min-h-[300px] pt-2" style={{ width: '100%', height: '300px', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
              <BarChart data={salesPerDayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} ج.م`, 'المبيعات']}
                  labelFormatter={(lbl) => `اليوم: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#1F2A2E',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    textAlign: 'right',
                    direction: 'rtl',
                  }}
                />
                <Bar dataKey="sales" fill="#1E6B64" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Split Pie Chart (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-[#DDE5E3] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#1E6B64]" />
            <h2 className="font-headline font-bold text-sm text-[#1F2A2E]">
              توزيع طرق الدفع
            </h2>
          </div>

          {paymentSplitData.length === 0 ? (
            <div className="w-full h-72 min-h-[300px] flex items-center justify-center text-xs text-[#1F2A2E]/40" style={{ height: '300px', minHeight: '300px' }}>
              لا توجد مبيعات في هذه الفترة
            </div>
          ) : (
            <div className="w-full h-72 min-h-[300px] flex flex-col items-center justify-center" style={{ height: '300px', minHeight: '300px' }}>
              <div className="w-full h-56 min-h-[220px]" style={{ width: '100%', height: '220px', minHeight: '220px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <PieChart>
                    <Pie
                      data={paymentSplitData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {paymentSplitData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val} طلب`, 'العدد']}
                      contentStyle={{
                        backgroundColor: '#1F2A2E',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        textAlign: 'right',
                        direction: 'rtl',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 text-xs pt-2">
                {paymentSplitData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[#1F2A2E]/80 font-bold">{item.name}</span>
                    <span className="font-mono text-[#1F2A2E]/60">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Items Bar Chart (Full Width or 12 cols) */}
        <div className="lg:col-span-12 bg-white p-5 sm:p-6 rounded-3xl border border-[#DDE5E3] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#C23B22]" />
            <h2 className="font-headline font-bold text-sm text-[#1F2A2E]">
              الأصناف الأكثر طلباً خلال الفترة
            </h2>
          </div>

          {topItemsData.length === 0 ? (
            <div className="w-full h-72 min-h-[300px] flex items-center justify-center text-xs text-[#1F2A2E]/40" style={{ height: '300px', minHeight: '300px' }}>
              لا توجد أصناف مباعة في الفترة المحددة
            </div>
          ) : (
            <div className="w-full h-72 min-h-[300px] pt-2" style={{ width: '100%', height: '300px', minHeight: '300px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                <BarChart
                  data={topItemsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#1F2A2E' }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} قطعة / وزن`, 'الكمية']}
                    contentStyle={{
                      backgroundColor: '#1F2A2E',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      textAlign: 'right',
                      direction: 'rtl',
                    }}
                  />
                  <Bar dataKey="count" fill="#C23B22" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders in Selected Range */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#DDE5E3]">
          <div>
            <h2 className="font-headline font-bold text-base text-[#1F2A2E]">
              أحدث طلبات الفترة المحددة ({orders.length})
            </h2>
            <p className="text-xs text-[#1F2A2E]/50 mt-0.5">
              قائمة الطلبات المشمولة في التحليلات الحالية
            </p>
          </div>

          <Link
            to="/admin/orders"
            className="text-xs text-[#1E6B64] font-bold hover:underline"
          >
            الانتقال للوحة الطلبات الحية ←
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#F5F7F6] text-[#1F2A2E]/70 font-bold border-b border-[#DDE5E3]">
              <tr>
                <th className="py-3 px-3">رقم الطلب</th>
                <th className="py-3 px-3">العميل</th>
                <th className="py-3 px-3">النوع</th>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">طريقة الدفع</th>
                <th className="py-3 px-3">الإجمالي</th>
                <th className="py-3 px-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE5E3]">
              {orders.slice(0, 10).map((ord) => (
                <tr key={ord.id} className="hover:bg-[#F5F7F6]/50 transition-colors">
                  <td className="py-3 px-3 font-headline font-bold text-[#1F2A2E]">
                    #{ord.orderNumber}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#1F2A2E]">
                    {ord.customer.name}
                  </td>
                  <td className="py-3 px-3 text-[#1F2A2E]/70">
                    {ord.delivery.type === 'delivery' ? 'توصيل' : 'استلام'}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-[#1F2A2E]/60">
                    {formatDate(ord.createdAt)} - {formatTime(ord.createdAt)}
                  </td>
                  <td className="py-3 px-3 text-[#1F2A2E]/80">
                    {ord.paymentMethod === 'cod'
                      ? 'كاش'
                      : ord.paymentMethod === 'card'
                      ? 'كارت'
                      : 'محفظة'}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#C23B22] font-mono">
                    {formatPrice(ord.total)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E6B64]/10 text-[#1E6B64]">
                      {statusArabicLabels[ord.status] || ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 30-Day Range Quota Warning Modal */}
      {showMonthWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-start space-y-4 shadow-xl border border-[#DDE5E3] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-[#1F2A2E]">
                  تنبيه استهلاك حصة القراءة
                </h3>
                <p className="text-xs text-[#1F2A2E]/60 mt-0.5">
                  خطة Firebase Spark المجانية
                </p>
              </div>
            </div>

            <p className="text-xs text-[#1F2A2E]/80 leading-relaxed bg-[#F5F7F6] p-3.5 rounded-2xl border border-[#DDE5E3]">
              استعراض بيانات آخر 30 يوماً يتطلب قراءة عدد كبير من المستندات وقد يستهلك جزءاً ملحوظاً من حصة القراءة اليومية المجانية (50,000 عملية). يُفضّل الاعتماد على ملخص «اليوم» أو «آخر 7 أيام».
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMonthWarningModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#1F2A2E]/70 hover:bg-[#F5F7F6] border border-[#DDE5E3] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMonthWarningModal(false);
                  setSelectedRange('month');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C23B22] text-white hover:bg-[#A6301A] shadow-xs cursor-pointer"
              >
                متابعة وعرض آخر 30 يوماً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
