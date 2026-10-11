import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Flame, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F5F7F6] text-[#1F2A2E] flex flex-col items-center justify-center p-6 text-center font-sans antialiased" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-[#DDE5E3] space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center mx-auto shadow-inner">
              <Flame className="w-8 h-8" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h1 className="font-headline font-bold text-2xl text-[#1F2A2E]">
                عفواً، حدث خطأ غير متوقع
              </h1>
              <p className="text-sm text-[#1F2A2E]/70 leading-relaxed">
                نعتذر عن هذا الخطأ المؤقت. يجري العمل على ضمان أفضل استقرار لمنظومة التشغيل.
              </p>
            </div>

            <div className="ablaq-stripe rounded-full opacity-60" />

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#1E6B64] text-white font-bold text-sm shadow-md hover:bg-[#17544e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E6B64]"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>إعادة المحاولة</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-[#DDE5E3] text-[#1F2A2E] font-bold text-sm bg-white hover:bg-[#F5F7F6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E6B64]"
              >
                <Home className="w-4 h-4 text-[#1E6B64]" aria-hidden="true" />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
