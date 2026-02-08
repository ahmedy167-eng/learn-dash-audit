

# Fix Login: Route Auth Through Backend Proxy

## Problem

All browser requests to the authentication endpoint fail with "Failed to fetch" -- they never reach the server. This happens across multiple browsers, ruling out browser-specific issues. The backend itself is healthy (database queries and server-side tests succeed). The root cause is a network-level block between the user's browser and the authentication API endpoint.

## Solution

Create a backend function that acts as a proxy for authentication operations. Instead of the browser making direct cross-origin requests to the auth API, requests go through the backend function (which is always reachable because it lives on the same infrastructure). The function then makes server-to-server calls to the auth service, which are not subject to browser network restrictions.

This is the exact same pattern already used successfully by the `student-auth` function.

## What Changes

### 1. New file: Backend function `supabase/functions/auth-proxy/index.ts`

A backend function that handles five operations:
- **sign-in** -- Takes email/password, authenticates server-side, returns session tokens
- **sign-up** -- Takes email/password/name, creates account server-side, returns session tokens
- **sign-out** -- Invalidates the current session server-side
- **reset-password** -- Sends password reset email server-side
- **get-session** -- Refreshes a session using the refresh token server-side

Each operation:
1. Receives the request from the browser
2. Creates a Supabase client with the standard (non-admin) key
3. Calls the auth API server-to-server (no CORS restrictions)
4. Returns the result with proper CORS headers

### 2. Modified: `supabase/config.toml`

Add the new function configuration with JWT verification disabled (since unauthenticated users need to call it for login/signup).

### 3. Modified: `src/hooks/useAuth.tsx`

Update `signIn`, `signUp`, and `initializeAuth` to call the backend function instead of the auth API directly:
- `signIn` calls the proxy with `action: 'sign-in'`, then uses the returned tokens to establish a local session via `supabase.auth.setSession()`
- `signUp` calls the proxy with `action: 'sign-up'`
- `initializeAuth` first tries the direct `getSession()` call, and if it fails with a network error, falls back to the proxy with `action: 'get-session'` using any stored refresh token

### 4. Modified: `src/pages/Auth.tsx`

Update the password reset handler to call the proxy with `action: 'reset-password'` instead of calling `supabase.auth.resetPasswordForEmail()` directly.

### 5. No changes needed: `src/pages/AdminLogin.tsx`

AdminLogin already uses `useAuth().signIn`, so it automatically benefits from the proxy.

---

## Technical Details

### Edge Function: `auth-proxy`

```text
POST /auth-proxy
Content-Type: application/json

Request body:
{
  "action": "sign-in" | "sign-up" | "sign-out" | "reset-password" | "get-session",
  "email": "...",           // for sign-in, sign-up, reset-password
  "password": "...",        // for sign-in, sign-up
  "fullName": "...",        // for sign-up
  "refreshToken": "...",    // for get-session
  "accessToken": "...",     // for sign-out
  "redirectUrl": "..."      // for sign-up, reset-password
}

Response body (sign-in / sign-up / get-session):
{
  "session": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600,
    "token_type": "bearer",
    "user": { ... }
  }
}
```

The function uses CORS headers matching the existing `student-auth` pattern. It creates a standard Supabase client (not service role) so all normal auth rules apply.

### useAuth.tsx Changes

```text
// signIn now calls the proxy:
const signIn = async (email, password) => {
  const { data, error } = await supabase.functions.invoke('auth-proxy', {
    body: { action: 'sign-in', email, password }
  });

  if (error || data?.error) return { error: ... };

  // Establish local session with the returned tokens
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  return { error: null };
};

// signUp follows the same pattern with action: 'sign-up'
// initializeAuth adds a proxy fallback when direct getSession fails
```

### Auth.tsx Changes

```text
// Password reset now calls the proxy:
const handleForgotPassword = async () => {
  const { data, error } = await supabase.functions.invoke('auth-proxy', {
    body: {
      action: 'reset-password',
      email: resetEmail,
      redirectUrl: `${window.location.origin}/auth?reset=true`
    }
  });
  // Handle response...
};
```

---

## Request Flow (Before vs After)

**Before (broken):**
```text
Browser --> bhspeoledfydylvonobv.supabase.co/auth/v1/token
         X  (Failed to fetch -- request never arrives)
```

**After (fixed):**
```text
Browser --> bhspeoledfydylvonobv.supabase.co/functions/v1/auth-proxy
         --> (server-to-server) supabase.auth.signInWithPassword()
         <-- session tokens returned to browser
         --> supabase.auth.setSession() establishes local session
```

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/auth-proxy/index.ts` | New backend function handling sign-in, sign-up, sign-out, reset-password, and get-session via server-to-server calls |
| `supabase/config.toml` | Add `[functions.auth-proxy]` with `verify_jwt = false` |
| `src/hooks/useAuth.tsx` | Route `signIn`, `signUp`, and session refresh through the proxy function; use `setSession()` to establish local sessions |
| `src/pages/Auth.tsx` | Route password reset through the proxy function |

