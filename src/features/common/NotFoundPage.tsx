import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Home } from 'lucide-react';
import { AblaqStripe } from '../../components/ui/AblaqStripe';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-[#DDE5E3] space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-[#1E6B64]/10 text-[#1E6B64] flex items-center justify-center mx-auto">
          <UtensilsCrossed className="w-10 h-10" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#C23B22]/10 text-[#C23B22]">
            خطأ 404
          </span>
          <h1 className="font-headline font-bold text-2xl text-[#1F2A2E]">
            الصفحة غير موجودة
          </h1>
          <p className="text-sm text-[#1F2A2E]/70 leading-relaxed">
            عفواً، الصفحة التي تبحث عنها غير متوفرة أو ربما تم تغيير الرابط. تفضل بالاطلاع على قائمة طعامنا الطازجة.
          </p>
        </div>

        <AblaqStripe />

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/menu"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#C23B22] text-white font-bold text-sm shadow-sm hover:bg-[#a6301a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C23B22]"
          >
            <UtensilsCrossed className="w-4 h-4" aria-hidden="true" />
            <span>قائمة الطعام</span>
          </Link>

          <Link
            to="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-[#DDE5E3] text-[#1F2A2E] font-bold text-sm bg-[#F5F7F6] hover:bg-[#DDE5E3]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E6B64]"
          >
            <Home className="w-4 h-4 text-[#1E6B64]" aria-hidden="true" />
            <span>الرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
