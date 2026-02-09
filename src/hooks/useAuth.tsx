import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const AUTH_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-proxy`;

const FETCH_TIMEOUT_MS = 10_000;

// Helper to detect network-level errors
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    return true;
  }
  if (error instanceof Error && error.message.includes('Failed to send a request')) {
    return true;
  }
  return false;
};

// Fetch with an AbortController timeout to fail fast on blocked networks
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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

async function proxyFetch(body: Record<string, unknown>): Promise<{ data: any; error: Error | null }> {
  const response = await fetchWithTimeout(AUTH_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data?.error) {
    return { data, error: new Error(data?.error || `Request failed with status ${response.status}`) };
  }
  return { data, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const initializeAuth = useCallback(async (isMountedRef: { current: boolean }) => {
    // Attempt 1: Direct SDK getSession
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!isMountedRef.current) return;
      if (error && isNetworkError(error)) throw error;
      setSession(session);
      setUser(session?.user ?? null);
      setConnectionError(false);
      return;
    } catch (directErr) {
      // AbortError = cancelled (e.g. StrictMode unmount), not a real failure
      if (directErr instanceof DOMException && directErr.name === 'AbortError') {
        return;
      }
      console.warn('[useAuth] Direct getSession failed, trying proxy fallback...', directErr);
    }

    // Attempt 2: Auth-proxy with stored refresh token
    try {
      const storedSession = localStorage.getItem('sb-bhspeoledfydylvonobv-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        const refreshToken = parsed?.refresh_token;
        if (refreshToken) {
          const { data, error } = await proxyFetch({ action: 'get-session', refreshToken });
          if (!isMountedRef.current) return;
          if (error) throw error;

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
      // Clear stale stored session to avoid repeated failures on next load
      localStorage.removeItem('sb-bhspeoledfydylvonobv-auth-token');
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

  // ── Dual-path Sign Up: direct SDK first, then proxy fallback ──
  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    // Attempt 1: Direct SDK
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error && !isNetworkError(error)) {
        return { error };
      }

      if (!error && data) {
        // If auto-confirm is on, we get a session back
        if (data.session) {
          // Session is already established by the SDK
        }
        return { error: null };
      }
      // If network error from SDK, fall through to proxy
      console.warn('[useAuth] Direct signUp failed with network error, trying proxy...');
    } catch (directErr) {
      if (!isNetworkError(directErr)) {
        return { error: directErr instanceof Error ? directErr : new Error('An unexpected error occurred') };
      }
      console.warn('[useAuth] Direct signUp threw network error, trying proxy...');
    }

    // Attempt 2: Auth proxy fallback
    try {
      const { data, error } = await proxyFetch({
        action: 'sign-up', email, password, fullName, redirectUrl,
      });

      if (error) {
        return { error };
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

  // ── Dual-path Sign In: direct SDK first, then proxy fallback ──
  const signIn = async (email: string, password: string) => {
    // Attempt 1: Direct SDK
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error && !isNetworkError(error)) {
        return { error };
      }

      if (!error && data.session) {
        // Session is already established by the SDK
        return { error: null };
      }
      // If network error, fall through to proxy
      console.warn('[useAuth] Direct signIn failed with network error, trying proxy...');
    } catch (directErr) {
      if (!isNetworkError(directErr)) {
        return { error: directErr instanceof Error ? directErr : new Error('An unexpected error occurred') };
      }
      console.warn('[useAuth] Direct signIn threw network error, trying proxy...');
    }

    // Attempt 2: Auth proxy fallback
    try {
      const { data, error } = await proxyFetch({
        action: 'sign-in', email, password,
      });

      if (error) {
        return { error };
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
      await proxyFetch({ action: 'sign-out', accessToken });
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
