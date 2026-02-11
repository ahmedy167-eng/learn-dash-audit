
-- Add deny-all RLS policies to student_content_updates
-- This table is accessed only via edge functions using service role key

CREATE POLICY "Deny all select on student_content_updates"
ON public.student_content_updates
FOR SELECT
USING (false);

CREATE POLICY "Deny all insert on student_content_updates"
ON public.student_content_updates
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Deny all update on student_content_updates"
ON public.student_content_updates
FOR UPDATE
USING (false);

CREATE POLICY "Deny all delete on student_content_updates"
ON public.student_content_updates
FOR DELETE
USING (false);
