## Goal
On refresh (and after logout), signed-out staff users should land on `/admin-login` instead of being routed to `/admin` or `/dashboard`. Currently, `DashboardLayout` redirects unauthenticated users to `/auth`, and the root path doesn't force the login page.

## Changes

1. **`src/components/layout/DashboardLayout.tsx`**
   - Change the unauthenticated redirect from `<Navigate to="/auth" replace />` to `<Navigate to="/admin-login" replace />`. This handles refreshes on any protected staff route (`/admin`, `/dashboard`, `/students`, etc.) when the session is gone.

2. **`src/hooks/useAuth.tsx` — `signOut`**
   - After `supabase.auth.signOut()`, perform a hard redirect to `/admin-login` (`window.location.href = '/admin-login'`) so the user is always taken to the login page, regardless of which route they were on.

3. **`src/pages/Index.tsx`**
   - When `loading` is false and there is no `user`, redirect to `/admin-login` instead of showing the marketing landing (optional — only if the user wants `/` to also force login). Keeping current marketing page is also fine; flagged below.

## Technical notes
- `DashboardLayout` is the single guard used by all staff pages, so the one-line redirect change covers refresh on every protected route.
- `signOut` currently relies on React Router re-render to redirect; a `window.location.href` ensures a clean state (clears in-memory caches, query client, etc.).
- No DB or edge function changes needed.

## Open question
- Should the public landing page (`/`) also auto-redirect signed-out users to `/admin-login`, or keep the current marketing page with Sign In buttons? Default in this plan: **keep the marketing page** and only change protected-route behavior + logout.