-- Allow anyone to query students table for login verification
-- This enables unauthenticated students to verify their credentials (name + student_id)
CREATE POLICY "Allow public read for student login"
  ON public.students
  FOR SELECT
  USING (true);