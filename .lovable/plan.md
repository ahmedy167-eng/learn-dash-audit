

# Fix: Connection Error Banner on Landing Page

## Problem

The landing page shows a persistent "Unable to connect to the server" error banner when the authentication initialization fails. This happens because:

1. The Supabase SDK's `getSession()` throws an `AbortError` (from React StrictMode or internal SDK abort signals), which the code doesn't recognize as a benign cancellation
2. The fallback proxy call then fails with "Failed to fetch" (genuine network issue or browser restrictions)
3. The `connectionError` state gets set to `true` in the global AuthProvider
4. The landing page displays a scary banner even though it's a public page that works perfectly fine without server connectivity

## Solution

Three targeted fixes to make the app more resilient:

### 1. Handle AbortError properly in useAuth

Add `AbortError` detection to the `isNetworkError` helper so it's recognized. More importantly, in `initializeAuth`, if the error from `getSession` is an `AbortError`, bail out early instead of falling through to the proxy -- the operation was cancelled, not failed.

### 2. Clear stale sessions on proxy failure

When the proxy fallback also fails, clear the stored session from `localStorage`. This prevents the same stale token from triggering repeated proxy calls on every page load. On the next visit, since there's no stored session, the code will correctly treat the user as "logged out" instead of "connection error."

### 3. Remove the connection error banner from the landing page

The Index page is a public marketing/landing page. It doesn't need server connectivity to function. Remove the `connectionError` banner from this page entirely. Connection issues are already handled inline on the Auth page (with retry buttons when sign-in fails) and in the DashboardLayout (for protected routes).

## Technical Details

### File: `src/hooks/useAuth.tsx`

**Change 1 -- Detect AbortError:**
Update the `isNetworkError` function to also match `AbortError`:

```typescript
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  // ... existing checks
};
```

**Change 2 -- Bail on AbortError in initializeAuth:**
In the `initializeAuth` function, after catching the `getSession` error, check if it's an `AbortError`. If so, return early rather than falling through to the proxy. An aborted request means the component was unmounted or the SDK cancelled the request -- it's not a real failure.

```typescript
} catch (directErr) {
  // AbortError = cancelled, not a real failure
  if (directErr instanceof DOMException && directErr.name === 'AbortError') {
    return;
  }
  console.warn('[useAuth] Direct getSession failed, trying proxy fallback...', directErr);
}
```

**Change 3 -- Clear stale session on proxy failure:**
In the proxy fallback's `catch` block, clear the stored session from `localStorage` so it doesn't trigger the same failing proxy call on future loads:

```typescript
} catch (proxyErr) {
  console.error('[useAuth] Proxy fallback also failed:', proxyErr);
  // Clear stale stored session to avoid repeated failures
  localStorage.removeItem('sb-bhspeoledfydylvonobv-auth-token');
  if (isMountedRef.current) {
    setConnectionError(true);
  }
}
```

### File: `src/pages/Index.tsx`

Remove the `connectionError` and `retryConnection` destructuring from `useAuth()`, remove the `WifiOff` import, and delete the entire connection error banner block (lines 34-47). The landing page will simply show the normal content regardless of server connectivity status.

## What stays the same

- The DashboardLayout still shows the connection error screen for protected routes (correct behavior -- those pages genuinely need server access)
- The Auth page still handles connection failures inline with retry buttons when sign-in/sign-up fails
- The proxy fallback mechanism still works for users on restricted networks where direct Supabase access is blocked
- All other auth flows (sign-in, sign-up, sign-out, password reset) remain unchanged

