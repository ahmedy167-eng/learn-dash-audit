
# Plan: Fix Login Network Error Handling

## Problem Analysis

The login is failing with a `TypeError: Failed to fetch` error. This is a network-level issue where requests aren't reaching the backend at all.

**Key Observations:**
- Network requests to the authentication server are failing before reaching it
- The error is already being caught, but users are seeing a generic network error
- There's no retry mechanism for transient failures
- The current error detection relies on fragile string matching

## Proposed Solution

### 1. Improve Error Handling in useAuth Hook
Add proper error type detection and wrap the Supabase calls with better error handling that returns meaningful error objects.

### 2. Add Retry Logic with Exponential Backoff
Implement automatic retry (1-2 attempts) for network failures to handle transient issues gracefully.

### 3. Improve User Feedback
Provide clearer error messages and add a "Retry" option when network errors occur.

---

## Technical Implementation

### File Changes

**1. `src/hooks/useAuth.tsx`**
- Wrap Supabase auth calls in try-catch blocks
- Return proper error objects instead of raw Supabase errors
- Add network error detection helper

**2. `src/pages/Auth.tsx`**
- Add a retry mechanism with state tracking
- Show a "Retry" button for network errors
- Improve error message clarity

**3. `src/pages/AdminLogin.tsx`**
- Apply the same retry improvements for consistency

---

## Code Changes Summary

```text
┌─────────────────────────────────────────────────────────────┐
│  src/hooks/useAuth.tsx                                      │
├─────────────────────────────────────────────────────────────┤
│  • Add try-catch wrapping for signIn and signUp             │
│  • Create isNetworkError helper function                    │
│  • Return standardized error objects                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  src/pages/Auth.tsx                                         │
├─────────────────────────────────────────────────────────────┤
│  • Add retry state and counter                              │
│  • Implement auto-retry (up to 2 attempts)                  │
│  • Show "Retry" button after network failures               │
│  • Add retry functionality that clears on success           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  src/pages/AdminLogin.tsx                                   │
├─────────────────────────────────────────────────────────────┤
│  • Apply same retry improvements as Auth.tsx                │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Network Error Detection Helper
```typescript
const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    return true;
  }
  return false;
};
```

### Retry Logic Pattern
```typescript
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 2;

const handleLoginWithRetry = async (attempt = 0) => {
  try {
    const { error } = await signIn(email, password);
    if (error && isNetworkError(error) && attempt < MAX_RETRIES) {
      // Wait briefly then retry
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      return handleLoginWithRetry(attempt + 1);
    }
    // Handle result...
  } catch (err) {
    if (isNetworkError(err) && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      return handleLoginWithRetry(attempt + 1);
    }
    // Show network error with retry button
  }
};
```

## Expected Outcome

After implementing these changes:
1. Transient network failures will be automatically retried (up to 2 times)
2. Users will see clearer error messages
3. A "Retry" button will appear after persistent network failures
4. The auth experience will be more resilient to temporary connectivity issues
