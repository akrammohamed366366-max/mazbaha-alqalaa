import React, { useState, useEffect } from 'react';
import { OrderRecord, StaffUser } from '../../types';
import { formatPrice, formatTime, formatDate } from '../../lib/format';
import {
  X,
  Phone,
  MapPin,
  Clock,
  Printer,
  CheckCircle2,
  Bike,
  Banknote,
  Send,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import { subscribeDrivers, assignOrderDriverInDb, updateOrderPaymentStatusInDb } from '../../firebase/db';
import { usePermissions } from '../../hooks/usePermissions';
import { OrderReceiptPrint } from './OrderReceiptPrint';

interface OrderDrawerProps {
  order: OrderRecord | null;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: any, extra?: any) => Promise<void>;
  currentRole?: string | null;
}

export const OrderDrawer: React.FC<OrderDrawerProps> = ({
  order,
  onClose,
  onStatusChange,
  currentRole,
}) => {
  const { can } = usePermissions();
  const canConfirmPayment = can('payments_confirm') || can('orders_manage');

  const [drivers, setDrivers] = useState<StaffUser[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Subscribe to drivers with where('role','==','driver')
  useEffect(() => {
    const unsub = subscribeDrivers((driverList) => {
      setDrivers(driverList.filter((d) => d.active !== false));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (order?.driverId) {
      setSelectedDriverId(order.driverId);
    } else {
      setSelectedDriverId('');
    }
    setActionError(null);
  }, [order?.id, order?.driverId]);

  if (!order) return null;

  const handleAssignDriver = async (driverId: string) => {
    if (!driverId) return;
    setActionError(null);
    setIsAssigningDriver(true);
    try {
      const driver = drivers.find((d) => d.id === driverId);
      const driverName = driver?.name || 'مندوب توصيل';
      await assignOrderDriverInDb(order.id, driverId, driverName);
      setSelectedDriverId(driverId);
    } catch (err: any) {
      console.error('Assign driver error:', err);
      setActionError('تعذر تعيين مندوب التوصيل: ' + (err.message || 'خطأ في الصلاحيات'));
    } finally {
      setIsAssigningDriver(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!canConfirmPayment) {
      setActionError('ليس لديك صلاحية تأكيد السداد أو تحصيل المبالغ');
      return;
    }
    setActionError(null);
    setIsUpdatingPayment(true);
    try {
      await updateOrderPaymentStatusInDb(order.id, 'paid');
    } catch (err: any) {
      console.error('Confirm paid error:', err);
      setActionError('تعذر تأكيد الدفع: ' + (err.message || 'خطأ في الصلاحيات'));
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const statusArabicLabels: Record<string, string> = {
    new: 'جديد',
    accepted: 'مقبول',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    out_for_delivery: 'خرج للتوصيل',
    delivered: 'تم التوصيل',
    cancelled: 'ملغي',
  };

  const paymentChipText =
    order.paymentMethod === 'cod'
      ? 'كاش'
      : order.transferRef
      ? `تحويل: ${order.transferRef}`
      : 'تحويل';

  return (
    <>
      {/* Drawer Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#1F2A2E]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div
        className="fixed inset-y-0 left-0 max-w-full flex z-50 animate-in slide-in-from-left duration-200"
        style={{ direction: 'rtl' }}
      >
        <div className="w-screen max-w-md bg-white border-r border-[#DDE5E3] shadow-2xl flex flex-col h-full text-start">
          {/* Drawer Top Header */}
          <div className="p-4 sm:p-5 border-b border-[#DDE5E3] flex items-center justify-between bg-[#F5F7F6]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline font-black text-lg text-[#1F2A2E]">
                  طلب #{order.orderNumber}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#1E6B64]/10 text-[#1E6B64]">
                  {statusArabicLabels[order.status] || order.status}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/5 text-[#1F2A2E]/70">
                  {order.source === 'phone' ? 'تليفوني' : 'متجر إلكتروني'}
                </span>
              </div>
              <div className="text-[11px] text-[#1F2A2E]/50 mt-1 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-[#1F2A2E]/40" />
                <span>{formatDate(order.createdAt)} - {formatTime(order.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="p-2 rounded-xl text-[#1E6B64] hover:bg-[#1E6B64]/10 transition-colors cursor-pointer"
                title="طباعة الفاتورة 80مم"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-black/5 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Error Banner */}
          {actionError && (
            <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {/* Customer & Call Link */}
            <div className="p-4 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] space-y-2">
              <div className="text-[10px] text-[#1F2A2E]/50 font-bold uppercase tracking-wider">
                بيانات العميل
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[#1F2A2E] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#1E6B64]" />
                    <span>{order.customer.name}</span>
                  </div>
                  <div className="text-xs text-[#1F2A2E]/70 font-mono mt-0.5">
                    {order.customer.phone}
                  </div>
                </div>

                <a
                  href={`tel:${order.customer.phone}`}
                  className="px-3.5 py-2 bg-[#1E6B64] hover:bg-[#17534d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>اتصال</span>
                </a>
              </div>
            </div>

            {/* Delivery Address Details */}
            <div className="space-y-2">
              <div className="text-[10px] text-[#1F2A2E]/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1E6B64]" />
                <span>طريقة الاستلام والعنوان</span>
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-[#DDE5E3] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#1F2A2E]/70">نوع الطلب:</span>
                  <span className="font-bold text-[#1F2A2E]">
                    {order.delivery.type === 'delivery' ? 'توصيل دليفري' : 'استلام من الفرع'}
                  </span>
                </div>

                {order.delivery.type === 'delivery' && (
                  <>
                    {order.delivery.zoneName && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#1F2A2E]/70">منطقة التوصيل:</span>
                        <span className="font-bold text-[#1E6B64]">{order.delivery.zoneName}</span>
                      </div>
                    )}

                    {order.delivery.address && (
                      <div className="pt-2 border-t border-[#DDE5E3] space-y-1">
                        <div className="font-bold text-[#1F2A2E] leading-relaxed">
                          {order.delivery.address.street}
                        </div>
                        {(order.delivery.address.building ||
                          order.delivery.address.floor ||
                          order.delivery.address.apartment) && (
                          <div className="text-[11px] text-[#1F2A2E]/70">
                            {order.delivery.address.building && `عمارة: ${order.delivery.address.building} `}
                            {order.delivery.address.floor && `دور: ${order.delivery.address.floor} `}
                            {order.delivery.address.apartment && `شقة: ${order.delivery.address.apartment}`}
                          </div>
                        )}
                        {order.delivery.address.landmark && (
                          <div className="text-[11px] text-[#1F2A2E]/60">
                            علامة مميزة: {order.delivery.address.landmark}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {order.notes && (
                  <div className="pt-2 border-t border-[#DDE5E3] text-[11px] bg-amber-500/10 text-amber-900 p-2 rounded-xl">
                    <span className="font-bold">ملاحظات العميل: </span>
                    <span>{order.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Driver Assignment (for delivery orders) */}
            {order.delivery.type === 'delivery' && (
              <div className="space-y-2">
                <div className="text-[10px] text-[#1F2A2E]/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-[#1E6B64]" />
                  <span>مندوب التوصيل</span>
                </div>
                <div className="p-3.5 bg-white rounded-2xl border border-[#DDE5E3] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#1F2A2E]/70">المندوب الحالي:</span>
                    <span className="font-bold text-[#1F2A2E]">
                      {order.driverName || 'لم يتم التعيين بعد'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDriverId}
                      onChange={(e) => handleAssignDriver(e.target.value)}
                      disabled={isAssigningDriver || order.status === 'delivered' || order.status === 'cancelled'}
                      className="flex-1 p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64] cursor-pointer"
                    >
                      <option value="">-- اختر مندوب التوصيل --</option>
                      {drivers.map((drv) => (
                        <option key={drv.id} value={drv.id}>
                          {drv.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Payment & Status Handling */}
            <div className="space-y-2">
              <div className="text-[10px] text-[#1F2A2E]/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-[#1E6B64]" />
                <span>طريقة الدفع والتحصيل</span>
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-[#DDE5E3] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#1F2A2E]/70 font-medium">طريقة الدفع:</span>
                  <span className="font-bold text-[#1F2A2E] px-2.5 py-1 rounded-lg bg-[#F5F7F6] border border-[#DDE5E3]">
                    {paymentChipText}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#1F2A2E]/70 font-medium">حالة السداد:</span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                      order.paymentStatus === 'paid'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {order.paymentStatus === 'paid' ? 'تم الدفع' : 'غير مدفوع'}
                  </span>
                </div>

                {/* Payment Action: Confirm Transfer / Collect Cash */}
                <div className="pt-2 border-t border-[#DDE5E3]">
                  {order.paymentStatus === 'paid' ? (
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        {order.paymentMethod === 'transfer'
                          ? 'تم التأكد من التحويل بنجاح'
                          : 'تم تحصيل الكاش بنجاح'}
                      </span>
                    </div>
                  ) : canConfirmPayment ? (
                    <button
                      type="button"
                      onClick={handleConfirmPaid}
                      disabled={isUpdatingPayment}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isUpdatingPayment
                          ? 'جاري التسجيل...'
                          : order.paymentMethod === 'transfer'
                          ? 'تم التأكد من التحويل'
                          : 'تم تحصيل الكاش'}
                      </span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-[#1F2A2E]/50 text-center italic">
                      في انتظار تأكيد التحصيل من الكاشير أو مدير التشغيل
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-2">
              <div className="text-[10px] text-[#1F2A2E]/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#1E6B64]" />
                <span>أصناف الطلب ({order.items.length})</span>
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-[#DDE5E3] divide-y divide-[#DDE5E3] text-xs space-y-2">
                {order.items.map((it, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 space-y-1">
                    <div className="flex justify-between font-bold text-[#1F2A2E]">
                      <span>{it.qty} × {it.name}</span>
                      <span className="font-mono">{formatPrice(it.lineTotal)}</span>
                    </div>
                    <div className="text-[11px] text-[#1F2A2E]/60 flex justify-between">
                      <span>الوزن / الحجم: {it.variantLabel}</span>
                      <span>سعر الوحدة: {formatPrice(it.unitPrice)}</span>
                    </div>
                    {it.note && (
                      <div className="text-[10px] text-amber-900 bg-amber-50 p-1 rounded-md">
                        ملاحظة: {it.note}
                      </div>
                    )}
                  </div>
                ))}

                {/* Subtotal & Delivery & Total */}
                <div className="pt-3 space-y-1.5 border-t border-[#DDE5E3]">
                  <div className="flex justify-between text-[#1F2A2E]/70">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono">{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.delivery.type === 'delivery' && (
                    <div className="flex justify-between text-[#1F2A2E]/70">
                      <span>خدمة التوصيل:</span>
                      <span className="font-mono">{formatPrice(order.deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-headline font-bold text-sm text-[#C23B22] pt-1 border-t border-[#DDE5E3]">
                    <span>الإجمالي:</span>
                    <span className="font-mono">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status History (statusLog) */}
            <div className="space-y-2">
              <div className="text-[10px] text-[#1F2A2E]/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1E6B64]" />
                <span>سجل حركة الطلب</span>
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-[#DDE5E3] space-y-3">
                {(order.statusLog || []).map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#1E6B64] mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-[#1F2A2E]">
                        {statusArabicLabels[entry.status] || entry.status}
                      </div>
                      <div className="text-[10px] text-[#1F2A2E]/50 font-mono">
                        {formatDate(entry.at)} - {formatTime(entry.at)} (بواسطة: {entry.by})
                      </div>
                    </div>
                  </div>
                ))}
                {order.cancelReason && (
                  <div className="p-2 bg-red-50 text-red-800 rounded-xl text-xs">
                    <span className="font-bold">سبب الإلغاء: </span>
                    <span>{order.cancelReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#DDE5E3] bg-[#F5F7F6] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex-1 py-2.5 px-4 bg-white hover:bg-black/5 border border-[#DDE5E3] text-[#1F2A2E] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#1E6B64]" />
              <span>طباعة إيصال</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-6 bg-[#1F2A2E] hover:bg-[#28363B] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* 80mm Print Modal */}
      {showPrintModal && (
        <OrderReceiptPrint order={order} onClose={() => setShowPrintModal(false)} />
      )}
    </>
  );
};
