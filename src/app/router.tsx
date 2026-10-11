import React, { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { CustomerLayout } from './CustomerLayout';
import { RequireRole } from '../hooks/useAuth';

// Customer Pages (Direct import for instant critical path loading)
import { HomePage } from '../features/home/HomePage';
import { MenuPage } from '../features/menu/MenuPage';
import { CartPage } from '../features/cart/CartPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { OrderTrackingPage } from '../features/orders/OrderTrackingPage';
import { CustomerOrdersPage } from '../features/orders/CustomerOrdersPage';
import { AboutPage } from '../features/about/AboutPage';
import { NotFoundPage } from '../features/common/NotFoundPage';
import { LoginPage } from '../features/auth/LoginPage';
import { AccountPage } from '../features/account/AccountPage';
import { TermsPage } from '../features/legal/TermsPage';
import { PrivacyPage } from '../features/legal/PrivacyPage';

// Admin Pages (Code-split with React.lazy so dashboard chunks never load for customer store visitors)
const AdminLayout = React.lazy(() =>
  import('./AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const StaffLoginPage = React.lazy(() =>
  import('../features/admin/StaffLoginPage').then((m) => ({ default: m.StaffLoginPage }))
);
const OverviewPage = React.lazy(() =>
  import('../features/admin/OverviewPage').then((m) => ({ default: m.OverviewPage }))
);
const LiveOrdersPage = React.lazy(() =>
  import('../features/admin/LiveOrdersPage').then((m) => ({ default: m.LiveOrdersPage }))
);
const PhoneOrderPage = React.lazy(() =>
  import('../features/admin/PhoneOrderPage').then((m) => ({ default: m.PhoneOrderPage }))
);
const MenuManagementPage = React.lazy(() =>
  import('../features/admin/MenuManagementPage').then((m) => ({ default: m.MenuManagementPage }))
);
const StaffPage = React.lazy(() =>
  import('../features/admin/StaffPage').then((m) => ({ default: m.StaffPage }))
);
const SettingsPage = React.lazy(() =>
  import('../features/admin/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const KitchenPage = React.lazy(() =>
  import('../features/admin/KitchenPage').then((m) => ({ default: m.KitchenPage }))
);
const DriverPage = React.lazy(() =>
  import('../features/admin/DriverPage').then((m) => ({ default: m.DriverPage }))
);

const LazyFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-xs font-bold text-[#1E6B64]">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-[#1E6B64] animate-ping" />
      <span>جاري التحميل...</span>
    </div>
  </div>
);

export const router = createBrowserRouter([
  // Customer site with CustomerLayout (Header, 4-tab bottom nav, dish modal)
  {
    path: '/',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <CustomerOrdersPage /> },
      { path: 'order/:id', element: <OrderTrackingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // Standalone staff login (no customer header, standalone card)
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={<LazyFallback />}>
        <StaffLoginPage />
      </Suspense>
    ),
  },

  // Standalone Kitchen Display (kitchen staff or admin)
  {
    path: '/admin/kitchen',
    element: (
      <RequireRole roles={['admin', 'kitchen']}>
        <Suspense fallback={<LazyFallback />}>
          <KitchenPage />
        </Suspense>
      </RequireRole>
    ),
  },

  // Standalone Driver App (driver staff or admin)
  {
    path: '/admin/driver',
    element: (
      <RequireRole roles={['admin', 'driver']}>
        <Suspense fallback={<LazyFallback />}>
          <DriverPage />
        </Suspense>
      </RequireRole>
    ),
  },

  // Admin dashboard with AdminLayout (roles: admin, manager, cashier)
  {
    path: '/admin',
    element: (
      <RequireRole roles={['admin', 'manager', 'cashier']}>
        <Suspense fallback={<LazyFallback />}>
          <AdminLayout />
        </Suspense>
      </RequireRole>
    ),
    children: [
      {
        index: true,
        element: (
          <RequireRole roles={['admin', 'manager']}>
            <Suspense fallback={<LazyFallback />}>
              <OverviewPage />
            </Suspense>
          </RequireRole>
        ),
      },
      {
        path: 'orders',
        element: (
          <RequireRole roles={['admin', 'manager', 'cashier']}>
            <Suspense fallback={<LazyFallback />}>
              <LiveOrdersPage />
            </Suspense>
          </RequireRole>
        ),
      },
      {
        path: 'new-order',
        element: (
          <RequireRole roles={['admin', 'manager', 'cashier']}>
            <Suspense fallback={<LazyFallback />}>
              <PhoneOrderPage />
            </Suspense>
          </RequireRole>
        ),
      },
      {
        path: 'menu',
        element: (
          <RequireRole roles={['admin', 'manager']}>
            <Suspense fallback={<LazyFallback />}>
              <MenuManagementPage />
            </Suspense>
          </RequireRole>
        ),
      },
      {
        path: 'staff',
        element: (
          <RequireRole roles={['admin']}>
            <Suspense fallback={<LazyFallback />}>
              <StaffPage />
            </Suspense>
          </RequireRole>
        ),
      },
      {
        path: 'settings',
        element: (
          <RequireRole roles={['admin', 'manager']}>
            <Suspense fallback={<LazyFallback />}>
              <SettingsPage />
            </Suspense>
          </RequireRole>
        ),
      },
    ],
  },

  // Catch-all 404
  {
    path: '*',
    element: (
      <CustomerLayout />
    ),
    children: [
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
