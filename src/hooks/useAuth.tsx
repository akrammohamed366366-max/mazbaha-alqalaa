import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useLocation, Navigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import {
  signInStaff as firebaseSignInStaff,
  signOutUser,
  getStaffProfile,
} from '../firebase/auth';
import { StaffRole, StaffUser, StaffPermissions } from '../types';

export function getRoleHome(role: StaffRole | string): string {
  switch (role) {
    case 'admin':
    case 'manager':
      return '/admin';
    case 'cashier':
      return '/admin/orders';
    case 'kitchen':
      return '/admin/kitchen';
    case 'driver':
      return '/admin/driver';
    default:
      return '/admin';
  }
}

interface AuthContextType {
  user: User | null;
  staffUser: StaffUser | null;
  role: StaffRole | null;
  loading: boolean;
  isStaff: boolean;
  can: (permission: keyof StaffPermissions) => boolean;
  signInStaff: (email: string, password: string) => Promise<{ user: User; staff: StaffUser }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await getStaffProfile(currentUser.uid);
          setStaffUser(profile);
        } catch {
          setStaffUser(null);
        }
      } else {
        setStaffUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignInStaff = async (email: string, password: string) => {
    const res = await firebaseSignInStaff(email, password);
    setUser(res.user);
    setStaffUser(res.staff);
    return res;
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setStaffUser(null);
  };

  const isStaff = !!staffUser && staffUser.active === true;

  // Determine active role label for UI
  const role: StaffRole | null = staffUser
    ? staffUser.role === 'admin'
      ? 'admin'
      : (staffUser.preset as StaffRole)
    : null;

  const can = (p: keyof StaffPermissions): boolean => {
    if (!staffUser || !staffUser.active) return false;
    if (staffUser.role === 'admin') return true;
    return !!staffUser.permissions?.[p];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        staffUser,
        role,
        loading,
        isStaff,
        can,
        signInStaff: handleSignInStaff,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Route guard component for staff pages.
 * Supports checking roles (e.g. ['admin', 'manager', 'cashier']) or fine-grained permissions.
 */
import { AccessDenied } from '../components/common/AccessDenied';
import { usePermissions } from './usePermissions';

export const RequireRole: React.FC<{
  roles?: StaffRole[];
  permission?: keyof StaffPermissions;
  adminOnly?: boolean;
  children: React.ReactNode;
}> = ({ roles, permission, adminOnly, children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, isAdmin, can, staffUser, loading: permLoading } = usePermissions();
  const location = useLocation();

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7F6] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1E6B64] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not signed in at all: send to unified login with redirect param
  if (!user) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectUrl} replace />;
  }

  // Signed in, but not an active staff member (e.g. regular customer)
  if (!isStaff) {
    return <AccessDenied message="هذه الصفحة مخصصة لطاقم عمل المطعم فقط. حسابك الحالي مسجل كعميل." />;
  }

  // Check admin only
  if (adminOnly && !isAdmin) {
    return <AccessDenied message="هذا القسم مخصص للمدير العام فقط." />;
  }

  // Check allowed roles
  if (roles && roles.length > 0) {
    const isAllowedRole =
      isAdmin ||
      (staffUser &&
        (roles.includes(staffUser.preset as any) || roles.includes(staffUser.role as any)));
    if (!isAllowedRole) {
      return <AccessDenied message="ليس لديك الصلاحية المطلوبة للوصول إلى هذا القسم." />;
    }
  }

  // Check specific permission
  if (permission && !can(permission)) {
    return <AccessDenied message="ليس لديك الصلاحية المطلوبة للوصول إلى هذا القسم." />;
  }

  return <>{children}</>;
};
