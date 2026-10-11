import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'outline',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as PWA standalone, don't show
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    const baseClasses =
      variant === 'primary'
        ? 'bg-[#1E6B64] hover:bg-[#17544e] text-white shadow-sm'
        : variant === 'compact'
        ? 'bg-[#F5F7F6] text-[#1E6B64] hover:bg-[#DDE5E3] border border-[#DDE5E3]'
        : 'border border-[#1E6B64] text-[#1E6B64] hover:bg-[#1E6B64]/5 bg-white';

    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="تثبيت التطبيق على الجهاز"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E6B64] ${baseClasses} ${className}`}
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="تعليمات تثبيت التطبيق على آيفون"
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#DDE5E3] text-[#1F2A2E] hover:bg-black/5 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E6B64] ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-[#1E6B64]" aria-hidden="true" />
          <span>تثبيت على الهاتف</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#DDE5E3] text-right font-sans">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="إغلاق نافذة التثبيت"
                  className="p-1 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
                <h3 id="ios-install-title" className="text-base font-bold text-[#1F2A2E]">
                  تثبيت التطبيق على آيفون / آيباد
                </h3>
              </div>
              <div className="space-y-3 text-xs text-[#1F2A2E]/80 leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[#1E6B64]">1.</span>
                  اضغط على زر المشاركة (Share) في شريط متصفح سفاري بالأسفل.
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[#1E6B64]">2.</span>
                  مرر للأسفل واختر &ldquo;إضافة إلى الشاشة الرئيسية&rdquo; (Add to Home Screen).
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[#1E6B64]">3.</span>
                  اضغط على &ldquo;إضافة&rdquo; لتشغيل التطبيق كشاشة كاشير كاملة بدون شريط المتصفح.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#1E6B64] py-2 text-xs font-bold text-white hover:bg-[#17544e] transition-colors"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
