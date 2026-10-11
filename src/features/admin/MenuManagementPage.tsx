import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  subscribeCategories,
  subscribeMenuItems,
  subscribeOffers,
  addCategoryToDb,
  updateCategoryInDb,
  deleteCategoryFromDb,
  reorderCategoriesInDb,
  addMenuItemToDb,
  updateMenuItem,
  deleteMenuItemFromDb,
  addOfferToDb,
  updateOfferInDb,
  deleteOfferFromDb,
  uploadMenuImage,
  uploadOfferImage,
} from '../../firebase/db';
import { formatPrice } from '../../lib/format';
import { MenuItem, MenuItemVariant, Category, Offer } from '../../types';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import {
  UtensilsCrossed,
  Plus,
  Edit,
  Trash2,
  Search,
  Upload,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Tag,
  Check,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Flame,
} from 'lucide-react';

export const MenuManagementPage: React.FC = () => {
  const { role } = useAuth();

  // Tab: 'items' | 'categories' | 'offers'
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'offers'>('items');

  // Realtime state from Firestore
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [actionError, setActionError] = useState<string | null>(null);

  // Subscribe to all categories, items, and offers
  useEffect(() => {
    const unsubCats = subscribeCategories(
      (cats) => setCategories(cats),
      false // load both active and inactive for management
    );
    const unsubItems = subscribeMenuItems(
      (items) => setMenuItems(items),
      false // load both active and inactive for management
    );
    const unsubOffers = subscribeOffers(
      (offs) => setOffers(offs),
      false
    );

    return () => {
      unsubCats();
      unsubItems();
      unsubOffers();
    };
  }, []);

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  // =========================================================================
  // ITEM EDIT / ADD DRAWER STATE
  // =========================================================================
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formVariants, setFormVariants] = useState<MenuItemVariant[]>([]);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Open drawer for adding item
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setFormName('');
    setFormDesc('');
    setFormCategoryId(categories[0]?.id || '');
    setFormTags(['مشويات']);
    setTagInput('');
    setFormFeatured(false);
    setFormVariants([
      { id: `var-${Date.now()}-1`, label: 'ربع كيلو', price: 150 },
      { id: `var-${Date.now()}-2`, label: 'نص كيلو', price: 300 },
      { id: `var-${Date.now()}-3`, label: 'كيلو', price: 580 },
    ]);
    setFormImageUrl('');
    setSelectedImageFile(null);
    setImagePreview('');
    setIsItemDrawerOpen(true);
  };

  // Open drawer for editing item
  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDesc(item.description || '');
    setFormCategoryId(item.categoryId);
    setFormTags(item.tags || []);
    setTagInput('');
    setFormFeatured(!!item.featured);
    setFormVariants(item.variants?.length ? [...item.variants] : [
      { id: `var-${Date.now()}-1`, label: 'وجبة', price: 180 },
    ]);
    setFormImageUrl(item.imageUrl || '');
    setSelectedImageFile(null);
    setImagePreview(item.imageUrl || '');
    setIsItemDrawerOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('حجم الملف الأصلي كبير جداً، يرجى اختيار صورة أقل من 10 ميجابايت');
        return;
      }
      setSelectedImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formTags.includes(tagInput.trim())) {
      setFormTags([...formTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  const handleAddVariant = () => {
    if (formVariants.length >= 8) {
      showError('الحد الأقصى للأوزان والأحجام هو 8');
      return;
    }
    const newId = `var-${Date.now()}-${formVariants.length + 1}`;
    setFormVariants([...formVariants, { id: newId, label: 'حجم جديد', price: 100 }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (formVariants.length <= 1) {
      showError('يجب أن يحتوي الصنف على وزن أو حجم واحد على الأقل');
      return;
    }
    setFormVariants(formVariants.filter((_, idx) => idx !== index));
  };

  const handleVariantChange = (index: number, field: 'label' | 'price', value: string | number) => {
    setFormVariants(
      formVariants.map((v, idx) =>
        idx === index ? { ...v, [field]: field === 'price' ? Number(value) || 0 : value } : v
      )
    );
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showError('يرجى إدخال اسم الصنف');
      return;
    }
    if (formName.trim().length > 120) {
      showError('اسم الصنف لا يجب أن يتجاوز 120 حرفاً');
      return;
    }
    if (!formCategoryId) {
      showError('يرجى اختيار القسم التابع له الصنف');
      return;
    }
    if (formVariants.length < 1 || formVariants.length > 8) {
      showError('يجب أن يتراوح عدد الأوزان من 1 إلى 8 أحجام');
      return;
    }

    setIsSavingItem(true);
    setActionError(null);

    try {
      let finalImageUrl = formImageUrl;

      if (editingItem) {
        // Upload new image if selected
        if (selectedImageFile) {
          finalImageUrl = await uploadMenuImage(editingItem.id, selectedImageFile);
        }

        await updateMenuItem(editingItem.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          categoryId: formCategoryId,
          tags: formTags,
          featured: formFeatured,
          variants: formVariants,
          imageUrl: finalImageUrl,
        });
      } else {
        // Create new item
        const tempId = `item-${Date.now()}`;
        if (selectedImageFile) {
          finalImageUrl = await uploadMenuImage(tempId, selectedImageFile);
        }

        await addMenuItemToDb({
          name: formName.trim(),
          description: formDesc.trim(),
          categoryId: formCategoryId,
          tags: formTags,
          featured: formFeatured,
          variants: formVariants,
          imageUrl: finalImageUrl,
          sortOrder: menuItems.length + 1,
          active: true,
          available: true,
        });
      }

      setIsItemDrawerOpen(false);
    } catch (err: any) {
      console.error('Error saving item:', err);
      if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        showError('عفواً، لا تملك صلاحية تعديل قائمة الطعام');
      } else {
        showError('حدث خطأ أثناء حفظ الصنف: ' + (err.message || 'خطأ في الشبكة'));
      }
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الصنف "${itemName}" نهائياً من المنيو؟`)) {
      return;
    }
    try {
      await deleteMenuItemFromDb(itemId);
    } catch (err: any) {
      console.error('Delete item error:', err);
      if (err.code === 'permission-denied') {
        showError('عفواً، لا تملك صلاحية حذف الأصناف');
      } else {
        showError('تعذر حذف الصنف');
      }
    }
  };

  // Instant toggles
  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      await updateMenuItem(item.id, { available: !item.available });
    } catch (err: any) {
      showError('تعذر تحديث الإتاحة: ' + (err.message || 'صلاحيات غير كافية'));
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      await updateMenuItem(item.id, { active: !item.active });
    } catch (err: any) {
      showError('تعذر تحديث حالة الظهور: ' + (err.message || 'صلاحيات غير كافية'));
    }
  };

  const handleToggleFeatured = async (item: MenuItem) => {
    try {
      await updateMenuItem(item.id, { featured: !item.featured });
    } catch (err: any) {
      showError('تعذر تحديث الأكثر طلباً: ' + (err.message || 'صلاحيات غير كافية'));
    }
  };

  // =========================================================================
  // CATEGORIES CRUD & REORDER STATE
  // =========================================================================
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);

  const handleOpenAddCat = () => {
    setEditingCategory(null);
    setCatNameInput('');
    setIsCatModalOpen(true);
  };

  const handleOpenEditCat = (cat: Category) => {
    setEditingCategory(cat);
    setCatNameInput(cat.name);
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;
    if (catNameInput.trim().length > 80) {
      showError('اسم القسم لا يتجاوز 80 حرفاً');
      return;
    }

    setIsSavingCat(true);
    try {
      if (editingCategory) {
        await updateCategoryInDb(editingCategory.id, {
          name: catNameInput.trim(),
        });
      } else {
        await addCategoryToDb({
          name: catNameInput.trim(),
          sortOrder: categories.length + 1,
          active: true,
        });
      }
      setIsCatModalOpen(false);
    } catch (err: any) {
      console.error('Save category error:', err);
      showError('تعذر حفظ القسم: ' + (err.message || 'صلاحيات غير كافية'));
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    const itemsInCat = menuItems.filter((i) => i.categoryId === cat.id);
    if (itemsInCat.length > 0) {
      showError(`لا يمكن حذف قسم "${cat.name}" لأنه يحتوي على ${itemsInCat.length} صنف`);
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف قسم "${cat.name}"؟`)) return;

    try {
      await deleteCategoryFromDb(cat.id);
    } catch (err: any) {
      showError('تعذر حذف القسم');
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;

    // Recalculate sortOrder
    const reordered = newCats.map((c, idx) => ({ id: c.id, sortOrder: idx + 1 }));
    setCategories(newCats);

    try {
      await reorderCategoriesInDb(reordered);
    } catch (err: any) {
      showError('تعذر إعادة ترتيب الأقسام: ' + (err.message || 'خطأ'));
    }
  };

  // =========================================================================
  // OFFERS CRUD STATE
  // =========================================================================
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerSubtitle, setOfferSubtitle] = useState('');
  const [offerImageUrl, setOfferImageUrl] = useState('');
  const [offerImageFile, setOfferImageFile] = useState<File | null>(null);
  const [isSavingOffer, setIsSavingOffer] = useState(false);

  const handleOpenAddOffer = () => {
    setEditingOffer(null);
    setOfferTitle('');
    setOfferSubtitle('');
    setOfferImageUrl('');
    setOfferImageFile(null);
    setIsOfferModalOpen(true);
  };

  const handleOpenEditOffer = (off: Offer) => {
    setEditingOffer(off);
    setOfferTitle(off.title);
    setOfferSubtitle(off.subtitle || '');
    setOfferImageUrl(off.imageUrl || '');
    setOfferImageFile(null);
    setIsOfferModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) return;

    setIsSavingOffer(true);
    try {
      let finalImg = offerImageUrl;
      if (offerImageFile) {
        finalImg = await uploadOfferImage(editingOffer?.id || `offer-${Date.now()}`, offerImageFile);
      }

      if (editingOffer) {
        await updateOfferInDb(editingOffer.id, {
          title: offerTitle.trim(),
          subtitle: offerSubtitle.trim(),
          imageUrl: finalImg,
        });
      } else {
        await addOfferToDb({
          title: offerTitle.trim(),
          subtitle: offerSubtitle.trim(),
          imageUrl: finalImg,
          active: true,
          sortOrder: offers.length + 1,
        });
      }
      setIsOfferModalOpen(false);
    } catch (err: any) {
      showError('تعذر حفظ العرض الترويجي: ' + (err.message || 'خطأ'));
    } finally {
      setIsSavingOffer(false);
    }
  };

  const handleToggleOfferActive = async (off: Offer) => {
    try {
      await updateOfferInDb(off.id, { active: !off.active });
    } catch (err: any) {
      showError('تعذر تحديث حالة العرض');
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('هل تريد حذف هذا العرض الترويجي؟')) return;
    try {
      await deleteOfferFromDb(offerId);
    } catch (err: any) {
      showError('تعذر حذف العرض');
    }
  };

  // Filter items
  const filteredItems = menuItems.filter((item) => {
    const matchCat = selectedCatId === 'all' || item.categoryId === selectedCatId;
    const matchQuery =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  return (
    <div className="space-y-6 text-start">
      {/* Top Error Alert */}
      {actionError && (
        <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="font-bold text-xs">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-white/80 hover:text-white text-xs px-2 py-1 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-black text-[#1F2A2E]">
            إدارة قائمة الطعام والعروض
          </h1>
          <p className="text-xs text-[#1F2A2E]/60 mt-1">
            التحكم في الأقسام، تسعير المشويات، الإتاحة اليومية، وصور العروض الترويجية
          </p>
        </div>

        {/* Tab-specific Add Button */}
        <div>
          {activeTab === 'items' && (
            <button
              type="button"
              onClick={handleOpenAddItem}
              className="py-2.5 px-4 bg-[#1E6B64] hover:bg-[#17534d] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>
          )}

          {activeTab === 'categories' && (
            <button
              type="button"
              onClick={handleOpenAddCat}
              className="py-2.5 px-4 bg-[#1E6B64] hover:bg-[#17534d] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قسم جديد</span>
            </button>
          )}

          {activeTab === 'offers' && (
            <button
              type="button"
              onClick={handleOpenAddOffer}
              className="py-2.5 px-4 bg-[#1E6B64] hover:bg-[#17534d] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بانر عرض جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#DDE5E3] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'items'
              ? 'bg-[#1E6B64] text-white shadow-xs'
              : 'text-[#1F2A2E]/70 hover:bg-black/5'
          }`}
        >
          أصناف المنيو ({menuItems.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-[#1E6B64] text-white shadow-xs'
              : 'text-[#1F2A2E]/70 hover:bg-black/5'
          }`}
        >
          أقسام المنيو والترتيب ({categories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('offers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'offers'
              ? 'bg-[#1E6B64] text-white shadow-xs'
              : 'text-[#1F2A2E]/70 hover:bg-black/5'
          }`}
        >
          بانرات العروض ({offers.length})
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MENU ITEMS TABLE */}
      {/* ==================================================================== */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-4 rounded-3xl border border-[#DDE5E3] shadow-xs">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setSelectedCatId('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCatId === 'all'
                    ? 'bg-[#1E6B64] text-white'
                    : 'bg-[#F5F7F6] text-[#1F2A2E]/70 hover:bg-[#DDE5E3]'
                }`}
              >
                الكل ({menuItems.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCatId(c.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCatId === c.id
                      ? 'bg-[#1E6B64] text-white'
                      : 'bg-[#F5F7F6] text-[#1F2A2E]/70 hover:bg-[#DDE5E3]'
                  }`}
                >
                  {c.name} ({menuItems.filter((i) => i.categoryId === c.id).length})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-[#1F2A2E]/40 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث في الأصناف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs focus:outline-none focus:border-[#1E6B64]"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-3xl border border-[#DDE5E3] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#F5F7F6] border-b border-[#DDE5E3] text-[#1F2A2E]/60 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4 text-start">الصورة والصنف</th>
                    <th className="py-3.5 px-3 text-start">القسم</th>
                    <th className="py-3.5 px-3 text-start">الأوزان والأسعار</th>
                    <th className="py-3.5 px-3 text-center">الأكثر طلباً</th>
                    <th className="py-3.5 px-3 text-center">متاح للطلب</th>
                    <th className="py-3.5 px-3 text-center">ظاهر بالمنيو</th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#DDE5E3]">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#1F2A2E]/40">
                        لا توجد أصناف مطابقة للبحث أو القسم المحدد
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const itemCat = categories.find((c) => c.id === item.categoryId);

                      return (
                        <tr key={item.id} className="hover:bg-[#F5F7F6]/50 transition-colors">
                          {/* Image & Title */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-[#F5F7F6] border border-[#DDE5E3] overflow-hidden shrink-0 flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Flame className="w-5 h-5 text-[#C23B22]/50" />
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-bold text-xs text-[#1F2A2E]">
                                  {item.name}
                                </div>
                                {item.description && (
                                  <div className="text-[10px] text-[#1F2A2E]/50 line-clamp-1 max-w-xs">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#1E6B64]/10 text-[#1E6B64]">
                              {itemCat?.name || 'غير محدد'}
                            </span>
                          </td>

                          {/* Variants & Prices */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              {item.variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="text-[11px] flex items-center gap-2"
                                >
                                  <span className="text-[#1F2A2E]/70">{v.label}:</span>
                                  <span className="font-bold text-[#C23B22] font-mono">
                                    {formatPrice(v.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Instant Toggle: Featured */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(item)}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold ${
                                item.featured
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-[#F5F7F6] border-[#DDE5E3] text-[#1F2A2E]/40 hover:text-[#1F2A2E]'
                              }`}
                              title={item.featured ? 'مميز بالأكثر طلباً' : 'تحديد كأكثر طلباً'}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>{item.featured ? 'نعم' : 'لا'}</span>
                            </button>
                          </td>

                          {/* Instant Toggle: Available */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAvailable(item)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer border ${
                                item.available
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-red-50 text-red-800 border-red-300'
                              }`}
                            >
                              {item.available ? 'متاح اليوم' : 'غير متاح'}
                            </button>
                          </td>

                          {/* Instant Toggle: Active */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer border ${
                                item.active
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-gray-100 text-gray-600 border-gray-300'
                              }`}
                            >
                              {item.active ? 'ظاهر' : 'مخفي'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditItem(item)}
                                className="p-2 text-[#1E6B64] hover:bg-[#1E6B64]/10 rounded-xl transition-colors cursor-pointer"
                                title="تعديل الصنف"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                title="حذف الصنف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CATEGORIES CRUD & REORDER */}
      {/* ==================================================================== */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-3xl border border-[#DDE5E3] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE5E3]">
            <div>
              <h2 className="font-headline font-bold text-base text-[#1F2A2E]">
                ترتيب وأقسام قائمة الطعام
              </h2>
              <p className="text-xs text-[#1F2A2E]/50 mt-0.5">
                يمكنك إعادة ترتيب الأقسام لتظهر بنفس الترتيب في متجر العملاء
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#DDE5E3]">
            {categories.map((cat, idx) => {
              const itemCount = menuItems.filter((i) => i.categoryId === cat.id).length;

              return (
                <div
                  key={cat.id}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-[#F5F7F6]/50 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#1E6B64]/10 text-[#1E6B64] font-bold text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-[#1F2A2E]">{cat.name}</div>
                      <div className="text-[11px] text-[#1F2A2E]/50">
                        {itemCount} صنف داخل هذا القسم
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Up / Down Reorder */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCategory(idx, 'up')}
                      className="p-1.5 rounded-lg border border-[#DDE5E3] hover:bg-[#F5F7F6] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-4 h-4 text-[#1F2A2E]/70" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMoveCategory(idx, 'down')}
                      className="p-1.5 rounded-lg border border-[#DDE5E3] hover:bg-[#F5F7F6] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-4 h-4 text-[#1F2A2E]/70" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditCat(cat)}
                      className="p-1.5 rounded-lg text-[#1E6B64] hover:bg-[#1E6B64]/10 cursor-pointer"
                      title="تعديل الاسم"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                      title="حذف القسم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PROMO OFFERS CRUD */}
      {/* ==================================================================== */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.length === 0 ? (
              <div className="col-span-3 py-16 text-center bg-white rounded-3xl border border-[#DDE5E3] text-[#1F2A2E]/40 space-y-2">
                <Sparkles className="w-10 h-10 mx-auto opacity-30 text-[#C23B22]" />
                <div className="font-bold text-sm">لا توجد عروض ترويجية مسجلة حالياً</div>
                <p className="text-xs">أضف بانرات عروض لتظهر في الصفحة الرئيسية لمتجر العملاء</p>
              </div>
            ) : (
              offers.map((off) => (
                <div
                  key={off.id}
                  className="bg-white rounded-3xl border border-[#DDE5E3] overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="h-36 bg-[#F5F7F6] relative overflow-hidden">
                      {off.imageUrl ? (
                        <img
                          src={off.imageUrl}
                          alt={off.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#1F2A2E]/30">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                      <span
                        className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          off.active
                            ? 'bg-emerald-500 text-white'
                            : 'bg-black/50 text-white'
                        }`}
                      >
                        {off.active ? 'مفعّل' : 'معطّل'}
                      </span>
                    </div>

                    <div className="p-4 space-y-1">
                      <div className="font-headline font-bold text-sm text-[#1F2A2E]">
                        {off.title}
                      </div>
                      {off.subtitle && (
                        <div className="text-xs text-[#1F2A2E]/60">{off.subtitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 border-t border-[#DDE5E3] bg-[#F5F7F6] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleOfferActive(off)}
                      className="text-xs font-bold text-[#1E6B64] hover:underline cursor-pointer"
                    >
                      {off.active ? 'تعطيل العرض' : 'تفعيل العرض'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditOffer(off)}
                        className="p-1.5 text-[#1E6B64] hover:bg-[#1E6B64]/10 rounded-lg cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOffer(off.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ITEM EDIT / CREATE DRAWER (SLIDE-OVER) */}
      {/* ==================================================================== */}
      {isItemDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-[#1F2A2E]/60 backdrop-blur-xs flex justify-start">
          <div className="w-screen max-w-xl bg-white border-r border-[#DDE5E3] shadow-2xl flex flex-col h-full text-start animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-[#DDE5E3] flex items-center justify-between bg-[#F5F7F6]">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-[#1E6B64]" />
                <h3 className="font-headline font-bold text-base text-[#1F2A2E]">
                  {editingItem ? `تعديل صنف: ${editingItem.name}` : 'إضافة صنف مشويات جديد'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsItemDrawerOpen(false)}
                className="p-2 text-[#1F2A2E]/60 hover:text-[#1F2A2E] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Form */}
            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  اسم الصنف <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: كباب ضاني بلدي على الفحم"
                  required
                  className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  القسم التابع له <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64] cursor-pointer"
                >
                  <option value="">-- اختر القسم --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  الوصف والمكونات
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="وصف تتبيلة الصنف، طريقة الشواء، وما يقدم معه..."
                  className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                />
              </div>

              {/* Image Upload with Client-side Resize & Compression */}
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  صورة الصنف (ضغط تلقائي وحفظ في Firebase Storage)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#F5F7F6] border border-[#DDE5E3] overflow-hidden flex items-center justify-center shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-[#1F2A2E]/30" />
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="text-xs text-[#1F2A2E]/70 file:py-2 file:px-3 file:rounded-xl file:border file:border-[#DDE5E3] file:bg-[#F5F7F6] file:text-xs file:font-bold file:cursor-pointer"
                    />
                    <div className="text-[10px] text-[#1F2A2E]/50 mt-1">
                      يتم تقليص حجم الصورة تلقائياً إلى 1200 بكسل كحد أقصى وضغطها قبل الرفع.
                    </div>
                  </div>
                </div>
              </div>

              {/* Featured in "الأكثر طلباً" Toggle */}
              <div className="p-3 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1F2A2E] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>يظهر في قسم "الأكثر طلباً"</span>
                  </div>
                  <div className="text-[11px] text-[#1F2A2E]/60">
                    عرض الصنف في الصف العلوي المميز بالصفحة الرئيسية
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="w-5 h-5 accent-[#1E6B64] cursor-pointer"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  الوسوم والكلمات الدلالية
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="أضف وسماً مثل: مشويات، عائلي، حار..."
                    className="flex-1 p-2 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs focus:outline-none focus:border-[#1E6B64]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-[#1E6B64] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    إضافة
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-[#1E6B64]/10 text-[#1E6B64] text-[11px] font-bold flex items-center gap-1"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Variants & Pricing list */}
              <div className="space-y-2 pt-2 border-t border-[#DDE5E3]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#1F2A2E] block">
                      الأوزان والأحجام والأسعار (1 إلى 8 أحجام) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-[#1F2A2E]/50">
                      معرفات الأحجام ثابتة تلقائياً لضمان دقة العمليات بالسيرفر
                    </span>
                  </div>
                  {formVariants.length < 8 && (
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="px-2.5 py-1 bg-[#1E6B64]/10 text-[#1E6B64] rounded-lg text-xs font-bold hover:bg-[#1E6B64]/20 cursor-pointer"
                    >
                      + إضافة حجم
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {formVariants.map((v, idx) => (
                    <div
                      key={v.id}
                      className="p-2.5 bg-[#F5F7F6] rounded-xl border border-[#DDE5E3] flex items-center gap-2"
                    >
                      <span className="text-[10px] font-mono text-[#1F2A2E]/40 font-bold px-1">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) => handleVariantChange(idx, 'label', e.target.value)}
                        placeholder="اسم الحجم (مثال: ربع كيلو)"
                        required
                        className="flex-1 p-1.5 bg-white border border-[#DDE5E3] rounded-lg text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
                      />
                      <div className="flex items-center gap-1 w-28">
                        <input
                          type="number"
                          min={0}
                          value={v.price}
                          onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                          placeholder="السعر"
                          required
                          className="w-full p-1.5 bg-white border border-[#DDE5E3] rounded-lg text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64] font-mono font-bold"
                        />
                        <span className="text-[11px] text-[#1F2A2E]/60 whitespace-nowrap">ج.م</span>
                      </div>
                      <button
                        type="button"
                        disabled={formVariants.length <= 1}
                        onClick={() => handleRemoveVariant(idx)}
                        className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#DDE5E3] flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="flex-1 py-3 px-4 bg-[#1E6B64] hover:bg-[#17534d] text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingItem ? 'جاري الحفظ والرفع...' : 'حفظ الصنف في المنيو'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsItemDrawerOpen(false)}
                  className="py-3 px-5 bg-[#F5F7F6] hover:bg-[#DDE5E3] text-[#1F2A2E] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CATEGORY ADD/EDIT MODAL */}
      {/* ==================================================================== */}
      <BottomSheetModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editingCategory ? `تعديل قسم: ${editingCategory.name}` : 'إضافة قسم منيو جديد'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-start">
          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
              اسم القسم <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={80}
              value={catNameInput}
              onChange={(e) => setCatNameInput(e.target.value)}
              placeholder="مثال: مشويات اللحوم، الطواجن، الوجبات الفردية..."
              required
              className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="px-4 py-2 bg-[#F5F7F6] text-[#1F2A2E] rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSavingCat || !catNameInput.trim()}
              className="px-4 py-2 bg-[#1E6B64] hover:bg-[#17534d] text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSavingCat ? 'جاري الحفظ...' : 'حفظ القسم'}
            </button>
          </div>
        </form>
      </BottomSheetModal>

      {/* ==================================================================== */}
      {/* OFFER ADD/EDIT MODAL */}
      {/* ==================================================================== */}
      <BottomSheetModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        title={editingOffer ? 'تعديل بانر العرض' : 'إضافة بانر عرض ترويجي جديد'}
      >
        <form onSubmit={handleSaveOffer} className="space-y-4 text-start">
          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
              عنوان العرض الرئيسي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
              placeholder="مثال: صينية القلعة العائلية"
              required
              className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
              العنوان الفرعي / التفاصيل
            </label>
            <input
              type="text"
              value={offerSubtitle}
              onChange={(e) => setOfferSubtitle(e.target.value)}
              placeholder="مثال: تشكيلة فاخرة تكفي 4 أفراد بسعر مميز"
              className="w-full p-2.5 bg-[#F5F7F6] border border-[#DDE5E3] rounded-xl text-xs text-[#1F2A2E] focus:outline-none focus:border-[#1E6B64]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
              صورة البانر
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setOfferImageFile(e.target.files?.[0] || null)}
              className="text-xs text-[#1F2A2E]/70 file:py-2 file:px-3 file:rounded-xl file:border file:border-[#DDE5E3] file:bg-[#F5F7F6] file:text-xs file:font-bold file:cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOfferModalOpen(false)}
              className="px-4 py-2 bg-[#F5F7F6] text-[#1F2A2E] rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSavingOffer || !offerTitle.trim()}
              className="px-4 py-2 bg-[#1E6B64] hover:bg-[#17534d] text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSavingOffer ? 'جاري الحفظ والرفع...' : 'حفظ العرض'}
            </button>
          </div>
        </form>
      </BottomSheetModal>
    </div>
  );
};
