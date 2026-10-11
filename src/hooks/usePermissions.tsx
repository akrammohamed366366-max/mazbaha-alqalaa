import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';
import { StaffPermissions, StaffUser } from '../types';

export function getStaffHome(can: (p: keyof StaffPermissions) => boolean): string {
  if (can('reports_view')) return '/admin';
  if (can('orders_view')) return '/admin/orders';
  if (can('kitchen')) return '/admin/kitchen';
  if (can('driver')) return '/admin/driver';
  if (can('orders_create')) return '/admin/new-order';
  if (can('menu_manage')) return '/admin/menu';
  if (can('settings_manage')) return '/admin/settings';
  return '/admin';
}

export function usePermissions() {
  const { user, loading: authLoading } = useAuth();
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [staffLoading, setStaffLoading] = useState<boolean>(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStaffUser(null);
      setStaffLoading(false);
      return;
    }

    setStaffLoading(true);
    const staffRef = doc(db, 'staff', user.uid);
    const unsubscribe = onSnapshot(
      staffRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.active === true) {
            setStaffUser({
              id: snap.id,
              name: data.name || user.displayName || 'موظف',
              email: data.email || user.email || '',
              role: data.role || 'staff',
              preset: data.preset || (data.role === 'admin' ? 'admin' : 'cashier'),
              permissions: data.permissions || {},
              active: true,
              createdAt: data.createdAt,
              createdBy: data.createdBy,
              updatedAt: data.updatedAt,
            });
          } else {
            setStaffUser(null);
          }
        } else {
          setStaffUser(null);
        }
        setStaffLoading(false);
      },
      (err) => {
        console.warn('usePermissions staff listener error:', err.message);
        setStaffUser(null);
        setStaffLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const isStaff = !!staffUser && staffUser.active === true;
  const isAdmin = isStaff && staffUser?.role === 'admin';

  const can = useMemo(() => {
    return (p: keyof StaffPermissions): boolean => {
      if (!isStaff) return false;
      if (isAdmin) return true;
      return !!staffUser?.permissions?.[p];
    };
  }, [isStaff, isAdmin, staffUser]);

  const homeUrl = useMemo(() => {
    if (!isStaff) return '/';
    return getStaffHome(can);
  }, [isStaff, can]);

  return {
    isStaff,
    isAdmin,
    can,
    staffUser,
    loading: authLoading || staffLoading,
    homeUrl,
  };
}
