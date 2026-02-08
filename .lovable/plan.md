

# Fix Connection Issues and Delayed Sign-In

## Problem Analysis

There are two related issues visible in the screenshots and code:

1. **Delayed/Racy Sign-In** -- The `useAuth` hook has a race condition between `onAuthStateChange` and `getSession`. Both independently set `loading = false`, but there's no coordination. The `onAuthStateChange` listener can fire and set `loading = false` before all required data is ready, or `getSession` can complete first while the listener hasn't fired yet. This creates timing issues where downstream hooks (permissions, staff chat) start fetching data before the user is fully resolved.

2. **Staff Chat Shows "0 staff" After Login** -- The `useStaffChat` hook's initialization depends on `fetchStaffMembers` and `fetchCurrentUserRole` callbacks, which are recreated every time `user` changes. Due to the auth race condition, the `user` object may briefly be `null` before being set, causing the init effect to fire with no user, load empty data, then miss the re-trigger when user finally appears. Additionally, the realtime subscription effect depends on `fetchConversations` which depends on `staffMembers`, causing unnecessary teardown/rebuild cycles.

## Solution

### 1. Refactor `useAuth` -- Separate Initial Load from Ongoing Changes

Apply the proven pattern: use `getSession()` for the initial load (controls `loading`), and `onAuthStateChange` for ongoing updates (does NOT control `loading`). Add a mounted flag to prevent state updates after unmount.

**File: `src/hooks/useAuth.tsx`**

- Set up `onAuthStateChange` listener first (for ongoing changes) -- it updates `user`/`session` but does NOT set `loading`
- Then call `getSession()` for the initial load -- this sets `user`/`session` and ONLY after completion sets `loading = false`
- Add `isMounted` flag to prevent stale state updates
- Wrap the initial load in a try/finally to guarantee `loading` becomes `false`

### 2. Stabilize `useStaffChat` Hook Dependencies

**File: `src/hooks/useStaffChat.tsx`**

- Use a `useRef` to track the user ID instead of depending on the `user` object directly in callbacks, reducing unnecessary re-creations
- Change the init effect to depend on `user?.id` instead of callback references, ensuring it fires exactly once when the user becomes available
- Stabilize the realtime subscription by removing `fetchConversations` from the dependency array and using a ref pattern instead
- Add an `isMounted` guard to prevent state updates after unmount

### 3. Stabilize `usePermissions` Hook

**File: `src/hooks/usePermissions.tsx`**

- Wrap `fetchPermissions` in `useCallback` and depend on `user?.id` rather than the full `user` object
- Ensure permissions don't refetch unnecessarily on every auth state change

## Technical Details

### `useAuth.tsx` Changes

```text
useEffect(() => {
  let isMounted = true;

  // Listener for ONGOING auth changes (does NOT control loading)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
    }
  );

  // INITIAL load (controls loading)
  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  initializeAuth();

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

### `useStaffChat.tsx` Changes

- Replace the dependency on callback functions in the init effect with a direct `user?.id` dependency
- Use a ref for `staffMembers` so `fetchConversations` doesn't need it in its dependency array
- Use a ref for `selectedContact` in the realtime effect so the subscription doesn't tear down when selecting a contact
- Stabilize the realtime effect dependencies to `[user?.id]` only

### `usePermissions.tsx` Changes

- Use `useCallback` for `fetchPermissions` with `user?.id` as the dependency
- Change the effect to depend on `user?.id` instead of the full `user` object

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Separate initial load from ongoing auth changes; add mounted guard |
| `src/hooks/useStaffChat.tsx` | Stabilize effect dependencies; use refs for mutable state; depend on `user?.id` |
| `src/hooks/usePermissions.tsx` | Stabilize `fetchPermissions` callback; depend on `user?.id` |

