import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
}) => {
  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border border-white/10 text-white font-medium text-sm transition-all animate-in fade-in slide-in-from-bottom bg-[#1F2A2E] max-w-sm w-full mx-4"
    >
      {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
      {type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
      {type === 'info' && <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />}
      <span className="flex-1 text-start leading-snug">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded text-white/60 hover:text-white"
          aria-label="إغلاق التنبيه"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
