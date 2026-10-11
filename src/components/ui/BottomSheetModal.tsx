import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-xl',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1F2A2E]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Content Container: Bottom sheet on mobile, centered modal on desktop */}
      <div
        className={`relative z-10 w-full ${maxWidth} bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border-t md:border border-[#DDE5E3] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200`}
      >
        {/* Mobile handle indicator */}
        <div className="md:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-[#DDE5E3] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#DDE5E3]">
          {title ? (
            <h2 className="text-lg font-bold font-headline text-[#1F2A2E]">
              {title}
            </h2>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-[#F5F7F6] transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto overflow-x-hidden text-start">
          {children}
        </div>
      </div>
    </div>
  );
};
