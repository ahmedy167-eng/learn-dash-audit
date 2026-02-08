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
    // First try direct getSession
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!isMountedRef.current) return;
      if (error && isNetworkError(error)) throw error;
      setSession(session);
      setUser(session?.user ?? null);
      setConnectionError(false);
      return;
    } catch (directErr) {
      console.warn('[useAuth] Direct getSession failed, trying proxy fallback...', directErr);
    }

    // Fallback: use auth-proxy with stored refresh token
    try {
      const storedSession = localStorage.getItem('sb-bhspeoledfydylvonobv-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        const refreshToken = parsed?.refresh_token;
        if (refreshToken) {
          const { data, error } = await supabase.functions.invoke('auth-proxy', {
            body: { action: 'get-session', refreshToken },
          });
          if (!isMountedRef.current) return;
          if (error || data?.error) throw new Error(data?.error || error?.message);

          // Establish the session locally
          const { error: setErr } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (!isMountedRef.current) return;
          if (setErr) throw setErr;

          setConnectionError(false);
          return;
        }
      }

      // No stored session → user is simply logged out
      if (isMountedRef.current) {
        setSession(null);
        setUser(null);
        setConnectionError(false);
      }
    } catch (proxyErr) {
      console.error('[useAuth] Proxy fallback also failed:', proxyErr);
      if (isMountedRef.current) {
        setConnectionError(true);
      }
    }
  }, []);

  useEffect(() => {
    const isMountedRef = { current: true };

    // Listener for ONGOING auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMountedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session) setConnectionError(false);
      }
    );

    // INITIAL load
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
      const { data, error } = await supabase.functions.invoke('auth-proxy', {
        body: { action: 'sign-up', email, password, fullName, redirectUrl },
      });

      if (error) {
        return { error: new Error(error.message || 'Sign up failed') };
      }
      if (data?.error) {
        return { error: new Error(data.error) };
      }

      // If auto-confirm is on, we get a session back → establish it
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: new Error('Network error. Please check your connection and try again.') };
      }
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-proxy', {
        body: { action: 'sign-in', email, password },
      });

      if (error) {
        return { error: new Error(error.message || 'Sign in failed') };
      }
      if (data?.error) {
        return { error: new Error(data.error) };
      }

      // Establish the local session with returned tokens
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (setErr) {
        return { error: setErr };
      }

      return { error: null };
    } catch (err) {
      if (isNetworkError(err)) {
        return { error: new Error('Network error. Please check your connection and try again.') };
      }
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  };

  const signOut = async () => {
    try {
      const accessToken = session?.access_token;
      await supabase.functions.invoke('auth-proxy', {
        body: { action: 'sign-out', accessToken },
      });
    } catch {
      // Best-effort server-side sign out
    }
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
