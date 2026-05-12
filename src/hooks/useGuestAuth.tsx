import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';

interface Guest {
  id: string;
  username: string;
  display_name: string;
}

interface GuestAuthContextType {
  guest: Guest | null;
  loading: boolean;
  sessionToken: string | null;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (username: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  apiCall: (action: string, payload?: Record<string, unknown>) => Promise<any>;
}

const GuestAuthContext = createContext<GuestAuthContextType | undefined>(undefined);

const STORAGE_GUEST = 'guestAuth';
const STORAGE_TOKEN = 'guestSessionToken';
const STORAGE_EXPIRES = 'guestSessionExpiresAt';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callEdge(action: string, payload: Record<string, unknown>): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/guest-auth/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_GUEST);
    const token = sessionStorage.getItem(STORAGE_TOKEN);
    const expires = sessionStorage.getItem(STORAGE_EXPIRES);
    if (stored && token && expires && new Date(expires) > new Date()) {
      try {
        setGuest(JSON.parse(stored));
        setSessionToken(token);
      } catch {
        sessionStorage.removeItem(STORAGE_GUEST);
        sessionStorage.removeItem(STORAGE_TOKEN);
        sessionStorage.removeItem(STORAGE_EXPIRES);
      }
    } else {
      sessionStorage.removeItem(STORAGE_GUEST);
      sessionStorage.removeItem(STORAGE_TOKEN);
      sessionStorage.removeItem(STORAGE_EXPIRES);
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      const data = await callEdge('login', { username, password });
      sessionStorage.setItem(STORAGE_GUEST, JSON.stringify(data.guest));
      sessionStorage.setItem(STORAGE_TOKEN, data.sessionToken);
      sessionStorage.setItem(STORAGE_EXPIRES, data.expiresAt);
      setGuest(data.guest);
      setSessionToken(data.sessionToken);
      return { error: null };
    } catch (e: any) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  }, []);

  const signUp = useCallback(async (username: string, password: string, displayName: string) => {
    try {
      const data = await callEdge('signup', { username, password, displayName });
      sessionStorage.setItem(STORAGE_GUEST, JSON.stringify(data.guest));
      sessionStorage.setItem(STORAGE_TOKEN, data.sessionToken);
      sessionStorage.setItem(STORAGE_EXPIRES, data.expiresAt);
      setGuest(data.guest);
      setSessionToken(data.sessionToken);
      return { error: null };
    } catch (e: any) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (sessionToken) {
      try { await callEdge('logout', { sessionToken }); } catch { /* ignore */ }
    }
    sessionStorage.removeItem(STORAGE_GUEST);
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_EXPIRES);
    setGuest(null);
    setSessionToken(null);
  }, [sessionToken]);

  const apiCall = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    if (!sessionToken) throw new Error('Not authenticated');
    try {
      return await callEdge(action, { sessionToken, ...payload });
    } catch (e: any) {
      if (String(e?.message || '').toLowerCase().includes('expired')) {
        sessionStorage.removeItem(STORAGE_GUEST);
        sessionStorage.removeItem(STORAGE_TOKEN);
        sessionStorage.removeItem(STORAGE_EXPIRES);
        setGuest(null);
        setSessionToken(null);
        toast.error('Session expired. Please sign in again.');
      }
      throw e;
    }
  }, [sessionToken]);

  return (
    <GuestAuthContext.Provider value={{ guest, loading, sessionToken, signIn, signUp, signOut, apiCall }}>
      {children}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  const ctx = useContext(GuestAuthContext);
  if (!ctx) throw new Error('useGuestAuth must be used within GuestAuthProvider');
  return ctx;
}
