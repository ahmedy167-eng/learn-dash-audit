-- Fix: Drop the security definer view and recreate with security invoker
DROP VIEW IF EXISTS public.teacher_public_info;

-- Recreate view with security_invoker (uses caller's permissions, not definer's)
CREATE VIEW public.teacher_public_info
WITH (security_invoker = on)
AS
SELECT user_id, full_name
FROM profiles;

-- Revoke access from anonymous and public users
REVOKE ALL ON public.teacher_public_info FROM anon;
REVOKE ALL ON public.teacher_public_info FROM public;

-- Grant access to authenticated users only
GRANT SELECT ON public.teacher_public_info TO authenticated;