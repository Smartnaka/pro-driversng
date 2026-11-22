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

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'DRIVER' | 'VEHICLE_OWNER' | 'ADMIN';
  avatarUrl: string | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Session token stored strictly in React/JS memory (never localStorage)
  const memoryTokenRef = useRef<string | null>(null);
  const firebaseUserRef = useRef<FirebaseUser | null>(null);

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
