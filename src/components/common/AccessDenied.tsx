import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { AblaqStripe } from '../ui/AblaqStripe';

interface AccessDeniedProps {
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  message = 'هذه الصفحة مخصصة لطاقم العمل المصرح لهم فقط. ليس لديك الصلاحيات الكافية للوصول إليها.',
}) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-[#DDE5E3] space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-10 h-10" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="font-headline font-black text-2xl text-[#1F2A2E]">
            ملكش صلاحية الدخول هنا
          </h1>
          <p className="text-xs text-[#1F2A2E]/70 leading-relaxed">
            {message}
          </p>
        </div>

        <AblaqStripe />

        <div className="pt-2">
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#1E6B64] hover:bg-[#17534d] text-white font-bold text-xs transition-colors shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>العودة للموقع</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
