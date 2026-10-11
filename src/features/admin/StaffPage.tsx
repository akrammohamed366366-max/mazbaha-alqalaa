import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { subscribeStaffMembers } from '../../firebase/db';
import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { StaffUser, StaffPreset, StaffPermissions } from '../../types';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import {
  Users,
  Search,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Phone,
  Mail,
  Edit3,
  Trash2,
  Power,
  Sliders,
  Check,
  UserCheck,
} from 'lucide-react';

interface SearchedUser {
  uid: string;
  name: string;
  email: string;
  phone: string;
}

interface PermissionItem {
  key: keyof StaffPermissions;
  label: string;
}

const ALL_PERMISSIONS: PermissionItem[] = [
  { key: 'orders_view', label: 'عرض الطلبات' },
  { key: 'orders_manage', label: 'إدارة الطلبات (قبول، رفض، تغيير الحالة، إلغاء)' },
  { key: 'orders_create', label: 'تسجيل طلب تليفوني' },
  { key: 'payments_confirm', label: 'تأكيد التحصيل والتحويلات' },
  { key: 'assign_driver', label: 'تعيين سواق للطلبات' },
  { key: 'kitchen', label: 'شاشة المطبخ' },
  { key: 'driver', label: 'شاشة السواق (طلباته فقط)' },
  { key: 'menu_manage', label: 'إدارة المنيو والعروض' },
  { key: 'reports_view', label: 'عرض التقارير' },
  { key: 'settings_manage', label: 'تعديل الإعدادات' },
];

const PRESET_PERMISSIONS: Record<
  'manager' | 'cashier' | 'kitchen' | 'driver',
  (keyof StaffPermissions)[]
> = {
  manager: [
    'orders_view',
    'orders_manage',
    'orders_create',
    'payments_confirm',
    'assign_driver',
    'menu_manage',
    'reports_view',
  ],
  cashier: [
    'orders_view',
    'orders_manage',
    'orders_create',
    'payments_confirm',
    'assign_driver',
  ],
  kitchen: ['kitchen'],
  driver: ['driver'],
};

const PRESET_CONFIG: Record<
  StaffPreset,
  { label: string; color: string; desc: string }
> = {
  admin: {
    label: 'مدير عام',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    desc: 'صلاحيات كاملة',
  },
  manager: {
    label: 'مدير',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    desc: 'إدارة الطلبات والمنيو والتقارير',
  },
  cashier: {
    label: 'كاشير',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    desc: 'الطلبات، الهاتف، المناديب، التحصيل',
  },
  kitchen: {
    label: 'مطبخ',
    color: 'bg-amber-50 text-amber-900 border-amber-200',
    desc: 'شاشة الشواية والتحضير',
  },
  driver: {
    label: 'سواق',
    color: 'bg-teal-50 text-teal-800 border-teal-200',
    desc: 'شاشة السائق وطلباته فقط',
  },
  custom: {
    label: 'مخصص',
    color: 'bg-slate-50 text-slate-800 border-slate-200',
    desc: 'صلاحيات مخصصة',
  },
};

