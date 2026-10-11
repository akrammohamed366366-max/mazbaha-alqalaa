import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './providers/StoreContext';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { BottomSheetModal } from '../components/ui/BottomSheetModal';
import { PlaceholderImage } from '../components/ui/PlaceholderImage';
import { Button } from '../components/ui/Button';
import { AblaqStripe } from '../components/ui/AblaqStripe';
import { formatPrice } from '../lib/format';
import {
  Flame,
  ShoppingBag,
  Home,
  UtensilsCrossed,
  Clock,
  Phone,
  Plus,
  Minus,
  Check,
  MapPin,
  MessageCircle,
  LogIn,
  LogOut,
  User,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react';

export const CustomerLayout: React.FC = () => {
  const {
    settings,
    branch,
    cart,
    cartCount,
    cartTotal,
    selectedDish,
    setSelectedDish,
    addToCart,
    orders,
    menuError,
  } = useStore();

  const { user, signOut } = useAuth();
  const { isStaff, homeUrl } = usePermissions();

  const location = useLocation();
  const navigate = useNavigate();

  // Account dropdown state
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dish details modal local state
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (selectedDish && selectedDish.variants.length > 0) {
      setSelectedVariantId(selectedDish.variants[0].id);
      setQuantity(1);
      setNote('');
    }
  }, [selectedDish]);

  const activeVariant = selectedDish?.variants.find((v) => v.id === selectedVariantId) || selectedDish?.variants[0];

  const handleAddDishFromModal = () => {
    if (selectedDish && activeVariant && selectedDish.available !== false) {
      addToCart(selectedDish, activeVariant, quantity, note);
      setSelectedDish(null);
    }
  };

  // Nav links for desktop header: distinct paths and keys
  const desktopLinks = [
    { name: 'الرئيسية', path: '/' },
    { name: 'المنيو', path: '/menu' },
    { name: 'عن المطعم', path: '/about' },
  ];

  // Mobile bottom tabs per prompt specifications: الرئيسية، المنيو، طلباتي، حسابي
  const mobileTabs = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'المنيو', path: '/menu', icon: UtensilsCrossed },
    { name: 'طلباتي', path: '/orders', icon: Clock },
    { name: 'حسابي', path: user ? '/account' : '/login', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F6] text-[#1F2A2E] flex flex-col font-sans relative selection:bg-[#C23B22] selection:text-white">
      {/* Customer Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DDE5E3] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo on the Right (RTL rightmost) */}
          <Link to="/" className="flex items-center gap-2.5 text-[#1F2A2E] group">
            <div className="w-10 h-10 rounded-xl bg-[#C23B22] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Flame className="w-6 h-6" />
            </div>
            <div className="flex flex-col text-start">
              <span className="font-headline font-black text-xl text-[#1F2A2E] leading-tight tracking-tight">
                {settings.nameAr}
              </span>
              <span className="text-[10px] text-[#1E6B64] font-bold">
                مشويات على الفحم
              </span>
            </div>
          </Link>

          {/* Center Links (Desktop only) */}
          <nav className="hidden md:flex items-center gap-8">
            {desktopLinks.map((link) => {
              const isActive =
                link.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-bold transition-colors py-1 ${
                    isActive
                      ? 'text-[#C23B22] border-b-2 border-[#C23B22]'
                      : 'text-[#1F2A2E]/80 hover:text-[#C23B22]'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Left Side: Auth button/menu + Cart */}
          <div className="flex items-center gap-2.5">
            {/* If Staff: show Dashboard button */}
            {isStaff && (
              <Link
                to={homeUrl}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F2A2E] hover:bg-[#151d20] text-amber-300 font-bold text-xs shadow-xs transition-colors"
                title="لوحة التحكم الإدارية"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>لوحة التحكم</span>
              </Link>
            )}

            {/* Guest vs Signed In Account Menu */}
            {!user ? (
              <Link
                to="/login"
                className="px-3.5 py-2 rounded-xl bg-[#1E6B64] hover:bg-[#17534d] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>تسجيل الدخول</span>
              </Link>
            ) : (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className="px-3 py-2 rounded-xl bg-[#F5F7F6] hover:bg-[#DDE5E3]/70 text-[#1F2A2E] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#DDE5E3]"
                >
                  <User className="w-3.5 h-3.5 text-[#1E6B64]" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user.displayName || user.email?.split('@')[0] || 'حسابي'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#1F2A2E]/50" />
                </button>

                {/* Dropdown Menu */}
                {isAccountMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#DDE5E3] py-2 z-50 text-start text-xs space-y-1">
                    <div className="px-3 py-1.5 border-b border-[#DDE5E3]/60 mb-1">
                      <div className="text-[10px] text-[#1F2A2E]/50">تسجيل الدخول كـ</div>
                      <div className="font-bold text-[#1F2A2E] truncate font-mono text-[11px]">
                        {user.email || user.displayName}
                      </div>
                    </div>

                    {isStaff && (
                      <Link
                        to={homeUrl}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-amber-700 hover:bg-amber-50 font-bold transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-600" />
                        <span>لوحة التحكم</span>
                      </Link>
                    )}

                    <Link
                      to="/account"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[#1F2A2E] hover:bg-[#F5F7F6] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#1E6B64]" />
                      <span>بياناتي</span>
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[#1F2A2E] hover:bg-[#F5F7F6] transition-colors"
                    >
                      <Clock className="w-4 h-4 text-[#1E6B64]" />
                      <span>طلباتي</span>
                    </Link>

                    <div className="border-t border-[#DDE5E3]/60 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsAccountMenuOpen(false);
                          await signOut();
                          navigate('/');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-start"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart Icon */}
            <Link
              to="/cart"
              className="relative p-2.5 rounded-xl bg-[#F5F7F6] text-[#1F2A2E] hover:bg-[#DDE5E3]/60 transition-colors flex items-center justify-center cursor-pointer border border-[#DDE5E3]/60"
              aria-label="سلة المشتريات"
            >
              <ShoppingBag className="w-5 h-5 text-[#1E6B64]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C23B22] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Global Resource-Exhausted / Quota / Network error banner for Customers */}
      {menuError && (
        <div className="bg-[#C23B22] text-white py-2.5 px-4 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xs animate-in fade-in">
          <Flame className="w-4 h-4 text-amber-300" />
          <span>{menuError}</span>
        </div>
      )}

      {/* Restaurant Closed Notification Banner */}
      {settings.isOrderingOpen === false && (
        <div className="bg-amber-500 text-white py-2 px-4 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xs">
          <Clock className="w-4 h-4" />
          <span>
            المطعم مغلق حالياً ولا يستقبل طلبات جديدة (ساعات العمل اليومية: {settings.hours.open} - {settings.hours.close})
          </span>
        </div>
      )}

      {/* Main Content View with bottom padding ensuring no content is covered by mobile nav + cart bar */}
      <main className="flex-1 pb-36 md:pb-16">
        <Outlet />
      </main>

      {/* Footer sourcing data dynamically from settings/restaurant and branches/main */}
      <footer className="bg-[#1F2A2E] text-white pt-10 pb-20 md:pb-10 border-t border-white/10 text-start">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C23B22] text-white flex items-center justify-center shadow-xs">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-headline font-black text-lg text-white">
                  {settings.nameAr}
                </h3>
                <p className="text-xs text-white/60">
                  مشويات طازجة ومتبلة على أصول الفحم الطبيعي
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1E6B64]" />
                <span>ساعات العمل: {settings.hours.open} - {settings.hours.close}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1E6B64]" />
                <span>{branch.nameAr}: {branch.address || 'القاهرة'}</span>
              </div>
              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="flex items-center gap-2 text-white hover:text-amber-400 transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#1E6B64]" />
                  <span>{settings.phone}</span>
                </a>
              )}
              {settings.whatsapp && (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>واتساب</span>
                </a>
              )}
            </div>
          </div>

          <AblaqStripe height={3} />

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/50 pt-2 gap-2">
            <span>جميع الحقوق محفوظة © {settings.nameAr}</span>
            <span>الأسعار بالجنيه المصري (ج.م) وشاملة الخدمة</span>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Cart Bar (appears when items in cart, above bottom nav) */}
      {cartCount > 0 && location.pathname !== '/cart' && location.pathname !== '/checkout' && (
        <div className="md:hidden fixed bottom-16 inset-x-0 z-30 px-4 py-2 pointer-events-none">
          <div className="max-w-md mx-auto bg-[#1F2A2E] text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border border-white/10 pointer-events-auto">
            <div className="flex items-center gap-3 text-start">
              <div className="w-9 h-9 rounded-xl bg-[#C23B22] text-white flex items-center justify-center font-bold text-sm">
                {cartCount}
              </div>
              <div>
                <div className="text-xs text-white/70">إجمالي السلة</div>
                <div className="text-sm font-bold font-headline text-amber-300">
                  {formatPrice(cartTotal)}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/cart')}
              className="bg-[#C23B22] hover:bg-[#a9311b]"
            >
              عرض السلة
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation: Exactly 4 tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#DDE5E3] h-16 flex items-center justify-around px-2 shadow-lg">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path.split('?')[0]);
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`flex flex-col items-center justify-center w-16 py-1 transition-colors ${
                isActive ? 'text-[#C23B22]' : 'text-[#1F2A2E]/60 hover:text-[#1F2A2E]'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-bold">{tab.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Dish Details: Bottom sheet on mobile, modal on desktop */}
      <BottomSheetModal
        isOpen={!!selectedDish}
        onClose={() => setSelectedDish(null)}
        title={selectedDish?.name || ''}
      >
        {selectedDish && (
          <div className="space-y-5">
            {/* Dish Image */}
            <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-[#F5F7F6]">
              <PlaceholderImage
                imageUrl={selectedDish.imageUrl}
                alt={selectedDish.name}
                className="w-full h-full object-cover"
              />
              {!selectedDish.available && (
                <div className="absolute top-3 end-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                  غير متاح اليوم
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="text-sm text-[#1F2A2E]/80 leading-relaxed">
                {selectedDish.description}
              </p>
            </div>

            {/* Variants / Weights as radio cards */}
            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-2">
                اختر الحجم أو الوزن:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedDish.variants.map((v) => {
                  const isSelected = v.id === (activeVariant?.id || '');
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1E6B64] bg-[#1E6B64]/5 ring-1 ring-[#1E6B64]'
                          : 'border-[#DDE5E3] hover:border-[#1E6B64]/40 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1F2A2E]">{v.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#1E6B64]" />}
                      </div>
                      <div className="text-sm font-black font-headline text-[#C23B22] mt-1">
                        {formatPrice(v.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes with 200 chars limit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#1F2A2E]">
                  ملاحظات خاصة (اختياري):
                </label>
                <span className="text-[10px] text-[#1F2A2E]/50 font-mono">
                  {note.length}/200
                </span>
              </div>
              <input
                type="text"
                maxLength={200}
                placeholder="مثال: تسوية وسط، بدون بصل..."
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                className="w-full px-3.5 py-2.5 bg-white border border-[#DDE5E3] rounded-xl text-sm focus:outline-none focus:border-[#1E6B64]"
              />
            </div>

            {/* Quantity Stepper (1 to 20) and Add to Cart Button */}
            <div className="pt-3 border-t border-[#DDE5E3] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 border border-[#DDE5E3] rounded-xl p-1 bg-white">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1F2A2E] hover:bg-[#F5F7F6] disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="تقليل الكمية"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-bold font-mono">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= 20}
                  onClick={() => setQuantity(Math.min(20, quantity + 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1F2A2E] hover:bg-[#F5F7F6] disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="زيادة الكمية"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button
                variant={selectedDish.available ? 'primary' : 'outline'}
                size="md"
                disabled={!selectedDish.available}
                onClick={handleAddDishFromModal}
                className="flex-1"
              >
                <span>
                  {!selectedDish.available
                    ? 'الصنف غير متاح اليوم'
                    : `إضافة للطلب • ${formatPrice((activeVariant?.price || 0) * quantity)}`}
                </span>
              </Button>
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  );
};
