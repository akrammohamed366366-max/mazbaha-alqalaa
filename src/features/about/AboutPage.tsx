import React from 'react';
import { useStore } from '../../app/providers/StoreContext';
import { AblaqStripe } from '../../components/ui/AblaqStripe';
import {
  Flame,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { settings, branch } = useStore();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 text-start pb-16 space-y-10">
      {/* Top Banner */}
      <div className="text-start space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E6B64]/10 text-[#1E6B64] text-xs font-bold">
          <Flame className="w-4 h-4" />
          <span>حكاية طعم من قلب قاهرة المعز</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-headline font-black text-[#1F2A2E]">
          عن {settings.nameAr}
        </h1>
        <p className="text-sm text-[#1F2A2E]/70 max-w-2xl leading-relaxed">
          نقدم تجربة مشويات مصرية أصيلة قائمة على جودة الشواء على الفحم والتتبيلات المتوارثة لتقديم أطباق الكباب والكفتة والريش بالطعم الحقيقي.
        </p>
      </div>

      <AblaqStripe height={4} />

      {/* Story Card */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 sm:p-8 shadow-xs space-y-6">
        <h2 className="text-xl font-headline font-bold text-[#1F2A2E]">
          أصالة المشويات على فحم السنديان
        </h2>
        <div className="space-y-4 text-xs sm:text-sm text-[#1F2A2E]/80 leading-relaxed">
          <p>
            تأسست {settings.nameAr} في جوار قاهرة المعز لتعيد تقديم مفهوم المشويات الشعبية الراقية، حيث يتم تجهيز اللحوم يومياً وتتبيلها بخلطة البصل والبهارات الطبيعية دون إضافات صناعية.
          </p>
          <p>
            نهتم بكل تفصيلة في دورة التحضير: بدءاً من ضبط حرارة الجمر وحتى التغليف الحراري المحكم لضمان وصول الطلب ساخناً ومدخناً كما لو كنت تتناوله أمام الشواية مباشرة.
          </p>
        </div>
      </div>

      {/* Branch & Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branch Info (One branch only: main) */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#1E6B64]">
            <MapPin className="w-5 h-5" />
            <h3 className="font-headline font-bold text-base text-[#1F2A2E]">
              {branch.nameAr}
            </h3>
          </div>
          <p className="text-xs text-[#1F2A2E]/70 leading-relaxed">
            العنوان: {branch.address || '[عنوان الفرع]'}
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-[#1F2A2E]/70">
            <Clock className="w-4 h-4 text-[#C23B22]" />
            <span>
              ساعات العمل: من {settings.hours.open} إلى {settings.hours.close}
            </span>
          </div>
        </div>

        {/* Contact Info (Placeholders from settings, phone 01xxxxxxxxx) */}
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#C23B22]">
            <Phone className="w-5 h-5" />
            <h3 className="font-headline font-bold text-base text-[#1F2A2E]">
              التواصل والاستفسار
            </h3>
          </div>
          <div className="space-y-2 text-xs text-[#1F2A2E]/70">
            <div className="flex items-center gap-2">
              <span className="font-bold">رقم الهاتف:</span>
              <span dir="ltr" className="font-mono">{settings.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">واتساب:</span>
              <span dir="ltr" className="font-mono">{settings.whatsapp}</span>
            </div>
          </div>
          <div className="pt-2">
            <a
              href={`https://wa.me/2${settings.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>مراسلتنا عبر واتساب</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
