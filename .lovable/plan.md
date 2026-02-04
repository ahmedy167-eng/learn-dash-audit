
# Fix Student Cannot See Assigned Teacher

## Problem Identified

When a student opens the message dialog, they can only see "Administrator (General Inquiries)" instead of their assigned teacher.

### Root Cause

The student authentication system uses **sessionStorage** (not Supabase Auth), meaning students are **anonymous** from the database's perspective (`auth.uid()` returns null).

The `MessageAdminDialog` component queries:
1. `sections` table to get the teacher's `user_id`
2. `profiles` table to get the teacher's `full_name`

Both tables have Row Level Security (RLS) policies that require `auth.uid() = user_id`, which blocks anonymous access. As a result, both queries return empty data, and only the hardcoded "Administrator" option is shown.

### Current RLS Policies

| Table | Policy | Condition |
|-------|--------|-----------|
| `students` | Allow public read for student login | `true` (allows anonymous) |
| `sections` | Users can view their own sections | `auth.uid() = user_id` (blocks anonymous) |
| `profiles` | Users can view their own profile | `auth.uid() = user_id` (blocks anonymous) |

---

## Solution

Add RLS policies that allow **public read access** for limited data needed by students to fetch their teacher information.

### Database Changes

Create two new RLS policies:

**1. Allow students to read their assigned section:**
```sql
CREATE POLICY "Allow public read for student section lookup"
ON public.sections
FOR SELECT
USING (true);
```

**2. Allow students to read teacher profiles (limited):**
```sql
CREATE POLICY "Allow public read for teacher lookup"
ON public.profiles
FOR SELECT
USING (true);
```

### Security Consideration

The `profiles` table currently only stores:
- `user_id`
- `full_name`
- `created_at`

This is non-sensitive information suitable for public read access. If the profiles table contained sensitive data (email, phone, etc.), we would need a different approach (e.g., a view or edge function).

---

## Alternative Approaches Considered

| Approach | Pros | Cons |
|----------|------|------|
| **Add public read RLS policies** (chosen) | Simple, fast, follows existing pattern | Exposes sections/profiles data publicly |
| **Create a database function (SECURITY DEFINER)** | More secure, controlled access | More complex, additional code |
| **Use a Supabase Edge Function** | Full control, can filter response | Adds latency, more infrastructure |

The public read approach is chosen because:
- The `students` table already uses this pattern for login
- The data exposed (section info, teacher names) is not sensitive
- It's the simplest fix that matches existing architecture

---

## Summary of Changes

| Type | Change |
|------|--------|
| Database Migration | Add public SELECT policy to `sections` table |
| Database Migration | Add public SELECT policy to `profiles` table |

No code changes are needed - the `MessageAdminDialog` component already has the correct query logic, it just needs RLS to allow the queries.

---

## Expected Result

After this fix:
1. Student opens "Send Message" dialog
2. Query to `sections` succeeds, returning teacher's `user_id`
3. Query to `profiles` succeeds, returning teacher's `full_name`
4. Dropdown shows both "Administrator (General Inquiries)" AND "Teachers: [Teacher Name]"
