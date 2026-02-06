
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
    (NEW.id, 'staff_chat', true);

  RETURN NEW;
END;
$$;
