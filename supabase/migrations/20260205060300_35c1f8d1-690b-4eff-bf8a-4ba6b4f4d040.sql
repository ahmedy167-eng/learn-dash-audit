-- Fix teacher_public_info view: Add RLS policy for authenticated access only
-- Views with security_invoker = true inherit the caller's permissions,
-- but we need to restrict access to authenticated users only

-- First, revoke anonymous access to the view
REVOKE SELECT ON teacher_public_info FROM anon;

-- The view already has security_invoker = true which means RLS from the underlying
-- profiles table will be enforced. The authenticated role grant remains.

-- Add a comment documenting the security model
COMMENT ON VIEW teacher_public_info IS 'Public view of teacher information. Access restricted to authenticated users only. Anonymous access revoked for security.';
