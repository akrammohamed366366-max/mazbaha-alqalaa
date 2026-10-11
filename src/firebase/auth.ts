import {
  signInWithEmailAndPassword,
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { StaffUser, UserProfile, OrderDeliveryAddress } from '../types';

/**
 * Arabic error messages mapping for Firebase Auth codes
 */
export function mapAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'كلمة المرور أو البريد الإلكتروني غير صحيح';
    case 'auth/user-not-found':
      return 'لا يوجد حساب مسجل بهذا البريد الإلكتروني';
    case 'auth/email-already-in-use':
      return 'البريد الإلكتروني مسجل بالفعل، يمكنك تسجيل الدخول بدلاً من ذلك';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة، يجب ألا تقل عن 8 أحرف';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول بواسطة المستخدم';
    case 'auth/popup-blocked':
      return 'تم حظر النافذة المنبثقة من قِبل المتصفح، يرجى السماح بالنوافذ المنبثقة';
    case 'auth/too-many-requests':
      return 'محاولات دخول خاطئة متكررة، يرجى الانتظار بضع دقائق والمحاولة مجدداً';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالشبكة، يرجى التحقق من اتصال الإنترنت';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة';
    default:
      return err?.message || 'حدث خطأ أثناء المصادقة، يرجى المحاولة مرة أخرى';
  }
}

/**
 * Sync user document in Firestore on login
 * Creates users/{uid} on first login, updates lastLoginAt on subsequent logins.
 */
export async function syncUserOnLogin(
  user: User,
  signupExtra?: { name?: string; phone?: string }
): Promise<void> {
  if (!user?.uid) return;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        name: (signupExtra?.name || user.displayName || 'عميل').trim().slice(0, 80),
        phone: signupExtra?.phone ? signupExtra.phone.trim() : '',
        email: (user.email || '').toLowerCase(),
        addresses: [],
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('syncUserOnLogin warning:', err);
  }
}

/**
 * Staff authentication via email and password.
 * Checks Firestore document staff/{uid} directly (Spark plan).
 * If the user has no active staff document, signs them out and throws an error.
 */
export async function signInStaff(
  email: string,
  password: string
): Promise<{ user: User; staff: StaffUser }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await syncUserOnLogin(cred.user);

    const staffDocRef = doc(db, 'staff', cred.user.uid);
    const staffSnap = await getDoc(staffDocRef);

    if (!staffSnap.exists() || staffSnap.data()?.active !== true) {
      await signOut(auth);
      const error = new Error('الحساب ده مش مسجل كموظف');
      (error as any).code = 'auth/not-staff';
      throw error;
    }

    const data = staffSnap.data();
    const staff: StaffUser = {
      id: staffSnap.id,
      name: data.name || cred.user.displayName || 'موظف',
      email: data.email || cred.user.email || '',
      role: data.role || 'staff',
      preset: data.preset || (data.role === 'admin' ? 'admin' : 'cashier'),
      permissions: data.permissions || {},
      active: data.active ?? true,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      updatedAt: data.updatedAt,
    };

    return { user: cred.user, staff };
  } catch (err: any) {
    if (err.code === 'auth/not-staff') {
      throw err;
    }
    const friendlyError = new Error(mapAuthError(err));
    (friendlyError as any).code = err.code || 'auth/invalid-credentials';
    throw friendlyError;
  }
}

/**
 * Reads staff profile from Firestore staff/{uid}
 */
export async function getStaffProfile(uid: string): Promise<StaffUser | null> {
  if (!uid) return null;
  try {
    const staffDocRef = doc(db, 'staff', uid);
    const snap = await getDoc(staffDocRef);
    if (!snap.exists() || snap.data()?.active !== true) {
      return null;
    }
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name || '',
      email: data.email || '',
      role: data.role || 'staff',
      preset: data.preset || (data.role === 'admin' ? 'admin' : 'cashier'),
      permissions: data.permissions || {},
      active: data.active ?? true,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Signs in customer with Google (popup, falls back to redirect)
 */
export async function signInCustomerWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  try {
    const res = await signInWithPopup(auth, provider);
    await syncUserOnLogin(res.user);
    return res.user;
  } catch (err: any) {
    // If popup is blocked or on mobile redirect preference, try redirect
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, provider);
      // Wait for redirect flow to finish on page reload
      throw err;
    }
    throw err;
  }
}

/**
 * Signs in customer with email and password
 */
export async function signInCustomerWithEmail(email: string, password: string): Promise<User> {
  const res = await signInWithEmailAndPassword(auth, email.trim(), password);
  await syncUserOnLogin(res.user);
  return res.user;
}

/**
 * Creates a new customer account with email and password, sends verification
 */
export async function registerCustomer(
  email: string,
  password: string,
  name: string,
  phone: string = ''
): Promise<User> {
  const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await sendEmailVerification(res.user);
  } catch (e) {
    console.warn('sendEmailVerification error:', e);
  }

  // Create users/{uid} document immediately with validated phone
  const userRef = doc(db, 'users', res.user.uid);
  await setDoc(userRef, {
    name: name.trim().slice(0, 80),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    addresses: [],
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  return res.user;
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(user: User): Promise<void> {
  if (!user) return;
  await sendEmailVerification(user);
}

/**
 * Reload current user from Firebase Auth to check verified state
 */
export async function reloadCurrentUser(user: User): Promise<boolean> {
  if (!user) return false;
  await user.reload();
  return user.emailVerified;
}

/**
 * Signs out the current user.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Reads user profile from Firestore users/{uid}
 */
export async function getCustomerProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Saves customer name, phone, and addresses to users/{uid}
 */
export async function saveCustomerProfile(
  uid: string,
  profile: {
    name: string;
    phone: string;
    addresses?: OrderDeliveryAddress[];
  }
): Promise<void> {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      name: profile.name.trim().slice(0, 80),
      phone: profile.phone.trim(),
      email: auth.currentUser?.email ? auth.currentUser.email.toLowerCase() : '',
      addresses: profile.addresses || [],
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    await updateDoc(userRef, {
      name: profile.name.trim().slice(0, 80),
      phone: profile.phone.trim(),
      addresses: profile.addresses || [],
      lastLoginAt: serverTimestamp(),
    });
  }
}

