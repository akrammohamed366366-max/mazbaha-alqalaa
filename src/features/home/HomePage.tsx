import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../app/providers/StoreContext';
import { formatPrice } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { AblaqStripe } from '../../components/ui/AblaqStripe';
import { PlaceholderImage } from '../../components/ui/PlaceholderImage';
import {
  Flame,
  ArrowLeft,
  Clock,
  MapPin,
  Plus,
  Tag,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { menuItems, settings, branch, offers, addToCart, setSelectedDish } = useStore();
  const navigate = useNavigate();

  // "الأكثر طلباً" row = menuItems where featured == true (active only)
  const activeFeaturedItems = menuItems.filter((item) => item.active && item.featured);

  // The hero weight-picker uses the first featured item
  const heroItem = activeFeaturedItems[0] || menuItems.filter((i) => i.active)[0];
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  useEffect(() => {
    if (heroItem && heroItem.variants.length > 0) {
      setSelectedVariantId(heroItem.variants[0].id);
    }
  }, [heroItem]);

  const activeHeroVariant =
    heroItem?.variants.find((v) => v.id === selectedVariantId) ||
    heroItem?.variants[0];

  const handleHeroAddToCart = () => {
    if (heroItem && activeHeroVariant && heroItem.available !== false) {
      addToCart(heroItem, activeHeroVariant, 1);
    }
  };

  // Active offers: hide the section when empty
  const activeOffers = (offers || []).filter((o) => o.active);

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero Section: headline "مشويات على الفحم، توصلك سخنة" */}
      <section className="bg-gradient-to-b from-white to-[#F5F7F6] border-b border-[#DDE5E3] pt-8 pb-12 md:pt-14 md:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Right text column (RTL start) */}
            <div className="lg:col-span-7 space-y-6 text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C23B22]/10 text-[#C23B22] text-xs font-bold">
                <Flame className="w-4 h-4" />
                <span>مشويات على الفحم الطبيعي</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-headline font-black text-[#1F2A2E] leading-[1.2] tracking-tight">
                مشويات على الفحم، <br />
                <span className="text-[#C23B22]">توصلك سخنة</span>
              </h1>

              <p className="text-sm md:text-base text-[#1F2A2E]/70 max-w-xl leading-relaxed">
                طعم مشويات القلعة المتبلة بعناية ومحمرة على جمر السنديان الهادئ، جاهزة للطلب الفوري والتوصيل لموقعك.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/menu')}
                  className="shadow-md"
                >
                  <span>طلب الآن من المنيو</span>
                  <ArrowLeft className="w-5 h-5 ms-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/about')}
                >
                  عن المطعم
                </Button>
              </div>

              {/* Delivery & Operating Info from settings and branches */}
              <div className="flex flex-wrap gap-4 pt-4 text-xs text-[#1F2A2E]/70">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#1E6B64]" />
                  <span>العمل: {settings.hours.open} - {settings.hours.close}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#1E6B64]" />
                  <span>{branch.nameAr}: {branch.address || 'الفرع الرئيسي'}</span>
                </div>
              </div>
            </div>

            {/* Left Column: Interactive Hero Weight-Picker for First Featured Item */}
            {heroItem && (
              <div className="lg:col-span-5">
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-[#DDE5E3] space-y-5 text-start">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#1E6B64]/10 text-[#1E6B64]">
                      الصنف المميز
                    </span>
                    <span className="text-xs text-[#1F2A2E]/60 font-medium">
                      {heroItem.available ? 'طازج على الشواية' : 'غير متاح حالياً'}
                    </span>
                  </div>

                  <div className="h-44 sm:h-52 rounded-2xl overflow-hidden bg-[#F5F7F6]">
                    <PlaceholderImage
                      imageUrl={heroItem.imageUrl}
                      alt={heroItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold font-headline text-[#1F2A2E]">
                      {heroItem.name}
                    </h3>
                    <p className="text-xs text-[#1F2A2E]/60 mt-1 line-clamp-2">
                      {heroItem.description}
                    </p>
                  </div>

                  {/* Weight Selector */}
                  <div>
                    <div className="text-xs font-bold text-[#1F2A2E] mb-2">
                      اختر الوزن المطلوب:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {heroItem.variants.map((variant) => {
                        const isSelected = variant.id === (activeHeroVariant?.id || '');
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariantId(variant.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#C23B22] bg-[#C23B22]/5 text-[#C23B22] font-black'
                                : 'border-[#DDE5E3] hover:border-[#C23B22]/40 bg-white text-[#1F2A2E]'
                            }`}
                          >
                            <div className="text-xs">{variant.label}</div>
                            <div className="text-xs font-bold mt-0.5">
                              {formatPrice(variant.price)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price and Add button */}
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#1F2A2E]/60">السعر:</div>
                      <div className="text-2xl font-black font-headline text-[#C23B22]">
                        {formatPrice(activeHeroVariant?.price || 0)}
                      </div>
                    </div>
                    <Button
                      variant={heroItem.available ? 'primary' : 'outline'}
                      size="md"
                      disabled={!heroItem.available}
                      onClick={handleHeroAddToCart}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{heroItem.available ? 'إضافة للطلب' : 'غير متاح'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ablaq Divider */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <AblaqStripe height={4} />
      </div>

      {/* Offers Section: only shown when active offers exist */}
      {activeOffers.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6 text-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-headline font-bold text-[#1F2A2E]">
                  عروضنا الحصرية
                </h2>
                <p className="text-xs text-[#1F2A2E]/60">
                  تشكيلات خاصة وتوفير مميز على مشويات القلعة
                </p>
              </div>
            </div>
            <Link
              to="/menu"
              className="text-xs font-bold text-[#1E6B64] hover:text-[#C23B22] flex items-center gap-1"
            >
              <span>عرض المنيو</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOffers.map((offer) => (
              <div
                key={offer.id}
                onClick={() => navigate('/menu')}
                className="bg-white rounded-3xl border border-[#DDE5E3] overflow-hidden shadow-xs hover:border-[#1E6B64]/50 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row text-start"
              >
                <div className="sm:w-1/2 h-44 sm:h-auto bg-[#F5F7F6] overflow-hidden">
                  <PlaceholderImage
                    imageUrl={offer.imageUrl}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 sm:w-1/2 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#C23B22] bg-[#C23B22]/10 px-2 py-0.5 rounded-full inline-block mb-1.5">
                      عرض خاص
                    </span>
                    <h3 className="font-headline font-bold text-base text-[#1F2A2E]">
                      {offer.title}
                    </h3>
                    {offer.subtitle && (
                      <p className="text-xs text-[#1F2A2E]/60 mt-1 line-clamp-2">
                        {offer.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 flex items-center text-xs font-bold text-[#1E6B64]">
                    <span>اطلب العرض الآن</span>
                    <ArrowLeft className="w-3.5 h-3.5 ms-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Row: الأكثر طلباً (menuItems where featured == true, active only) */}
      {activeFeaturedItems.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6 text-start">
            <div>
              <h2 className="text-2xl font-headline font-bold text-[#1F2A2E]">
                الأكثر طلباً
              </h2>
              <p className="text-xs text-[#1F2A2E]/60 mt-1">
                أصناف المشويات المفضلة لرواد المطعم
              </p>
            </div>
            <Link
              to="/menu"
              className="text-xs font-bold text-[#1E6B64] hover:text-[#C23B22] flex items-center gap-1"
            >
              <span>عرض القائمة كاملة</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeFeaturedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedDish(item)}
                className="bg-white rounded-2xl border border-[#DDE5E3] hover:border-[#1E6B64]/50 hover:shadow-sm transition-all duration-200 overflow-hidden flex flex-col cursor-pointer group text-start"
              >
                <div className="relative h-44 w-full bg-[#F5F7F6]">
                  <PlaceholderImage
                    imageUrl={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                  />
                  {!item.available && (
                    <div className="absolute inset-0 bg-[#1F2A2E]/60 flex items-center justify-center">
                      <span className="px-3 py-1 bg-white text-[#C23B22] text-xs font-bold rounded-lg">
                        غير متاح اليوم
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-headline font-bold text-base text-[#1F2A2E]">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-xs text-[#1F2A2E]/60 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#DDE5E3] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#1F2A2E]/60 block">يبدأ من</span>
                      <span className="font-headline font-bold text-base text-[#C23B22]">
                        من {formatPrice(item.variants && item.variants.length > 0 ? Math.min(...item.variants.map((v) => v.price)) : 0)}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#1E6B64] group-hover:text-[#C23B22] flex items-center gap-1">
                      <span>{item.available ? 'اختيار الحجم' : 'التفاصيل'}</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Story / About Teaser */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-[#1F2A2E] text-white rounded-3xl p-6 sm:p-10 relative overflow-hidden text-start">
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="text-xs font-bold text-amber-400">
              حكاية طعم من قلب قاهرة المعز
            </span>
            <h2 className="text-2xl sm:text-3xl font-headline font-bold leading-tight">
              أصالة المشويات على الفحم الطبيعي
            </h2>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              في {settings.nameAr}، نحافظ على طقوس الشواء الأصيلة بدون تعقيد، بقطع لحم مختارة وتتبيلة متوارثة، تُشوى وتُقدم طازجة مباشرة لضيوفنا.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/about')}
                className="text-white border-white/20 hover:bg-white/10"
              >
                اقرأ قصة المطعم
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
