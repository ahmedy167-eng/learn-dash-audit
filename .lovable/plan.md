

# Fix: Connection and Sign-In Issues

## Problem

Every authentication request from the user's browser fails with "Failed to fetch". The network logs show 10+ consecutive failed requests to the backend auth-proxy, all returning the same error. The edge function itself works perfectly when called server-side (returns 200 with a valid session), confirming this is a **browser-to-backend network connectivity issue** -- likely a school or corporate firewall blocking the backend domain.

The current code only uses one method to sign in (the auth-proxy edge function). If that path is blocked, there's no fallback, and the user is stuck.

## Solution

Implement a **dual-path authentication strategy with timeouts** so the app tries multiple routes to reach the backend, and fails fast instead of hanging.

### 1. Add timeouts to prevent indefinite hanging

Currently, `fetch()` calls have no timeout. On blocked networks, they can hang for 30-60 seconds before the browser gives up. Adding an `AbortController` with a 10-second timeout will make failures fast and improve the retry UX.

### 2. Dual-path sign-in: try direct SDK first, then proxy

The current `signIn` method only uses the auth-proxy. Change it to:
1. First try the direct SDK (`supabase.auth.signInWithPassword`) -- this is faster and uses a different API endpoint (`/auth/v1/token`)
2. If that fails with a network error, fall back to the auth-proxy (`/functions/v1/auth-proxy`)
3. If both fail, return the error

This helps because some networks selectively block certain API paths or subdomains. The two endpoints use different URL patterns, so one may succeed when the other is blocked.

### 3. Dual-path sign-up: same approach

Apply the same dual-path strategy to `signUp`:
1. First try `supabase.auth.signUp` directly
2. If network error, fall back to the auth-proxy

### 4. Faster initialization with timeout

Add timeout to the `initializeAuth` proxy fallback call so it doesn't hang on blocked networks. If both the direct SDK and proxy fail, the user lands on a clean "logged out" state instead of a spinner.

## Technical Details

### File: `src/hooks/useAuth.tsx`

**Add a `fetchWithTimeout` wrapper:**
```typescript
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
```

**Update `proxyFetch` to use the timeout wrapper** instead of raw `fetch`.

**Update `signIn` to try direct SDK first:**
```typescript
const signIn = async (email: string, password: string) => {
  // Attempt 1: Direct SDK
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, password 
    });
    if (error && !isNetworkError(error)) {
      return { error };
    }
    if (!error && data.session) {
      return { error: null };
    }
    // If network error, fall through to proxy
  } catch (directErr) {
    if (!isNetworkError(directErr)) {
      return { error: directErr instanceof Error ? directErr : new Error('...') };
    }
  }

  // Attempt 2: Auth proxy fallback
  try {
    const { data, error } = await proxyFetch({ 
      action: 'sign-in', email, password 
    });
    if (error) return { error };
    
    const { error: setErr } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (setErr) return { error: setErr };
    return { error: null };
  } catch (err) {
    if (isNetworkError(err)) {
      return { error: new Error('Network error...') };
    }
    return { error: err instanceof Error ? err : new Error('...') };
  }
};
```

**Update `signUp` with the same dual-path approach:**
- Try `supabase.auth.signUp()` directly first
- If network error, fall back to the auth-proxy

**Update `initializeAuth`:**
- Add timeout to the proxy fallback `proxyFetch` call so initialization doesn't hang for 30+ seconds on blocked networks

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useAuth.tsx` | Add `fetchWithTimeout`, dual-path `signIn`/`signUp`, timeout on proxy calls |

No other files need changes. The Auth page, AdminLogin page, and DashboardLayout already handle errors and retries correctly -- they just need the underlying auth methods to respond faster and try more paths.
