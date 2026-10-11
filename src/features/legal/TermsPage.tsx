import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { AblaqStripe } from '../../components/ui/AblaqStripe';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16 text-start space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#DDE5E3]">
        <Link
          to="/"
          className="p-2 rounded-xl text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-white transition-colors"
          aria-label="العودة للرئيسية"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-headline font-black text-[#1F2A2E]">
            الشروط والأحكام
          </h1>
          <p className="text-xs text-[#1F2A2E]/60">
            شروط استخدام خدمات طلب المشويات والتوصيل
          </p>
        </div>
      </div>

      {/* Temporary Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2 font-bold">
        <FileText className="w-4 h-4 shrink-0 text-amber-700" />
        <span>[نص مؤقت: راجعه صاحب المطعم]</span>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 sm:p-8 space-y-6 text-xs text-[#1F2A2E]/80 leading-relaxed shadow-xs">
        <section className="space-y-2">
          <h2 className="text-sm font-headline font-bold text-[#1F2A2E]">
            1. الطلبات والتأكيد
          </h2>
          <p>
            تخضع جميع الطلبات المقدمة عبر الموقع لتوفر الأصناف اليومية وموافقة إدارة المطعم وفقاً لساعات العمل الرسمية.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-headline font-bold text-[#1F2A2E]">
            2. الأسعار وطرق الدفع
          </h2>
          <p>
            جميع الأسعار المعلنة بالجنيه المصري (ج.م). الدفع متاح نقداً عند الاستلام (كاش) أو عبر التحويلات المعتمدة (فودافون كاش / إنستاباي).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-headline font-bold text-[#1F2A2E]">
            3. التوصيل والإلغاء
          </h2>
          <p>
            يتم التوصيل وفقاً للنطاقات والمناطق المحددة. يمكن إلغاء الطلب من خلال التواصل المباشر مع المطعم قبل بدء مرحلة الشواء والتجهيز.
          </p>
        </section>

        <AblaqStripe />

        <div className="text-[11px] text-[#1F2A2E]/50">
          آخر تحديث: 2026-10-08
        </div>
      </div>
    </div>
  );
};
