
# Fix: Student Login "Internal Server Error"

## Problem Identified

The student login is failing with an "Internal server error" because the rate limiting implementation uses **Deno KV** (`Deno.openKv()`), which is **not supported** in the Supabase Edge Functions runtime.

Error from logs:
```
TypeError: Deno.openKv is not a function
```

## Solution

Replace the Deno KV-based rate limiting with a **database-backed rate limiting** approach using the existing Supabase connection. This will store rate limit data in a new database table instead of Deno KV.

## Implementation Steps

### Step 1: Create Rate Limiting Database Table

Create a new table `login_rate_limits` to track login attempts:

```sql
CREATE TABLE public.login_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ip text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for fast lookups by IP
CREATE INDEX idx_login_rate_limits_ip ON public.login_rate_limits(client_ip);

-- Create index for cleanup of old entries
CREATE INDEX idx_login_rate_limits_window ON public.login_rate_limits(window_start);

-- Enable RLS but allow service role full access
ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access this table
-- (No policies needed since service role bypasses RLS)
```

### Step 2: Update Edge Function

Modify `supabase/functions/student-auth/index.ts`:

1. **Remove Deno KV initialization** (line 244-245)
2. **Replace `checkRateLimit` function** to use database instead of Deno KV
3. **Add cleanup of expired rate limit entries**

Key changes to the rate limiting logic:

```typescript
// Database-backed rate limiting function
async function checkRateLimit(
  supabaseAdmin: SupabaseClient, 
  clientIP: string
): Promise<{ allowed: boolean; remainingAttempts?: number; retryAfterSeconds?: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  // Check for existing rate limit entry within window
  const { data: existing } = await supabaseAdmin
    .from('login_rate_limits')
    .select('id, attempts, window_start')
    .eq('client_ip', clientIP)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    // Check if max attempts reached
    if (existing.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      const windowEnd = new Date(new Date(existing.window_start).getTime() + RATE_LIMIT_WINDOW_MS);
      const retryAfterSeconds = Math.ceil((windowEnd.getTime() - now.getTime()) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }

    // Increment attempts
    await supabaseAdmin
      .from('login_rate_limits')
      .update({ attempts: existing.attempts + 1 })
      .eq('id', existing.id);

    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - existing.attempts - 1 };
  }

  // Create new rate limit entry
  await supabaseAdmin
    .from('login_rate_limits')
    .insert({ client_ip: clientIP, attempts: 1, window_start: now.toISOString() });

  return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1 };
}
```

3. **Update the login handler** to pass `supabaseAdmin` instead of `kv` to the rate limit function

4. **Add periodic cleanup** of old rate limit entries (optional, can be done via a cron job or during each login check)

### Step 3: Deploy and Test

After implementing the changes:
1. Edge function will be automatically deployed
2. Test student login to verify it works
3. Verify rate limiting works by making multiple failed login attempts

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/student-auth/index.ts` | Replace Deno KV rate limiting with database-backed approach |
| New migration | Create `login_rate_limits` table |

## Benefits of Database-Backed Approach

- Works reliably in Supabase Edge Functions runtime
- Persists across function restarts
- Can be monitored/managed via database queries
- Follows the same security model as other tables
