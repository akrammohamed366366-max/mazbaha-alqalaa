import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import {
  LayoutDashboard,
  ClipboardList,
  PhoneCall,
  UtensilsCrossed,
  Users,
  Settings,
  LogOut,
  Flame,
  Menu,
  X,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { StaffPermissions } from '../types';

export const AdminLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isStaff, isAdmin, can, staffUser } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);

  // Prompt S6: Global listener for resource-exhausted and unavailable events
  useEffect(() => {
    const handleQuotaError = () => {
      setQuotaExhausted(true);
    };

    window.addEventListener('firebase-quota-exhausted', handleQuotaError);
    window.addEventListener('firebase-service-unavailable', handleQuotaError);
    return () => {
      window.removeEventListener('firebase-quota-exhausted', handleQuotaError);
      window.removeEventListener('firebase-service-unavailable', handleQuotaError);
    };
  }, []);

  // Enforce noindex for all admin routes
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

  // Nav items definition with required permission per prompt specification
  const allNavItems: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    permission?: keyof StaffPermissions;
    adminOnly?: boolean;
  }[] = [
    { label: 'نظرة عامة', path: '/admin', icon: LayoutDashboard, permission: 'reports_view' },
    { label: 'الطلبات', path: '/admin/orders', icon: ClipboardList, permission: 'orders_view' },
    { label: 'طلب تليفوني', path: '/admin/new-order', icon: PhoneCall, permission: 'orders_create' },
    { label: 'المنيو', path: '/admin/menu', icon: UtensilsCrossed, permission: 'menu_manage' },
    { label: 'الموظفين', path: '/admin/staff', icon: Users, adminOnly: true },
    { label: 'الإعدادات', path: '/admin/settings', icon: Settings, permission: 'settings_manage' },
  ];

  // Filter nav items based on current staff permissions
  const visibleNavItems = allNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.permission) return can(item.permission);
    return true;
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const roleLabels: Record<string, string> = {
    admin: 'مدير عام',
    manager: 'مدير تشغيل',
    cashier: 'كاشير',
    kitchen: 'شيف شواية',
    driver: 'سواق توصيل',
  };

  const staffDisplayName = user?.displayName || user?.email?.split('@')[0] || 'موظف';

  return (
    <div className="min-h-screen bg-[#F5F7F6] text-[#1F2A2E] flex font-sans antialiased overflow-x-hidden">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1F2A2E]/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Right Sidebar */}
      <aside
        className={`fixed md:sticky top-0 right-0 z-50 h-screen bg-[#1F2A2E] text-white flex flex-col justify-between transition-all duration-200 border-l border-white/10 ${
          isMobileMenuOpen
            ? 'w-64 translate-x-0'
            : 'max-md:translate-x-full md:w-20 lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3 overflow-hidden text-start">
              <div className="w-9 h-9 rounded-xl bg-[#C23B22] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Flame className="w-5 h-5" />
              </div>
              <div className="hidden lg:block truncate">
                <div className="font-headline font-bold text-sm tracking-tight">
                  مذبحة القلعة
                </div>
                <div className="text-[10px] text-white/50">لوحة الإدارة والتشغيل</div>
              </div>
            </div>

            {/* Close button for mobile drawer */}
            <button
              type="button"
              className="md:hidden text-white/70 hover:text-white p-1 cursor-pointer"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filtered Nav List */}
          <nav className="p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-[#C23B22] text-white shadow-xs'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="md:hidden lg:inline truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer with Stations and Logout */}
        <div className="p-3 border-t border-white/10 space-y-1">
          {/* Quick links to standalone stations */}
          {(can('kitchen') || can('driver')) && (
            <>
              <div className="hidden lg:block px-3 py-1.5 text-[10px] text-white/40 font-bold">
                شاشات المحطات:
              </div>
              {can('kitchen') && (
                <Link
                  to="/admin/kitchen"
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5"
                  title="شاشة المطبخ والتحضير"
                >
                  <UtensilsCrossed className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="md:hidden lg:inline truncate">شاشة المطبخ والتحضير</span>
                </Link>
              )}
              {can('driver') && (
                <Link
                  to="/admin/driver"
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5"
                  title="تطبيق السائق"
                >
                  <Flame className="w-4 h-4 shrink-0 text-teal-400" />
                  <span className="md:hidden lg:inline truncate">تطبيق السائق</span>
                </Link>
              )}
            </>
          )}

          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5"
            title="متجر العملاء"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span className="md:hidden lg:inline truncate">متجر العملاء</span>
          </Link>

          {/* Logout at bottom */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="md:hidden lg:inline truncate">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: ONLY staff name + role badge */}
        <header className="h-16 bg-white border-b border-[#DDE5E3] px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 rounded-xl text-[#1F2A2E] hover:bg-[#F5F7F6] cursor-pointer"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Actions: PWA Install + Staff name + Role badge */}
          <div className="flex items-center gap-3">
            <PWAInstallButton variant="compact" />
            <div className="text-start">
              <span className="block text-xs font-bold text-[#1F2A2E]">
                {staffDisplayName}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1E6B64]/10 text-[#1E6B64] border border-[#1E6B64]/20">
              {roleLabels[staffUser?.preset || staffUser?.role || 'cashier'] || 'موظف'}
            </span>
          </div>
        </header>

        {/* Global Resource-Exhausted / Quota Banner for Dashboard (Prompt S6) */}
        {quotaExhausted && (
          <div className="bg-red-600 text-white py-2.5 px-4 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>تم الوصول للحد اليومي المجاني لـ Firebase</span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
