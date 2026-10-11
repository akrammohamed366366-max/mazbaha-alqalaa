import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getCustomerProfile, saveCustomerProfile, resendVerificationEmail, reloadCurrentUser } from '../../firebase/auth';
import { UserProfile, OrderDeliveryAddress } from '../../types';
import { Button } from '../../components/ui/Button';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { AblaqStripe } from '../../components/ui/AblaqStripe';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Clock,
  LogOut,
  Send,
  Building,
} from 'lucide-react';

const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/;

export const AccountPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states for basic info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Address modal state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [landmark, setLandmark] = useState('');

  // Verification state
  const [resendingVerification, setResendingVerification] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(user?.emailVerified ?? false);

  // Enforce noindex on /account
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

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/account', { replace: true });
      return;
    }

    setIsEmailVerified(user.emailVerified);

    setLoading(true);
    getCustomerProfile(user.uid)
      .then((data) => {
        if (data) {
          setProfile(data);
          setName(data.name || user.displayName || '');
          setPhone(data.phone || '');
        } else {
          setName(user.displayName || '');
          setPhone('');
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      setMsg({ text: 'يرجى إدخال الاسم بالكامل', type: 'error' });
      return;
    }

    if (phone.trim() && !EGYPTIAN_PHONE_REGEX.test(phone.trim())) {
      setMsg({
        text: 'رقم الموبايل يجب أن يتكون من 11 رقماً ويبدأ بـ 01 (010, 011, 012, 015)',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      await saveCustomerProfile(user.uid, {
        name: name.trim().slice(0, 80),
        phone: phone.trim(),
        addresses: profile?.addresses || [],
      });
      setMsg({ text: 'تم حفظ البيانات بنجاح', type: 'success' });
    } catch (err: any) {
      setMsg({ text: 'حدث خطأ أثناء حفظ البيانات: ' + (err.message || ''), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Open address modal for create or edit
  const handleOpenAddAddress = () => {
    setEditingAddressIndex(null);
    setStreet('');
    setBuilding('');
    setFloor('');
    setApartment('');
    setLandmark('');
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: OrderDeliveryAddress, index: number) => {
    setEditingAddressIndex(index);
    setStreet(addr.street || '');
    setBuilding(addr.building || '');
    setFloor(addr.floor || '');
    setApartment(addr.apartment || '');
    setLandmark(addr.landmark || '');
    setIsAddressModalOpen(true);
  };

  // Save address (add or edit)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!street.trim()) {
      setMsg({ text: 'يرجى إدخال اسم الشارع والمنطقة', type: 'error' });
      return;
    }

    const currentAddresses = profile?.addresses ? [...profile.addresses] : [];
    const newAddr: OrderDeliveryAddress = {
      street: street.trim().slice(0, 200),
      building: building.trim().slice(0, 40),
      floor: floor.trim().slice(0, 20),
      apartment: apartment.trim().slice(0, 20),
      landmark: landmark.trim().slice(0, 120),
    };

    if (editingAddressIndex !== null) {
      currentAddresses[editingAddressIndex] = newAddr;
    } else {
      currentAddresses.push(newAddr);
    }

    setSaving(true);
    try {
      await saveCustomerProfile(user.uid, {
        name: name.trim() || user.displayName || 'عميل',
        phone: phone.trim(),
        addresses: currentAddresses,
      });

      setProfile((prev) => (prev ? { ...prev, addresses: currentAddresses } : null));
      setIsAddressModalOpen(false);
      setMsg({ text: 'تم حفظ العنوان بنجاح', type: 'success' });
    } catch (err: any) {
      setMsg({ text: 'حدث خطأ أثناء حفظ العنوان: ' + (err.message || ''), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async (indexToDelete: number) => {
    if (!user) return;
    const currentAddresses = profile?.addresses ? [...profile.addresses] : [];
    currentAddresses.splice(indexToDelete, 1);

    setSaving(true);
    try {
      await saveCustomerProfile(user.uid, {
        name: name.trim() || user.displayName || 'عميل',
        phone: phone.trim(),
        addresses: currentAddresses,
      });
      setProfile((prev) => (prev ? { ...prev, addresses: currentAddresses } : null));
      setMsg({ text: 'تم حذف العنوان بنجاح', type: 'success' });
    } catch (err: any) {
      setMsg({ text: 'حدث خطأ أثناء حذف العنوان', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Resend email verification
  const handleResendVerification = async () => {
    if (!user) return;
    setResendingVerification(true);
    try {
      await resendVerificationEmail(user);
      setMsg({
        text: 'تم إرسال رابط تأكيد البريد الإلكتروني، يرجى فحص صندوق الوارد.',
        type: 'success',
      });
    } catch (err) {
      setMsg({
        text: 'تعذر إرسال الرابط، يرجى الانتظار دقيقة والمحاولة ثانية.',
        type: 'error',
      });
    } finally {
      setResendingVerification(false);
    }
  };

  // Check verification reload
  const handleCheckReload = async () => {
    if (!user) return;
    const verified = await reloadCurrentUser(user);
    setIsEmailVerified(verified);
    if (verified) {
      setMsg({ text: 'تم تأكيد البريد الإلكتروني بنجاح!', type: 'success' });
    } else {
      setMsg({ text: 'لم يتم التأكيد بعد، اضغط على الرابط المرسل لبريدك.', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1E6B64] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-20 text-start space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#DDE5E3]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1E6B64]/10 text-[#1E6B64] flex items-center justify-center font-bold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-headline font-black text-[#1F2A2E]">
              حسابي وبياناتي
            </h1>
            <p className="text-xs text-[#1F2A2E]/60">
              إدارة بياناتك الشخصية وعناوين التوصيل المسجلة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="p-2.5 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">تسجيل الخروج</span>
        </button>
      </div>

      {/* Alerts */}
      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Email Verification Status */}
      {!isEmailVerified && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Mail className="w-4 h-4 text-amber-700 shrink-0" />
              <span>البريد الإلكتروني غير مفعّل: ({user?.email})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="text-xs font-bold text-[#1E6B64] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إعادة إرسال الرابط</span>
              </button>
              <button
                type="button"
                onClick={handleCheckReload}
                className="text-xs font-bold text-[#C23B22] hover:underline cursor-pointer"
              >
                فحص التفعيل
              </button>
            </div>
          </div>
          <p className="text-[11px] text-amber-800/80 leading-relaxed">
            وفقاً لسياسة الأمان، يلزم تفعيل البريد الإلكتروني لتأكيد الطلبات عبر الموقع.
          </p>
        </div>
      )}

      {/* Personal Info Form */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-headline font-bold text-[#1F2A2E] flex items-center gap-2">
          <User className="w-4 h-4 text-[#1E6B64]" />
          <span>البيانات الأساسية</span>
        </h2>

        <form onSubmit={handleSaveBasicInfo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                الاسم بالكامل <span className="text-[#C23B22]">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أحمد عبد الله"
                className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                رقم الموبايل
              </label>
              <input
                type="tel"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                dir="ltr"
                className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:bg-white focus:outline-none focus:border-[#1E6B64] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
              البريد الإلكتروني (غير قابل للتعديل)
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={user?.email || ''}
              dir="ltr"
              className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E]/60 font-mono opacity-80 cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="bg-[#1E6B64] hover:bg-[#17534d]"
            >
              <span>حفظ البيانات</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Saved Addresses Section */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#DDE5E3]">
          <h2 className="text-sm font-headline font-bold text-[#1F2A2E] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#1E6B64]" />
            <span>عناوين التوصيل المسجلة ({profile?.addresses?.length || 0})</span>
          </h2>

          <button
            type="button"
            onClick={handleOpenAddAddress}
            className="py-1.5 px-3 bg-[#1E6B64] hover:bg-[#17534d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عنوان جديد</span>
          </button>
        </div>

        {(!profile?.addresses || profile.addresses.length === 0) ? (
          <div className="py-8 text-center text-xs text-[#1F2A2E]/50 space-y-2">
            <MapPin className="w-8 h-8 mx-auto text-[#1F2A2E]/30" />
            <p>لا توجد عناوين مسجلة حتى الآن.</p>
            <p className="text-[11px]">أضف عنوانك لتسريع عملية الطلب مستقبلاً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.addresses.map((addr, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] space-y-2 text-xs relative group"
              >
                <div className="font-bold text-[#1F2A2E] flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#1E6B64] shrink-0" />
                  <span className="truncate">{addr.street}</span>
                </div>

                <div className="text-[11px] text-[#1F2A2E]/70 space-y-0.5">
                  {addr.building && <div>عمارة: {addr.building} {addr.floor ? `- دور: ${addr.floor}` : ''} {addr.apartment ? `- شقة: ${addr.apartment}` : ''}</div>}
                  {addr.landmark && <div className="text-amber-800">علامة مميزة: {addr.landmark}</div>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDE5E3]/60">
                  <button
                    type="button"
                    onClick={() => handleOpenEditAddress(addr, idx)}
                    className="p-1.5 rounded-lg text-[#1E6B64] hover:bg-white transition-colors cursor-pointer"
                    title="تعديل العنوان"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(idx)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-white transition-colors cursor-pointer"
                    title="حذف العنوان"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation to Orders */}
      <div className="p-4 bg-white rounded-3xl border border-[#DDE5E3] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1F2A2E]">سجل طلباتي</div>
            <div className="text-[11px] text-[#1F2A2E]/60">عرض ومتابعة الطلبات السابقة وحالتها</div>
          </div>
        </div>

        <Link
          to="/orders"
          className="py-2 px-4 rounded-xl bg-[#C23B22] hover:bg-[#a9311b] text-white font-bold text-xs transition-colors"
        >
          عرض طلباتي
        </Link>
      </div>

      <AblaqStripe />

      {/* Address Drawer Modal */}
      <BottomSheetModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={editingAddressIndex !== null ? 'تعديل عنوان التوصيل' : 'إضافة عنوان توصيل جديد'}
      >
        <form onSubmit={handleSaveAddress} className="space-y-4 text-start">
          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
              اسم الشارع والمنطقة <span className="text-[#C23B22]">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="مثال: شارع صلاح سالم، بجوار حديقة الأزهر"
              className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-[#1F2A2E] mb-1">
                رقم العمارة
              </label>
              <input
                type="text"
                maxLength={40}
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="15"
                className="w-full px-3 py-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#1F2A2E] mb-1">
                الدور
              </label>
              <input
                type="text"
                maxLength={20}
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="3"
                className="w-full px-3 py-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#1F2A2E] mb-1">
                رقم الشقة
              </label>
              <input
                type="text"
                maxLength={20}
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="6"
                className="w-full px-3 py-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
              علامة مميزة (اختياري)
            </label>
            <input
              type="text"
              maxLength={120}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="بجوار صيدلية، أمام مدرسة..."
              className="w-full px-3.5 py-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE5E3]">
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(false)}
              className="px-4 py-2 bg-[#F5F7F6] text-[#1F2A2E] rounded-xl text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="bg-[#1E6B64] hover:bg-[#17534d]"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ العنوان'}
            </Button>
          </div>
        </form>
      </BottomSheetModal>
    </div>
  );
};
