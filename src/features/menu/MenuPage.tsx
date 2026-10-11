import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../app/providers/StoreContext';
import { Pill } from '../../components/ui/Pill';
import { PlaceholderImage } from '../../components/ui/PlaceholderImage';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatPrice } from '../../lib/format';
import {
  Search,
  Plus,
  ShoppingBag,
  Trash2,
  ArrowLeft,
  X,
  AlertTriangle,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react';
import { MenuItem } from '../../types';

export const MenuPage: React.FC = () => {
  const {
    menuItems,
    categories,
    setSelectedDish,
    cart,
    cartCount,
    cartTotal,
    hasUnavailableItems,
    updateCartQty,
    removeFromCart,
    isMenuLoading,
    menuError,
    retryLoadMenu,
  } = useStore();

  const navigate = useNavigate();
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active categories: where active == true
  const activeCategories = useMemo(() => {
    return categories.filter((c) => c.active);
  }, [categories]);

  // Active menu items: where active == true
  const activeItems = useMemo(() => {
    return menuItems.filter((item) => item.active);
  }, [menuItems]);

  // Search filtering
  const searchFilteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeItems;
    return activeItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [activeItems, searchQuery]);

  // Group items by categoryId for display
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const cat of activeCategories) {
      map.set(cat.id, []);
    }
    for (const item of searchFilteredItems) {
      const list = map.get(item.categoryId);
      if (list) {
        list.push(item);
      } else {
        // In case an item's category is not in active categories
        map.set(item.categoryId, [item]);
      }
    }
    return map;
  }, [activeCategories, searchFilteredItems]);

  // Scroll-spy implementation
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isClickScrolling = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrolling.current) return;
      if (selectedCatId !== 'all' && searchQuery.trim() !== '') return;

      const scrollPosition = window.scrollY + 180;
      let currentSectionId = 'all';

      for (const cat of activeCategories) {
        const el = sectionRefs.current.get(cat.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            currentSectionId = cat.id;
            break;
          }
        }
      }

      if (currentSectionId !== 'all') {
        setSelectedCatId(currentSectionId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeCategories, selectedCatId, searchQuery]);

  const handlePillClick = (catId: string) => {
    setSelectedCatId(catId);
    if (catId === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = sectionRefs.current.get(catId);
      if (el) {
        isClickScrolling.current = true;
        const targetTop = el.offsetTop - 140;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
        setTimeout(() => {
          isClickScrolling.current = false;
        }, 600);
      }
    }
  };

  // Lowest variant price helper
  const getLowestPrice = (item: MenuItem): number => {
    if (!item.variants || item.variants.length === 0) return 0;
    return Math.min(...item.variants.map((v) => v.price));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="text-start">
          <h1 className="text-2xl md:text-3xl font-headline font-black text-[#1F2A2E]">
            قائمة الطعام
          </h1>
          <p className="text-xs text-[#1F2A2E]/60 mt-1">
            مشويات طازجة ومتبلة على أصول الفحم الطبيعي
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="بحث بالاسم أو التتبيلة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-10 pe-8 py-2 bg-white border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] placeholder:text-[#1F2A2E]/40 focus:outline-none focus:border-[#1E6B64]"
          />
          <Search className="w-4 h-4 text-[#1F2A2E]/40 absolute start-3.5 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute end-3 top-2 text-[#1F2A2E]/40 hover:text-[#1F2A2E] cursor-pointer"
              aria-label="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sticky Category Pills with Scroll-spy */}
      <div className="sticky top-16 z-20 bg-[#F5F7F6]/95 backdrop-blur-xs py-3 border-y border-[#DDE5E3] -mx-4 px-4 sm:-mx-6 sm:px-6 overflow-x-auto no-scrollbar flex items-center gap-2">
        <Pill
          key="cat-all"
          label="الكل"
          active={selectedCatId === 'all'}
          onClick={() => handlePillClick('all')}
          count={activeItems.length}
        />
        {activeCategories.map((cat) => {
          const count = activeItems.filter((i) => i.categoryId === cat.id).length;
          return (
            <Pill
              key={cat.id}
              label={cat.name}
              active={selectedCatId === cat.id}
              onClick={() => handlePillClick(cat.id)}
              count={count}
            />
          );
        })}
      </div>

      {/* Main Grid: On desktop, 2 cols + side cart panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Menu Items List */}
        <div className="lg:col-span-8 space-y-8">
          {/* Loading Skeleton */}
          {isMenuLoading && activeItems.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-[#DDE5E3] p-4 space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4 rounded" />
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-2/3 rounded" />
                    </div>
                    <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl" />
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Offline / Error State in Arabic */}
          {menuError && activeItems.length === 0 && (
            <div className="py-16 text-center bg-white rounded-3xl border border-red-200 p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold font-headline text-[#1F2A2E]">
                  تعذر الاتصال بقائمة الطعام
                </h3>
                <p className="text-xs text-[#1F2A2E]/60 mt-1 max-w-sm mx-auto">
                  يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى لتحديث الأصناف والأسعار.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={retryLoadMenu}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </Button>
            </div>
          )}

          {/* Empty Search Result */}
          {!isMenuLoading && searchFilteredItems.length === 0 && (
            <div className="py-16 text-center bg-white rounded-3xl border border-[#DDE5E3] p-8 space-y-3">
              <UtensilsCrossed className="w-10 h-10 text-[#1F2A2E]/30 mx-auto" />
              <p className="text-sm font-bold text-[#1F2A2E]">لا توجد أصناف مطابقة للبحث</p>
              <p className="text-xs text-[#1F2A2E]/60">جرب البحث بكلمات أخرى أو اختر تصنيفاً آخر من الأعلى</p>
              {searchQuery && (
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                  مسح البحث
                </Button>
              )}
            </div>
          )}

          {/* Categories Sections grouped by categoryId */}
          {!isMenuLoading &&
            activeCategories.map((cat) => {
              const categoryItems = itemsByCategory.get(cat.id) || [];
              if (categoryItems.length === 0) return null;

              return (
                <section
                  key={cat.id}
                  id={`cat-${cat.id}`}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(cat.id, el);
                    else sectionRefs.current.delete(cat.id);
                  }}
                  className="space-y-4 text-start scroll-mt-36"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-[#DDE5E3] pb-2">
                    <h2 className="text-lg md:text-xl font-headline font-bold text-[#1F2A2E]">
                      {cat.name}
                    </h2>
                    <span className="text-xs text-[#1E6B64] font-bold">
                      {categoryItems.length} صنف
                    </span>
                  </div>

                  {/* Category Items Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categoryItems.map((item) => {
                      const minPrice = getLowestPrice(item);
                      const isUnavailable = !item.available;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedDish(item)}
                          className={`bg-white rounded-2xl border border-[#DDE5E3] hover:border-[#1E6B64]/50 hover:shadow-xs transition-all p-4 flex flex-col justify-between cursor-pointer group text-start ${
                            isUnavailable ? 'opacity-75 bg-gray-50/60' : ''
                          }`}
                        >
                          <div className="flex gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-headline font-bold text-sm text-[#1F2A2E] group-hover:text-[#C23B22] transition-colors">
                                  {item.name}
                                </h3>
                                {isUnavailable && (
                                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                                    غير متاح
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#1F2A2E]/60 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            </div>

                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#F5F7F6] shrink-0">
                              <PlaceholderImage
                                imageUrl={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          {/* Pricing and Action */}
                          <div className="mt-4 pt-3 border-t border-[#DDE5E3] flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#1F2A2E]/50 block">يبدأ من</span>
                              <span className="text-sm font-black font-headline text-[#C23B22]">
                                من {formatPrice(minPrice)}
                              </span>
                            </div>

                            <Button
                              variant={item.available ? 'primary' : 'outline'}
                              size="sm"
                              className="text-xs px-3 py-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isUnavailable ? 'التفاصيل' : 'اختيار الحجم'}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
        </div>

        {/* Desktop Side Cart Panel (Desktop only) */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="sticky top-24 bg-white rounded-3xl border border-[#DDE5E3] p-5 shadow-xs text-start space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE5E3]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#1E6B64]" />
                <h3 className="font-headline font-bold text-base text-[#1F2A2E]">
                  سلة الطلب
                </h3>
              </div>
              <span className="text-xs font-bold text-[#C23B22] bg-[#C23B22]/10 px-2 py-0.5 rounded-full font-mono">
                {cartCount} أصناف
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-[#1F2A2E]/50 space-y-1">
                <p className="text-xs font-bold">السلة فاضية، اختار من المنيو</p>
                <p className="text-[11px]">اختر الحجم والكمية لإضافتها لطلبك</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pe-1">
                {cart.map((cartItem) => (
                  <div
                    key={cartItem.id}
                    className={`p-3 rounded-xl flex items-center justify-between gap-3 text-start border ${
                      !cartItem.isValid
                        ? 'bg-red-50/70 border-red-200'
                        : 'bg-[#F5F7F6] border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#1F2A2E] truncate">
                        {cartItem.name}
                      </div>
                      <div className="text-[11px] text-[#1E6B64] font-medium">
                        {cartItem.variantLabel} • {formatPrice(cartItem.unitPrice)}
                      </div>
                      {!cartItem.isValid && (
                        <div className="text-[10px] text-red-600 font-bold mt-0.5">
                          {cartItem.invalidReason || 'غير متاح'}
                        </div>
                      )}
                      {cartItem.note && (
                        <div className="text-[10px] text-[#1F2A2E]/60 truncate">
                          ملاحظة: {cartItem.note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-[#DDE5E3] bg-white rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(cartItem.id, cartItem.qty - 1)}
                          className="w-6 h-6 flex items-center justify-center text-[#1F2A2E] hover:bg-[#F5F7F6] cursor-pointer"
                          aria-label="تقليل الكمية"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-mono">
                          {cartItem.qty}
                        </span>
                        <button
                          type="button"
                          disabled={cartItem.qty >= 20}
                          onClick={() => updateCartQty(cartItem.id, cartItem.qty + 1)}
                          className="w-6 h-6 flex items-center justify-center text-[#1F2A2E] hover:bg-[#F5F7F6] disabled:opacity-30 cursor-pointer"
                          aria-label="زيادة الكمية"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(cartItem.id)}
                        className="p-1 text-[#1F2A2E]/40 hover:text-red-600 cursor-pointer"
                        aria-label="حذف الصنف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="pt-3 border-t border-[#DDE5E3] space-y-3">
                {hasUnavailableItems && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                    يرجى حذف الأصناف غير المتاحة من السلة لإتمام الطلب.
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#1F2A2E]/70 font-medium">المجموع الجزئي:</span>
                  <span className="font-headline font-black text-base text-[#1F2A2E]">
                    {formatPrice(cartTotal)}
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={hasUnavailableItems}
                  onClick={() => navigate('/checkout')}
                  className="shadow-sm"
                >
                  <span>متابعة إتمام الطلب</span>
                  <ArrowLeft className="w-4 h-4 ms-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
