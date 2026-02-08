

# Fix Connection Issues and Page Loading Delays

## Problem

The console logs show repeated `AuthRetryableFetchError: Failed to fetch` errors when the browser tries to refresh the authentication token. The current code has these issues:

1. **No connection error handling on initial load** -- When `getSession()` fails due to a network issue, the app sets `loading = false` with `user = null`. Every protected page then treats this as "user not logged in" and redirects to the login screen, even though the user may have a valid session stored locally.

2. **No retry logic for initial auth** -- The `initializeAuth` function in `useAuth` tries once and gives up. Unlike the login form (which has retry with backoff), the initial session check has no recovery mechanism.

3. **No distinction between "not logged in" and "network down"** -- The auth context only exposes `user`, `session`, and `loading`. Components like `DashboardLayout` and `Index` cannot tell whether the user is genuinely unauthenticated or if a network failure prevented the session check.

4. **Cascading delays** -- After auth resolves, `usePermissions` sequentially fetches role and then permissions before setting its own `loading = false`, adding visible delay before the sidebar and pages become interactive.

---

## Solution

### 1. Add connection error state and retry logic to `useAuth`

**File: `src/hooks/useAuth.tsx`**

- Add a `connectionError` boolean to the auth context
- Add a `retryConnection` function to the auth context
- In `initializeAuth`, retry `getSession()` up to 2 times with exponential backoff (1s, 2s)
- If all retries fail with a network error, set `connectionError = true` (while still setting `loading = false`)
- When `onAuthStateChange` fires with a valid session (e.g., when network recovers), automatically clear `connectionError`
- Expose `retryConnection` so the UI can offer a manual retry button

### 2. Update `DashboardLayout` to handle connection errors

**File: `src/components/layout/DashboardLayout.tsx`**

- Import `connectionError` and `retryConnection` from `useAuth`
- When `connectionError` is true and `user` is null, show a "Connection issue" screen with a retry button instead of redirecting to `/auth`
- This prevents the user from being kicked to the login page during transient network failures

### 3. Update `Index` page to handle connection errors

**File: `src/pages/Index.tsx`**

- Import `connectionError` and `retryConnection` from `useAuth`
- When `connectionError` is true, show a connection error banner at the top of the landing page with a retry button
- Do not redirect to dashboard while a connection error is active (the user data might come through when network recovers)

### 4. Optimize `usePermissions` to fetch in parallel

**File: `src/hooks/usePermissions.tsx`**

- Change `fetchPermissions` to fetch user role and permissions in parallel using `Promise.all` instead of sequentially
- This reduces the time between auth completing and the dashboard becoming interactive

---

## Technical Details

### `useAuth.tsx` Changes

```text
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  connectionError: boolean;           // NEW
  retryConnection: () => Promise<void>; // NEW
  signUp: ...;
  signIn: ...;
  signOut: ...;
}

// In AuthProvider:
const [connectionError, setConnectionError] = useState(false);

// initializeAuth with retry logic:
const initializeAuth = async () => {
  const MAX_RETRIES = 2;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!isMounted) return;
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
  if (isMounted && isNetworkError(lastError)) {
    setConnectionError(true);
  }
};

// In onAuthStateChange: clear connectionError when session arrives
supabase.auth.onAuthStateChange((_event, session) => {
  if (!isMounted) return;
  setSession(session);
  setUser(session?.user ?? null);
  if (session) setConnectionError(false);
});

// retryConnection function:
const retryConnection = async () => {
  setLoading(true);
  setConnectionError(false);
  // re-run initializeAuth
};
```

### `DashboardLayout.tsx` Changes

```text
const { user, loading, connectionError, retryConnection } = useAuth();

if (loading) { /* spinner */ }

if (connectionError && !user) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 p-6">
        <WifiOff icon />
        <h2>Connection Issue</h2>
        <p>Unable to reach the server. Please check your internet connection.</p>
        <Button onClick={retryConnection}>Retry Connection</Button>
      </div>
    </div>
  );
}

if (!user) { return <Navigate to="/auth" replace />; }
```

### `Index.tsx` Changes

```text
const { user, loading, connectionError, retryConnection } = useAuth();

// Don't auto-redirect during connection error
useEffect(() => {
  if (!loading && user && !connectionError) {
    navigate('/dashboard', { replace: true });
  }
}, [user, loading, connectionError, navigate]);

// Show connection error banner when applicable
```

### `usePermissions.tsx` Changes

```text
// Parallel fetch instead of sequential:
const [roleResult, permResult] = await Promise.all([
  supabase.from('user_roles').select('role').eq('user_id', uid).single(),
  supabase.from('user_permissions').select('feature, enabled').eq('user_id', uid),
]);
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Add `connectionError` state, retry logic (up to 2 retries with backoff), `retryConnection` function, auto-clear on session recovery |
| `src/components/layout/DashboardLayout.tsx` | Show connection error screen with retry button instead of redirecting to `/auth` |
| `src/pages/Index.tsx` | Show connection error banner, skip dashboard redirect during connection error |
| `src/hooks/usePermissions.tsx` | Fetch role and permissions in parallel with `Promise.all` |

