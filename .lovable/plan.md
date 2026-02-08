

# Fix Connectivity Issue: Add Missing API Key Headers

## Problem

All direct `fetch` calls to backend functions are missing the required `apikey` header. The backend API gateway requires this header to route requests to the correct project. Without it, the gateway rejects the request and -- because its error response lacks CORS headers -- the browser reports "Failed to fetch" rather than showing the actual error.

The backend function itself is working correctly (verified via server-side testing). The issue is entirely on the browser side.

## Solution

Add the `apikey` header (using the already-configured publishable key) to every `fetch` call that targets a backend function. This is a minimal change across three files.

## Changes

### 1. `src/hooks/useAuth.tsx` -- Fix the `proxyFetch` helper

Add the `apikey` header to the centralized `proxyFetch` function. This covers sign-in, sign-up, sign-out, and session refresh since they all go through this helper.

```
Before:
headers: { 'Content-Type': 'application/json' },

After:
headers: {
  'Content-Type': 'application/json',
  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
},
```

### 2. `src/pages/Auth.tsx` -- Fix the forgot-password fetch

The `handleForgotPassword` function makes its own direct `fetch` call (not through `proxyFetch`). Add the same `apikey` header there.

```
Before:
headers: { 'Content-Type': 'application/json' },

After:
headers: {
  'Content-Type': 'application/json',
  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
},
```

### 3. `src/hooks/useStudentApi.tsx` -- Fix student API fetch calls

All student API fetch calls (login, logout, getData, performAction, getTeacher, getRecipients) are also missing the `apikey` header. While the user reported the issue on the staff login page, these calls have the same vulnerability and should be fixed for consistency.

Each `headers` object will be updated from:
```
headers: { 'Content-Type': 'application/json' },
```
to:
```
headers: {
  'Content-Type': 'application/json',
  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
},
```

This applies to approximately 6 fetch calls across the file.

## Why This Works

- The backend API gateway uses the `apikey` header to identify and route requests to the correct project
- Without it, the gateway rejects the request before it reaches the function
- The gateway's rejection does not include CORS headers, so the browser sees a cross-origin block and reports "Failed to fetch"
- Adding the key lets the request pass through the gateway to the function, which already has proper CORS headers configured

## Technical Details

- The key used (`VITE_SUPABASE_PUBLISHABLE_KEY`) is the public anon key -- it is safe to include in browser requests (this is its intended purpose)
- No changes are needed to the backend functions themselves
- No changes to CORS configuration
- The existing retry logic and error handling remain intact and will work correctly once requests can reach the function

