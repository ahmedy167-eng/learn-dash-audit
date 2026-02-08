
# Fix "Failed to send a request to the Edge Function" Login Error

## Problem

When signing in, the app calls the auth-proxy backend function using `supabase.functions.invoke()`. This method wraps the request and, when it fails, returns the error message **"Failed to send a request to the Edge Function"** instead of the standard "Failed to fetch". 

The `isNetworkError` helper only checks for "Failed to fetch", so:
- The automatic retry logic never triggers
- The error is not recognized as a connection issue
- The raw technical error message is shown to the user

## Solution

Two changes to make authentication more resilient:

### 1. Switch from `supabase.functions.invoke` to direct `fetch` calls

The student authentication system (`useStudentApi.tsx`) already uses direct `fetch` calls to the edge function URL and works reliably. We will apply the same pattern to the staff auth proxy calls. This:
- Eliminates the Supabase SDK as a middleman
- Gives us direct control over error handling
- Matches the proven pattern already in use

### 2. Expand network error detection

Update `isNetworkError` to also catch "Failed to send a request" messages, so even if `supabase.functions.invoke` is used elsewhere, the retry logic still works.

---

## Files Modified

### `src/hooks/useAuth.tsx`

**Change 1 - `isNetworkError` function (lines 6-14):**
Add detection for "Failed to send a request" to cover the Supabase SDK error message.

```text
Before:
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    return true;
  }

After:
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    return true;
  }
  if (error instanceof Error && error.message.includes('Failed to send a request')) {
    return true;
  }
```

**Change 2 - Replace `supabase.functions.invoke` with direct `fetch`:**

Create a helper constant for the auth proxy URL:
```text
const AUTH_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-proxy`;
```

Update `signIn` to use direct `fetch`:
```text
const response = await fetch(AUTH_PROXY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'sign-in', email, password }),
});
const data = await response.json();
```

Update `signUp` to use direct `fetch` (same pattern).

Update `signOut` to use direct `fetch` (same pattern).

Update `initializeAuth` proxy fallback to use direct `fetch` (same pattern).

### `src/pages/Auth.tsx`

**Change - `handleForgotPassword` function (lines 161-167):**

Replace `supabase.functions.invoke` with direct `fetch`:
```text
const response = await fetch(AUTH_PROXY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'reset-password',
    email: resetEmail,
    redirectUrl: `${window.location.origin}/auth?reset=true`,
  }),
});
const data = await response.json();
```

---

## Technical Details

The key insight is that the student auth system (`useStudentApi.tsx`) works with this exact pattern:

```text
const STUDENT_AUTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-auth`;

const response = await fetch(`${STUDENT_AUTH_URL}/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, studentId }),
});
```

This bypasses the Supabase JS SDK entirely and talks directly to the edge function. We are applying the same approach for staff auth.

The direct `fetch` approach will throw a standard `TypeError: Failed to fetch` on network failure, which is already handled by `isNetworkError`. Combined with the expanded error detection, the retry mechanism will work correctly for all failure modes.

### Request flow after fix

```text
Browser --fetch--> bhspeoledfydylvonobv.supabase.co/functions/v1/auth-proxy
                   (server-to-server) --> supabase.auth.signInWithPassword()
                   <-- JSON with session tokens
Browser --> supabase.auth.setSession() to establish local session
```

No changes are needed to the edge function itself -- it is correctly deployed and responding (verified by server-side test).
