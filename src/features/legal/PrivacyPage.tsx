import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { AblaqStripe } from '../../components/ui/AblaqStripe';

export const PrivacyPage: React.FC = () => {
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
            سياسة الخصوصية
          </h1>
          <p className="text-xs text-[#1F2A2E]/60">
            كيف نحمي بياناتك ومعلوماتك الشخصية
          </p>
        </div>
      </div>

      {/* Temporary Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2 font-bold">
        <Lock className="w-4 h-4 shrink-0 text-amber-700" />
        <span>[نص مؤقت: راجعه صاحب المطعم]</span>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 sm:p-8 space-y-6 text-xs text-[#1F2A2E]/80 leading-relaxed shadow-xs">
        <section className="space-y-2">
          <h2 className="text-sm font-headline font-bold text-[#1F2A2E]">
            1. جمع البيانات واستخدامها
          </h2>
          <p>
            نقوم بجمع بيانات الاسم ورقم الهاتف وعنوان التوصيل حصرياً لتنفيذ طلبات التوصيل وتحديثك بحالة الطلب. لا نقوم بمشاركة أي بيانات مع أطراف خارجية.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-headline font-bold text-[#1F2A2E]">
            2. حماية الحسابات
          </h2>
          <p>
            تتم معالجة بيانات المصادقة وكلمات المرور بأمان تام من خلال منظومة Firebase المشفرة، ولا يمكن لأي موظف الاطلاع على كلمات مرور العملاء.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-headline font-bold text-[#1F2A2E]">
            3. حقوق العميل
          </h2>
          <p>
            يحق لك في أي وقت تعديل بياناتك الشخصية وعناوين التوصيل المسجلة عبر صفحة "حسابي".
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
