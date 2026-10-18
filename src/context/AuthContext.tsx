import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AuthContextValue {
  firebaseUser: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  // Keep ID token strictly in memory per security guidelines
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          tokenRef.current = await user.getIdToken();
        } catch (err) {
          console.error('Failed to retrieve ID token:', err);
          tokenRef.current = null;
        }
      } else {
        tokenRef.current = null;
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      tokenRef.current = await cred.user.getIdToken();
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      setAuthError(error?.message || 'Sign-in was cancelled or failed.');
    }
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
    tokenRef.current = null;
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    let token = tokenRef.current;
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
      tokenRef.current = token;
    }

    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        loading,
        authError,
        signInWithGoogle,
        logout,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
