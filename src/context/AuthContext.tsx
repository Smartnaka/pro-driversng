import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { apiRequest, registerTokenGetter } from '../lib/api';
import { auth, googleAuthProvider } from '../lib/firebase';

export interface NotificationPrefs {
  bookingAlerts: boolean;
  paymentAlerts: boolean;
  marketingEmails: boolean;
}

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'DRIVER' | 'VEHICLE_OWNER' | 'ADMIN';
  avatarUrl: string | null;
  defaultPickupLocation?: string | null;
  onboardingCompleted?: boolean;
  notificationPrefs?: NotificationPrefs;
  hasPassword?: boolean;
  isActive?: boolean;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  loginWithGoogle: (requestedRole?: string) => Promise<AppUser>;
  loginWithPassword: (email: string, password: string) => Promise<AppUser>;
  registerAccount: (payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: 'CUSTOMER' | 'DRIVER' | 'VEHICLE_OWNER';
    location?: string;
    companyName?: string;
    yearsExperience?: number;
  }) => Promise<AppUser>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapFirebaseAuthError(err: unknown): Error {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/popup-blocked':
      return new Error(
        'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.'
      );
    case 'auth/popup-closed-by-user':
      return new Error(
        'The Google sign-in window was closed before completing sign-in.'
      );
    case 'auth/cancelled-popup-request':
      return new Error('Google sign-in was cancelled. Please try again.');
    case 'auth/unauthorized-domain':
      return new Error(
        'This domain is not authorized for Google Sign-In. Open the app from the authorized preview URL or use email sign-in.'
      );
    case 'auth/network-request-failed':
      return new Error(
        'Network error while connecting to Google Sign-In. Please check your connection and try again.'
      );
    default:
      return err instanceof Error ? err : new Error('Google Sign-In failed.');
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Session token stored strictly in React/JS memory (never localStorage)
  const memoryTokenRef = useRef<string | null>(null);
  const firebaseUserRef = useRef<FirebaseUser | null>(null);
  const googleLoginInFlightRef = useRef<boolean>(false);

  const getBearerToken = useCallback(async (): Promise<string | null> => {
    if (memoryTokenRef.current) {
      return memoryTokenRef.current;
    }
    if (firebaseUserRef.current) {
      return await firebaseUserRef.current.getIdToken();
    }
    return null;
  }, []);

  useEffect(() => {
    registerTokenGetter(getBearerToken);
  }, [getBearerToken]);

  const refreshUser = useCallback(async () => {
    const token = await getBearerToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await apiRequest<{ user: AppUser }>('/api/auth/me');
      setUser(data.user);
    } catch {
      memoryTokenRef.current = null;
      setUser(null);
    }
  }, [getBearerToken]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      firebaseUserRef.current = fbUser;
      if (googleLoginInFlightRef.current) {
        setLoading(false);
        return;
      }
      if (fbUser && !memoryTokenRef.current) {
        try {
          const idToken = await fbUser.getIdToken();
          const data = await apiRequest<{ user: AppUser }>('/api/auth/firebase-sync', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({}),
          });
          setUser(data.user);
        } catch {
          setUser(null);
        }
      } else if (!fbUser && !memoryTokenRef.current) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = useCallback(async (requestedRole?: string) => {
    googleLoginInFlightRef.current = true;
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      firebaseUserRef.current = cred.user;
      memoryTokenRef.current = null;
      const idToken = await cred.user.getIdToken();
      const data = await apiRequest<{ user: AppUser }>('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ role: requestedRole }),
      });
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw mapFirebaseAuthError(err);
    } finally {
      googleLoginInFlightRef.current = false;
    }
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: AppUser }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    memoryTokenRef.current = data.token;
    setUser(data.user);
    return data.user;
  }, []);

  const registerAccount = useCallback(
    async (payload: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      role: 'CUSTOMER' | 'DRIVER' | 'VEHICLE_OWNER';
      location?: string;
      companyName?: string;
      yearsExperience?: number;
    }) => {
      const data = await apiRequest<{ token: string; user: AppUser }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      memoryTokenRef.current = data.token;
      setUser(data.user);
      return data.user;
    },
    []
  );

  const logout = useCallback(async () => {
    memoryTokenRef.current = null;
    firebaseUserRef.current = null;
    setUser(null);
    await firebaseSignOut(auth).catch(() => undefined);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginWithPassword,
        registerAccount,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
