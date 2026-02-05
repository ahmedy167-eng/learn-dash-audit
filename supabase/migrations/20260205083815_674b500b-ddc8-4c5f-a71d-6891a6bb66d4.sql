-- Drop the existing view
DROP VIEW IF EXISTS public.teacher_public_info;

-- Recreate as a security barrier view (protects against view optimization attacks)
CREATE VIEW public.teacher_public_info
WITH (security_barrier = true)
AS
SELECT user_id, full_name
FROM profiles;

-- Enable RLS on the view (views can have RLS in PostgreSQL 15+)
-- Since views inherit table RLS, we need a function-based approach
-- Instead, we'll create a security definer function for access

-- Create a function to get teacher info that requires authenticated access
CREATE OR REPLACE FUNCTION public.get_teacher_public_info()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM profiles p
  WHERE auth.uid() IS NOT NULL  -- Require authentication
$$;

-- Grant execute on function to authenticated users only
REVOKE ALL ON FUNCTION public.get_teacher_public_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_public_info() TO authenticated;

-- Revoke direct access to the view from anonymous users
REVOKE ALL ON public.teacher_public_info FROM anon;
REVOKE ALL ON public.teacher_public_info FROM public;
GRANT SELECT ON public.teacher_public_info TO authenticated;