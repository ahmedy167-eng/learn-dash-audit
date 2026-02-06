

# Fix Staff Chat Visibility for All Staff Members

## Problem

The Staff Chat link only appears in the admin's sidebar because:
- The `hasPermission('staff_chat')` check automatically returns `true` for admins
- Teachers like Steve have **no `staff_chat` row** in the `user_permissions` table, so the check returns `false` and the sidebar link is hidden
- The database trigger that creates default permissions for new users does **not** include `staff_chat`

## Solution

Two changes are needed:

### 1. Database Migration -- Add `staff_chat` permission for existing users and update the trigger

- Insert `staff_chat = true` for all existing users who don't have it yet
- Update the `handle_new_user_role()` trigger function to include `staff_chat` in the default permissions for future users

### 2. No code changes needed

The sidebar, permissions dialog, and StaffChat page already handle `staff_chat` correctly. Once the permission rows exist in the database, everything will work -- teachers will see the Staff Chat icon, the same UI as admin, and be able to send/receive messages.

---

## Technical Details

### Database Migration SQL

```text
-- 1. Add staff_chat permission for all existing users who don't have it
INSERT INTO public.user_permissions (user_id, feature, enabled)
SELECT ur.user_id, 'staff_chat', true
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_permissions up
  WHERE up.user_id = ur.user_id AND up.feature = 'staff_chat'
);

-- 2. Update the trigger to include staff_chat for future new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user boolean;
  user_role app_role;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) INTO is_first_user;

  IF is_first_user THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  INSERT INTO public.user_permissions (user_id, feature, enabled)
  VALUES
    (NEW.id, 'students', true),
    (NEW.id, 'sections', true),
    (NEW.id, 'register', true),
    (NEW.id, 'virtual_audit', true),
    (NEW.id, 'schedule', true),
    (NEW.id, 'lesson_plan', true),
    (NEW.id, 'tasks', true),
    (NEW.id, 'off_days', true),
    (NEW.id, 'staff_chat', true);   -- Added

  RETURN NEW;
END;
$$;
```

### What happens after this fix

- Steve, ahmed ali, Waleed, and the admin will all have `staff_chat = true` in their permissions
- The sidebar will show the Staff Chat icon with unread badge for all staff
- All staff get the same chat UI -- the two-panel layout with contact list, search, and message thread
- The admin can still toggle Staff Chat off for individual users via the Permissions dialog
- Any new users who sign up will automatically get `staff_chat = true`

### Files Changed

| Item | Change |
|------|--------|
| Database migration | Insert `staff_chat` permissions for existing users + update trigger |
| No code files | The existing sidebar, hook, and page code already support `staff_chat` correctly |

