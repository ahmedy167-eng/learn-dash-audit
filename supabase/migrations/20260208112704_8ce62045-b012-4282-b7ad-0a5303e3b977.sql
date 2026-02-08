
-- teacher_public_info is a VIEW, not a table - RLS cannot be applied to views.
-- Security is enforced via SQL GRANT/REVOKE permissions instead.

-- Ensure anon has no access
REVOKE ALL ON public.teacher_public_info FROM anon;

-- Grant SELECT only to authenticated users
GRANT SELECT ON public.teacher_public_info TO authenticated;
