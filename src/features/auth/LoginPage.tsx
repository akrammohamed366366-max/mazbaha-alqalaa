import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  signInCustomerWithEmail,
  signInCustomerWithGoogle,
  registerCustomer,
  resendVerificationEmail,
  reloadCurrentUser,
  mapAuthError,
  getStaffProfile,
} from '../../firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { getStaffHome } from '../../hooks/usePermissions';
import { Button } from '../../components/ui/Button';
import { AblaqStripe } from '../../components/ui/AblaqStripe';
import {
  Flame,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  Phone,
  User,
  AlertCircle,
  CheckCircle,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  Send,
} from 'lucide-react';

const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/;

export const LoginPage: React.FC = () => {
  const { user: currentAuthUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Parse redirect query parameter
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect');

  // Tab state: 'login' | 'signup'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Email verification prompt state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Enforce noindex on /login
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
      created = true;
    }
    metaRobots.content = 'noindex, nofollow';

    return () => {
      if (created && metaRobots && metaRobots.parentNode) {
        metaRobots.parentNode.removeChild(metaRobots);
      } else if (metaRobots) {
        metaRobots.content = 'index, follow';
      }
    };
  }, []);

  // Helper to handle post-login routing
  const handlePostLoginRedirect = async (uid: string) => {
    if (redirectTarget) {
      navigate(redirectTarget, { replace: true });
      return;
    }

    try {
      const staff = await getStaffProfile(uid);
      if (staff && staff.active) {
        const canFn = (p: string) => staff.role === 'admin' || !!(staff.permissions as Record<string, boolean | undefined>)?.[p];
        const staffHome = getStaffHome(canFn);
        navigate(staffHome, { replace: true });
        return;
      }
    } catch {
      // Fall through to customer home
    }

    navigate('/', { replace: true });
  };

  // If already logged in and verified (and not actively registering)
  useEffect(() => {
    if (currentAuthUser && !showVerification) {
      handlePostLoginRedirect(currentAuthUser.uid);
    }
  }, [currentAuthUser]);

  // Google sign in
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await signInCustomerWithGoogle();
      await handlePostLoginRedirect(user.uid);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(mapAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const user = await signInCustomerWithEmail(email, password);
      await handlePostLoginRedirect(user.uid);
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Email sign up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال الاسم بالكامل');
      return;
    }
    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!phone.trim() || !EGYPTIAN_PHONE_REGEX.test(phone.trim())) {
      setError('رقم الموبايل يجب أن يتكون من 11 رقماً ويبدأ بـ 01 (010, 011, 012, 015)');
      return;
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب ألا تقل عن 8 أحرف');
      return;
    }
    if (!agreedToTerms) {
      setError('يجب الموافقة على الشروط وسياسة الخصوصية للمتابعة');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const user = await registerCustomer(email, password, name, phone);
      setShowVerification(true);
      setVerificationSent(true);
      setSuccessMsg('تم إنشاء الحساب بنجاح! تم إرسال رابط تأكيد إلى بريدك الإلكتروني.');
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    if (!currentAuthUser) return;
    setLoading(true);
    setError(null);
    try {
      await resendVerificationEmail(currentAuthUser);
      setVerificationSent(true);
      setSuccessMsg('تمت إعادة إرسال رابط التفعيل، يرجى فحص صندوق الوارد أو الرسائل غير المرغوب فيها.');
    } catch (err: any) {
      setError('تعذر إرسال الرابط مجدداً، يرجى الانتظار دقيقة والمحاولة.');
    } finally {
      setLoading(false);
    }
  };

  // Check verification state
  const handleCheckVerification = async () => {
    if (!currentAuthUser) return;
    setCheckingVerification(true);
    setError(null);
    try {
      const isVerified = await reloadCurrentUser(currentAuthUser);
      if (isVerified) {
        setShowVerification(false);
        await handlePostLoginRedirect(currentAuthUser.uid);
      } else {
        setError('لم يتم تأكيد البريد الإلكتروني بعد. يرجى الضغط على الرابط في الرسالة.');
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء فحص حالة التفعيل، يرجى المحاولة ثانية.');
    } finally {
      setCheckingVerification(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 text-start" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#DDE5E3] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#C23B22] text-white flex items-center justify-center mx-auto shadow-xs">
            <Flame className="w-7 h-7" />
          </div>
          <h1 className="font-headline font-black text-2xl text-[#1F2A2E]">
            مذبحة القلعة
          </h1>
          <p className="text-xs text-[#1F2A2E]/60">
            تسجيل دخول العملاء وطاقم العمل
          </p>
        </div>

        {/* Checkout Intent Banner */}
        {redirectTarget === '/checkout' && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2.5 font-bold shadow-xs">
            <ShoppingBag className="w-4 h-4 text-amber-700 shrink-0" />
            <span>سجّل دخولك عشان تكمّل الطلب، سلتك محفوظة</span>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Verification View after sign up */}
        {showVerification ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-[#1E6B64]/10 text-[#1E6B64] flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold font-headline text-[#1F2A2E]">
                فعّل بريدك الإلكتروني
              </h2>
              <p className="text-xs text-[#1F2A2E]/70 leading-relaxed max-w-xs mx-auto">
                أرسلنا رابط التحقق إلى <span className="font-bold text-[#1F2A2E]">{email}</span>. يرجى الضغط عليه لتفعيل الحساب.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleCheckVerification}
                disabled={checkingVerification}
                className="w-full bg-[#1E6B64] hover:bg-[#17534d]"
              >
                {checkingVerification ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin ms-2" />
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ms-2" />
                    <span>خلصت التفعيل</span>
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading}
                className="text-xs font-bold text-[#1E6B64] hover:underline py-2 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>أعد إرسال الرابط</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Google One-Click Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl border border-[#DDE5E3] bg-[#F5F7F6] hover:bg-white text-[#1F2A2E] font-bold text-xs flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>المتابعة باستخدام Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#DDE5E3] w-full" />
              <span className="bg-white px-3 text-[11px] text-[#1F2A2E]/50 shrink-0">
                أو باستخدام البريد الإلكتروني
              </span>
            </div>

            {/* Tabs (دخول / حساب جديد) */}
            <div className="grid grid-cols-2 p-1 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white text-[#1F2A2E] shadow-xs'
                    : 'text-[#1F2A2E]/60 hover:text-[#1F2A2E]'
                }`}
              >
                دخول
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-white text-[#1F2A2E] shadow-xs'
                    : 'text-[#1F2A2E]/60 hover:text-[#1F2A2E]'
                }`}
              >
                حساب جديد
              </button>
            </div>

            {/* Tab 1: Login Form */}
            {activeTab === 'login' ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                    البريد الإلكتروني <span className="text-[#C23B22]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      maxLength={100}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 ps-9 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] transition-all font-mono"
                    />
                    <Mail className="w-4 h-4 text-[#1F2A2E]/40 absolute top-3 start-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                    كلمة المرور <span className="text-[#C23B22]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 ps-9 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] transition-all font-mono"
                    />
                    <Lock className="w-4 h-4 text-[#1F2A2E]/40 absolute top-3 start-3" />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading}
                  className="w-full bg-[#1E6B64] hover:bg-[#17534d]"
                >
                  {loading ? (
                    <span>جاري تسجيل الدخول...</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 ms-2" />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* Tab 2: Sign-up Form */
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                    الاسم بالكامل <span className="text-[#C23B22]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: أحمد عبد الله"
                      className="w-full px-3.5 py-2.5 ps-9 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] transition-all"
                    />
                    <User className="w-4 h-4 text-[#1F2A2E]/40 absolute top-3 start-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                    البريد الإلكتروني <span className="text-[#C23B22]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      maxLength={100}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 ps-9 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] transition-all font-mono"
                    />
                    <Mail className="w-4 h-4 text-[#1F2A2E]/40 absolute top-3 start-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                    رقم الموبايل <span className="text-[#C23B22]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      maxLength={11}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 ps-9 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] transition-all font-mono"
                    />
                    <Phone className="w-4 h-4 text-[#1F2A2E]/40 absolute top-3 start-3" />
                  </div>
                  <p className="text-[10px] text-[#1F2A2E]/50 mt-1">
                    11 رقم يبدأ بـ 01 (فودافون، أورنج، اتصالات، وي)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                    كلمة المرور (8 أحرف أو أكثر) <span className="text-[#C23B22]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 ps-9 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] transition-all font-mono"
                    />
                    <Lock className="w-4 h-4 text-[#1F2A2E]/40 absolute top-3 start-3" />
                  </div>
                </div>

                {/* Terms and Privacy Checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms-check"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 rounded text-[#1E6B64] focus:ring-[#1E6B64] cursor-pointer"
                  />
                  <label htmlFor="terms-check" className="text-[11px] text-[#1F2A2E]/80 leading-snug cursor-pointer select-none">
                    أوافق على{' '}
                    <Link to="/terms" target="_blank" className="text-[#1E6B64] font-bold underline">
                      الشروط والأحكام
                    </Link>{' '}
                    و{' '}
                    <Link to="/privacy" target="_blank" className="text-[#1E6B64] font-bold underline">
                      سياسة الخصوصية
                    </Link>
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !agreedToTerms}
                  className="w-full bg-[#1E6B64] hover:bg-[#17534d]"
                >
                  {loading ? (
                    <span>جاري إنشاء الحساب...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 ms-2" />
                      <span>إنشاء الحساب</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </>
        )}

        <AblaqStripe />
      </div>
    </div>
  );
};
