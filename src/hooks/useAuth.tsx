import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Helper to detect network-level errors
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    return true;
  }
  return false;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  connectionError: boolean;
  retryConnection: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const initializeAuth = useCallback(async (isMountedRef: { current: boolean }) => {
    const MAX_RETRIES = 2;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMountedRef.current) return;
        if (error && isNetworkError(error)) throw error;
        setSession(session);
        setUser(session?.user ?? null);
        setConnectionError(false);
        return; // success
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES && isNetworkError(err)) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    // All retries failed
    if (isMountedRef.current && isNetworkError(lastError)) {
      setConnectionError(true);
    }
  }, []);

  useEffect(() => {
    const isMountedRef = { current: true };

    // Listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMountedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session) setConnectionError(false);
      }
    );

    // INITIAL load (controls loading)
    const runInit = async () => {
      try {
        await initializeAuth(isMountedRef);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    runInit();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  const retryConnection = useCallback(async () => {
    setLoading(true);
    setConnectionError(false);
    const isMountedRef = { current: true };
    try {
      await initializeAuth(isMountedRef);
    } finally {
      setLoading(false);
    }
  }, [initializeAuth]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });
      return { error };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: new Error('Network error. Please check your connection and try again.') };
      }
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: new Error('Network error. Please check your connection and try again.') };
      }
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, connectionError, retryConnection, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