export const StaffPage: React.FC = () => {
  const { user: currentAuthUser } = useAuth();
  const { isAdmin } = usePermissions();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Permission Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [chosenUser, setChosenUser] = useState<SearchedUser | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<StaffPreset>('cashier');
  const [permissions, setPermissions] = useState<StaffPermissions>({});
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  // Alerts
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 6000);
  };

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Subscribe to staff collection
  useEffect(() => {
    setIsLoadingStaff(true);
    const unsub = subscribeStaffMembers((list) => {
      setStaffList(list);
      setIsLoadingStaff(false);
    });
    return () => unsub();
  }, []);

  // Debounced search on users by email (400ms, min 3 chars, lowercase)
  useEffect(() => {
    const qTerm = searchInput.trim().toLowerCase();
    if (qTerm.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('email', '>=', qTerm),
          where('email', '<=', qTerm + '\uf8ff'),
          orderBy('email'),
          limit(10)
        );
        const snap = await getDocs(q);
        const list: SearchedUser[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            name: data.name || 'مستخدم بدون اسم',
            email: data.email || '',
            phone: data.phone || '',
          };
        });
        setSearchResults(list);
        setHasSearched(true);
      } catch (err: any) {
        console.error('Search users error:', err);
        showError('تعذر البحث عن المستخدمين بالبريد');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Open Permission Drawer for a user (from search or from existing staff)
  const handleOpenPermissionDrawer = (target: SearchedUser) => {
    setActionError(null);
    setChosenUser(target);

    const existing = staffList.find((s) => s.id === target.uid);
    if (existing) {
      setSelectedPreset(existing.preset || 'cashier');
      setPermissions(existing.permissions || {});
      setIsActive(existing.active !== false);
    } else {
      // New staff defaults to cashier
      setSelectedPreset('cashier');
      const cashierPerms: StaffPermissions = {};
      PRESET_PERMISSIONS.cashier.forEach((k) => {
        cashierPerms[k] = true;
      });
      setPermissions(cashierPerms);
      setIsActive(true);
    }

    setIsDrawerOpen(true);
  };

  // Apply a preset to the checkboxes
  const handleSelectPreset = (preset: 'manager' | 'cashier' | 'kitchen' | 'driver' | 'custom') => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      return;
    }
    const allowed = PRESET_PERMISSIONS[preset];
    const updated: StaffPermissions = {};
    ALL_PERMISSIONS.forEach((p) => {
      updated[p.key] = allowed.includes(p.key);
    });
    setPermissions(updated);
  };

  // Toggle a single permission checkbox
  const handleTogglePermission = (key: keyof StaffPermissions) => {
    const nextPerms = { ...permissions, [key]: !permissions[key] };
    setPermissions(nextPerms);

    // Detect if permissions match any defined preset
    let matched: StaffPreset = 'custom';
    const presets: ('manager' | 'cashier' | 'kitchen' | 'driver')[] = [
      'manager',
      'cashier',
      'kitchen',
      'driver',
    ];
    for (const pr of presets) {
      const allowed = PRESET_PERMISSIONS[pr];
      const matches = ALL_PERMISSIONS.every((p) => {
        const shouldBeTrue = allowed.includes(p.key);
        return !!nextPerms[p.key] === shouldBeTrue;
      });
      if (matches) {
        matched = pr;
        break;
      }
    }
    setSelectedPreset(matched);
  };

  // Save permissions to Firestore staff/{uid}
  const handleSavePermissions = async () => {
    if (!chosenUser) return;
    if (chosenUser.uid === currentAuthUser?.uid) {
      showError('لا يمكنك تعديل صلاحيات حسابك الخاص');
      return;
    }

    setIsSaving(true);
    setActionError(null);

    try {
      const existing = staffList.find((s) => s.id === chosenUser.uid);
      const permissionsPayload: Record<string, boolean> = {
        orders_view: !!permissions.orders_view,
        orders_manage: !!permissions.orders_manage,
        orders_create: !!permissions.orders_create,
        payments_confirm: !!permissions.payments_confirm,
        assign_driver: !!permissions.assign_driver,
        kitchen: !!permissions.kitchen,
        driver: !!permissions.driver,
        menu_manage: !!permissions.menu_manage,
        reports_view: !!permissions.reports_view,
        settings_manage: !!permissions.settings_manage,
      };

      const payload = {
        name: chosenUser.name.trim().slice(0, 80) || 'موظف',
        email: chosenUser.email.trim().toLowerCase(),
        role: 'staff' as const,
        preset: selectedPreset,
        permissions: permissionsPayload,
        active: isActive,
        createdAt: existing?.createdAt || serverTimestamp(),
        createdBy: existing?.createdBy || currentAuthUser?.uid || 'admin',
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'staff', chosenUser.uid), payload);
      showSuccess(`تم حفظ صلاحيات الموظف (${chosenUser.name}) بنجاح`);
      setIsDrawerOpen(false);
    } catch (err: any) {
      console.error('Save staff permissions error:', err);
      if (err?.code === 'permission-denied') {
        showError('تم رفض العملية: تأكد من أنك مسجل كمدير عام وأنك لا تعدل حسابك الخاص.');
      } else {
        showError('تعذر حفظ الصلاحيات: ' + (err.message || 'خطأ غير متوقع'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active/inactive for existing staff
  const handleToggleStatus = async (member: StaffUser) => {
    if (member.id === currentAuthUser?.uid) {
      showError('لا يمكنك إيقاف حسابك الخاص');
      return;
    }

    const nextActive = !member.active;
    try {
      await updateDoc(doc(db, 'staff', member.id), {
        active: nextActive,
        updatedAt: serverTimestamp(),
      });
      showSuccess(
        nextActive
          ? `تم تفعيل حساب ${member.name}`
          : `تم إيقاف حساب ${member.name}`
      );
    } catch (err: any) {
      showError('تعذر تغيير حالة الحساب: ' + (err.message || 'خطأ'));
    }
  };

  // Delete staff member from Firestore
  const handleDeleteStaff = async (member: StaffUser) => {
    if (member.id === currentAuthUser?.uid) {
      showError('لا يمكنك حذف حسابك الخاص');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف حساب الموظف "${member.name}" وإلغاء صلاحياته نهائياً؟`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'staff', member.id));
      showSuccess(`تم حذف صلاحيات الموظف ${member.name}`);
    } catch (err: any) {
      showError('تعذر حذف الحساب: ' + (err.message || 'خطأ'));
    }
  };

  // Check if non-admin somehow loaded
  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-[#DDE5E3] max-w-md mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-[#C23B22] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1F2A2E]">ملكش صلاحية الدخول هنا</h2>
        <p className="text-xs text-[#1F2A2E]/70 mt-1">
          هذه الصفحة مخصصة للمدير العام فقط لإدارة وتعيين صلاحيات الموظفين.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-start">
      {/* Alerts */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs text-red-700 hover:underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-black text-[#1F2A2E] flex items-center gap-3">
            <Users className="w-7 h-7 text-[#1E6B64]" />
            <span>إدارة الموظفين والصلاحيات</span>
          </h1>
          <p className="text-xs text-[#1F2A2E]/60 mt-1">
            البحث عن المستخدمين المسجلين بالبريد وترقيتهم لطاقم العمل وتحديد صلاحيات كل دور بدقة
          </p>
        </div>
      </div>

      {/* 1. Search Box: Search by Email */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#DDE5E3]">
          <Search className="w-5 h-5 text-[#1E6B64]" />
          <h2 className="text-sm font-headline font-bold text-[#1F2A2E]">
            ابحث بالبريد الإلكتروني لإضافة موظف
          </h2>
        </div>

        <div className="relative">
          <input
            type="email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث بالبريد الإلكتروني (مثال: user@example.com)..."
            dir="ltr"
            className="w-full p-3.5 pr-10 bg-[#F5F7F6] border border-[#DDE5E3] rounded-2xl text-xs text-[#1F2A2E] placeholder:text-[#1F2A2E]/40 focus:outline-none focus:border-[#1E6B64] font-mono"
          />
          <Mail className="w-4 h-4 text-[#1F2A2E]/40 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Searching indicator */}
        {isSearching && (
          <div className="text-xs text-[#1E6B64] flex items-center gap-2 pt-1 font-bold">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#1E6B64] border-t-transparent animate-spin" />
            <span>جاري البحث في قاعدة المستخدمين المسجلين...</span>
          </div>
        )}

        {/* Search Results */}
        {hasSearched && !isSearching && searchResults.length > 0 && (
          <div className="mt-3 divide-y divide-[#DDE5E3] border border-[#DDE5E3] rounded-2xl overflow-hidden bg-[#FAFBFA]">
            {searchResults.map((usr) => {
              const isStaffMember = staffList.some((s) => s.id === usr.uid);
              const isSelf = usr.uid === currentAuthUser?.uid;

              return (
                <div
                  key={usr.uid}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#1F2A2E]">{usr.name}</span>
                      {isStaffMember && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E6B64]/10 text-[#1E6B64] border border-[#1E6B64]/20 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>موظف</span>
                        </span>
                      )}
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          أنت (المدير العام)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#1F2A2E]/60">
                      <span className="font-mono" dir="ltr">
                        {usr.email}
                      </span>
                      {usr.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-[#1F2A2E]/40" />
                          <span>{usr.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sm:self-center">
                    {isSelf ? (
                      <span className="text-[11px] text-[#1F2A2E]/40 italic">
                        حسابك الخاص
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenPermissionDrawer(usr)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1E6B64] hover:bg-[#17534d] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>تحديد الصلاحيات</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Not Found Message */}
        {hasSearched && !isSearching && searchResults.length === 0 && searchInput.trim().length >= 3 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-bold">
              مفيش حساب بالبريد ده. اطلب منه يسجّل في الموقع الأول
            </span>
          </div>
        )}
      </div>

      {/* 2. Table: Current Staff Members (Limit 50) */}
      <div className="bg-white rounded-3xl border border-[#DDE5E3] overflow-hidden shadow-xs space-y-0">
        <div className="p-5 sm:p-6 border-b border-[#DDE5E3] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-headline font-bold text-[#1F2A2E] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#1E6B64]" />
              <span>الموظفين الحاليين</span>
            </h2>
            <p className="text-xs text-[#1F2A2E]/60 mt-0.5">
              قائمة طاقم العمل والصلاحيات النشطة المسجلة في النظام ({staffList.length} موظف)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#F5F7F6] text-[#1F2A2E]/70 font-bold border-b border-[#DDE5E3]">
              <tr>
                <th className="py-3.5 px-4">اسم الموظف</th>
                <th className="py-3.5 px-4">البريد الإلكتروني</th>
                <th className="py-3.5 px-4">القالب (الدور)</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE5E3]">
              {isLoadingStaff ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#1F2A2E]/50">
                    جاري تحميل طاقم العمل...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#1F2A2E]/50">
                    لا يوجد موظفون مسجلون حالياً. استخدم خانة البحث أعلاه لإضافة موظف من المستخدمين المسجلين.
                  </td>
                </tr>
              ) : (
                staffList.map((member) => {
                  const isSelf = member.id === currentAuthUser?.uid;
                  const presetConfig =
                    PRESET_CONFIG[member.preset] ||
                    (member.role === 'admin' ? PRESET_CONFIG.admin : PRESET_CONFIG.cashier);

                  return (
                    <tr key={member.id} className="hover:bg-[#F5F7F6]/50 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-sm text-[#1F2A2E]">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#1E6B64]" />
                          <span>{member.name}</span>
                          {isSelf && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                              أنت
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#1F2A2E]/70" dir="ltr">
                        {member.email}
                      </td>

                      {/* Preset Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${presetConfig.color}`}
                        >
                          {presetConfig.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            member.active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-800 border-red-300'
                          }`}
                        >
                          {member.active ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>نشط</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span>معطل</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions: Edit / Suspend / Delete (Hidden for current admin) */}
                      <td className="py-3.5 px-4 text-center">
                        {isSelf ? (
                          <span className="text-[11px] font-bold text-[#1E6B64] px-2.5 py-1 rounded-full bg-[#1E6B64]/10 border border-[#1E6B64]/20">
                            حسابك الحالي (غير قابل للتعديل)
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenPermissionDrawer({
                                  uid: member.id,
                                  name: member.name,
                                  email: member.email,
                                  phone: '',
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#F5F7F6] hover:bg-[#DDE5E3] text-[#1F2A2E] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="تعديل الصلاحيات"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#1E6B64]" />
                              <span>تعديل</span>
                            </button>

                            {/* Suspend / Activate */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(member)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                member.active
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                              title={member.active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{member.active ? 'إيقاف' : 'تفعيل'}</span>
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member)}
                              className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-red-200"
                              title="حذف الحساب من طاقم العمل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Permission Drawer for Chosen User */}
      <BottomSheetModal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          chosenUser
            ? `تحديد صلاحيات الموظف: ${chosenUser.name}`
            : 'تحديد الصلاحيات'
        }
        maxWidth="max-w-2xl"
      >
        {chosenUser && (
          <div className="space-y-6 text-start">
            {/* User Details Header */}
            <div className="p-4 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-[#1F2A2E] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#1E6B64]" />
                  <span>{chosenUser.name}</span>
                </div>
                <div className="text-xs text-[#1F2A2E]/70 font-mono mt-0.5" dir="ltr">
                  {chosenUser.email}
                </div>
                {chosenUser.phone && (
                  <div className="text-[11px] text-[#1F2A2E]/60 mt-0.5">
                    الهاتف: {chosenUser.phone}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#1F2A2E]/60 font-bold">القالب المختار:</span>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${PRESET_CONFIG[selectedPreset].color}`}
                >
                  {PRESET_CONFIG[selectedPreset].label}
                </span>
              </div>
            </div>

            {/* Presets Selection Buttons */}
            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-2">
                اختيار قالب جاهز للأدوار الوظيفية:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { id: 'manager', label: 'مدير' },
                    { id: 'cashier', label: 'كاشير' },
                    { id: 'kitchen', label: 'مطبخ' },
                    { id: 'driver', label: 'سواق' },
                    { id: 'custom', label: 'مخصص' },
                  ] as const
                ).map((pr) => {
                  const isSelected = selectedPreset === pr.id;
                  return (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => handleSelectPreset(pr.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                        isSelected
                          ? 'bg-[#1E6B64] text-white border-[#1E6B64] shadow-xs'
                          : 'bg-[#F5F7F6] text-[#1F2A2E] border-[#DDE5E3] hover:border-[#1E6B64]'
                      }`}
                    >
                      {pr.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-[#1F2A2E]/50 mt-1.5">
                اختيار القالب يحدد الصلاحيات تلقائياً، ويمكنك تعديل أي صلاحية فردية أدناه.
              </div>
            </div>

            {/* Checkboxes: Exact 10 Permissions */}
            <div>
              <label className="block text-xs font-bold text-[#1F2A2E] mb-2">
                قائمة الصلاحيات التفصيلية (اضغط للتفعيل أو الإلغاء):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = !!permissions[perm.key];
                  return (
                    <label
                      key={perm.key}
                      onClick={() => handleTogglePermission(perm.key)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isChecked
                          ? 'bg-[#1E6B64]/5 border-[#1E6B64] text-[#1F2A2E]'
                          : 'bg-white border-[#DDE5E3] text-[#1F2A2E]/70 hover:border-[#1E6B64]/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container onClick
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isChecked
                            ? 'bg-[#1E6B64] border-[#1E6B64] text-white'
                            : 'bg-white border-[#DDE5E3]'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="text-xs leading-relaxed font-bold">
                        {perm.label}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-[#F5F7F6] rounded-2xl border border-[#DDE5E3]">
              <div>
                <div className="font-bold text-xs text-[#1F2A2E]">حالة الحساب (نشط)</div>
                <div className="text-[11px] text-[#1F2A2E]/60 mt-0.5">
                  {isActive
                    ? 'الحساب مفعل ومصرح له بالعمل على شاشات النظام'
                    : 'الحساب معطل وموقوف عن العمل مؤقتاً'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-[#1E6B64]' : 'bg-[#DDE5E3]'
                }`}
                role="switch"
                aria-checked={isActive}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-0' : '-translate-x-5'
                  }`}
                />
              </button>
            </div>

            {/* Note on non-delegable staff management */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>تنبيه:</strong> إدارة الموظفين نفسها غير قابلة للتفويض ومخصصة للمدير العام فقط، ولا يمكن منحها لأي موظف عبر الصلاحيات الفرعية.
              </p>
            </div>

            {/* Drawer Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#DDE5E3]">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 bg-[#F5F7F6] hover:bg-[#DDE5E3] text-[#1F2A2E] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#1E6B64] hover:bg-[#17534d] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>حفظ الصلاحيات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  );
};

