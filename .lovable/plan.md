
# Fix: Admin Cannot See New Users' Information

## The Problem
When a new user signs up, the admin cannot see their information (name, email) in the Admin panel. The user list shows only the admin's own profile or appears empty.

## Root Cause
The `profiles` table has Row Level Security (RLS) enabled, but the policies only allow users to view their own profile:

```sql
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);
```

There is **no RLS policy** allowing admins to view all profiles. When the Admin page queries the profiles table, it only returns the admin's own row.

---

## The Solution
Add an RLS policy to allow admins to view all profiles, similar to how the `user_roles` and `user_permissions` tables are configured.

---

## Technical Changes

### Database Migration

Add a new RLS policy to the `profiles` table:

```sql
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

This uses the existing `has_role()` security definer function that's already in place for the `user_roles` and `user_permissions` tables.

---

## Result After Fix

| Before | After |
|--------|-------|
| Admin sees only their own profile | Admin sees all user profiles |
| User count shows 1 | User count shows actual total |
| New signups invisible to admin | New users appear immediately |

---

## Testing Steps
1. Sign in as admin
2. Go to Admin panel
3. Verify all users are now visible with their names and emails
4. Sign up a new test user
5. Refresh Admin panel - new user should appear in the list
