import React from 'react';
import { OrderRecord } from '../../types';
import { formatPrice, formatTime, formatDate } from '../../lib/format';
import { Printer, X } from 'lucide-react';

interface OrderReceiptPrintProps {
  order: OrderRecord;
  onClose: () => void;
}

export const OrderReceiptPrint: React.FC<OrderReceiptPrintProps> = ({ order, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const deliveryTypeLabel = order.delivery.type === 'delivery' ? 'توصيل للمنزل' : 'استلام من الفرع';
  const paymentMethodLabel =
    order.paymentMethod === 'cod'
      ? 'كاش عند الاستلام'
      : order.paymentMethod === 'card'
      ? 'بطاقة بنكية'
      : 'محفظة إلكترونية';

  const paymentStatusLabel = order.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع';

  return (
    <div className="fixed inset-0 z-50 bg-[#1F2A2E]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Container modal */}
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-[#DDE5E3] flex flex-col max-h-[90vh]">
        {/* Modal Controls (Hidden in print) */}
        <div className="p-4 bg-[#F5F7F6] border-b border-[#DDE5E3] flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#1E6B64]" />
            <span className="font-headline font-bold text-sm text-[#1F2A2E]">
              فاتورة 80 مم للطلب #{order.orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#1E6B64] hover:bg-[#17534d] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-black/5 rounded-xl cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 80mm Receipt Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-white flex justify-center">
          <div
            id="receipt-print-area"
            className="w-[80mm] max-w-full text-black font-mono text-xs leading-tight bg-white p-2 select-text text-start"
            style={{ direction: 'rtl' }}
          >
            {/* Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-black space-y-1">
              <h2 className="text-base font-bold font-sans">مزبحة القلعة للمشويات</h2>
              <p className="text-[11px]">أصول المشويات على الفحم</p>
              <div className="text-[10px] text-gray-700">فرع القلعة الرئيسي</div>
            </div>

            {/* Order meta */}
            <div className="py-2.5 border-b border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between font-bold text-sm">
                <span>طلب: #{order.orderNumber}</span>
                <span>{order.source === 'phone' ? 'تليفوني' : 'أونلاين'}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ:</span>
                <span>{formatDate(order.createdAt)} - {formatTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>النوع:</span>
                <span>{deliveryTypeLabel}</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="py-2.5 border-b border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>العميل:</span>
                <span className="font-bold">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>الهاتف:</span>
                <span className="font-bold" style={{ direction: 'ltr' }}>{order.customer.phone}</span>
              </div>

              {order.delivery.type === 'delivery' && (
                <div className="pt-1 text-[10px] space-y-0.5">
                  <div className="font-bold">عنوان التوصيل:</div>
                  <div>
                    {order.delivery.zoneName && `المنطقة: ${order.delivery.zoneName} - `}
                    {order.delivery.address?.street}
                  </div>
                  {(order.delivery.address?.building || order.delivery.address?.floor || order.delivery.address?.apartment) && (
                    <div>
                      {order.delivery.address.building && `عمارة: ${order.delivery.address.building} `}
                      {order.delivery.address.floor && `دور: ${order.delivery.address.floor} `}
                      {order.delivery.address.apartment && `شقة: ${order.delivery.address.apartment}`}
                    </div>
                  )}
                  {order.delivery.address?.landmark && (
                    <div>علامة مميزة: {order.delivery.address.landmark}</div>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2.5 border-b-2 border-dashed border-black">
              <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-black">
                <span>الصنف</span>
                <span>الكمية</span>
                <span>السعر</span>
              </div>
              <div className="divide-y divide-gray-200 py-1 space-y-1.5">
                {order.items.map((it, idx) => (
                  <div key={idx} className="pt-1 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span className="leading-snug">{it.name}</span>
                      <span className="px-2">×{it.qty}</span>
                      <span>{formatPrice(it.lineTotal)}</span>
                    </div>
                    <div className="text-[10px] text-gray-600">
                      الحجم: {it.variantLabel} ({formatPrice(it.unitPrice)})
                    </div>
                    {it.note && (
                      <div className="text-[10px] bg-gray-100 p-0.5 mt-0.5 rounded">
                        ملاحظة: {it.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b-2 border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.delivery.type === 'delivery' && (
                <div className="flex justify-between">
                  <span>خدمة التوصيل:</span>
                  <span>{formatPrice(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-black">
                <span>الإجمالي النهائي:</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>

            {/* Payment & Notes */}
            <div className="py-2 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span className="font-bold">{paymentMethodLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>حالة الدفع:</span>
                <span className="font-bold">{paymentStatusLabel}</span>
              </div>
              {order.notes && (
                <div className="pt-1 text-[10px] border-t border-dashed border-gray-400">
                  <span className="font-bold">ملاحظات الطلب: </span>
                  <span>{order.notes}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t-2 border-dashed border-black space-y-1 text-[10px]">
              <p className="font-bold font-sans">شكراً لطلبكم من مزبحة القلعة</p>
              <p>بالهناء والشفاء</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
