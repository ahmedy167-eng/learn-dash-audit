-- Security Fix Migration
-- 1. Fix user_sessions RLS policy (too broad)
-- 2. Add has_permission function for server-side permission validation
-- 3. Update RLS policies on feature-restricted tables
-- 4. Make ca-project-pdfs bucket private

-- ============================================
-- 1. FIX: user_sessions RLS policy too broad
-- ============================================
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;

-- More restrictive policy: only allow updates for the user's own sessions
CREATE POLICY "Users can update their own sessions" 
ON user_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- ============================================
-- 2. Create has_permission function for server-side validation
-- ============================================
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = _user_id 
      AND feature = _feature 
      AND enabled = true
  ) OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- ============================================
-- 3. Update RLS policies for feature-restricted tables
-- ============================================

-- STUDENTS table: requires 'students' permission
DROP POLICY IF EXISTS "Users can view their own students" ON students;
DROP POLICY IF EXISTS "Users can insert their own students" ON students;
DROP POLICY IF EXISTS "Users can update their own students" ON students;
DROP POLICY IF EXISTS "Users can delete their own students" ON students;

CREATE POLICY "Users can view their own students" 
ON students FOR SELECT
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'students')
);

CREATE POLICY "Users can insert their own students" 
ON students FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND has_permission(auth.uid(), 'students')
);

CREATE POLICY "Users can update their own students" 
ON students FOR UPDATE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'students')
);

CREATE POLICY "Users can delete their own students" 
ON students FOR DELETE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'students')
);

-- SECTIONS table: requires 'sections' permission
DROP POLICY IF EXISTS "Users can view their own sections" ON sections;
DROP POLICY IF EXISTS "Users can insert their own sections" ON sections;
DROP POLICY IF EXISTS "Users can update their own sections" ON sections;
DROP POLICY IF EXISTS "Users can delete their own sections" ON sections;

CREATE POLICY "Users can view their own sections" 
ON sections FOR SELECT
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'sections')
);

CREATE POLICY "Users can insert their own sections" 
ON sections FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND has_permission(auth.uid(), 'sections')
);

CREATE POLICY "Users can update their own sections" 
ON sections FOR UPDATE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'sections')
);

CREATE POLICY "Users can delete their own sections" 
ON sections FOR DELETE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'sections')
);

-- VIRTUAL_AUDITS table: requires 'virtual_audit' permission
DROP POLICY IF EXISTS "Users can view their own audits" ON virtual_audits;
DROP POLICY IF EXISTS "Users can insert their own audits" ON virtual_audits;
DROP POLICY IF EXISTS "Users can update their own audits" ON virtual_audits;
DROP POLICY IF EXISTS "Users can delete their own audits" ON virtual_audits;

CREATE POLICY "Users can view their own audits" 
ON virtual_audits FOR SELECT
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'virtual_audit')
);

CREATE POLICY "Users can insert their own audits" 
ON virtual_audits FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND has_permission(auth.uid(), 'virtual_audit')
);

CREATE POLICY "Users can update their own audits" 
ON virtual_audits FOR UPDATE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'virtual_audit')
);

CREATE POLICY "Users can delete their own audits" 
ON virtual_audits FOR DELETE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'virtual_audit')
);

-- SCHEDULES table: requires 'schedule' permission
DROP POLICY IF EXISTS "Users can view their own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can insert their own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can update their own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can delete their own schedules" ON schedules;

CREATE POLICY "Users can view their own schedules" 
ON schedules FOR SELECT
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'schedule')
);

CREATE POLICY "Users can insert their own schedules" 
ON schedules FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND has_permission(auth.uid(), 'schedule')
);

CREATE POLICY "Users can update their own schedules" 
ON schedules FOR UPDATE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'schedule')
);

CREATE POLICY "Users can delete their own schedules" 
ON schedules FOR DELETE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'schedule')
);

-- LESSON_PLANS table: requires 'lesson_plan' permission
DROP POLICY IF EXISTS "Users can view their own lesson plans" ON lesson_plans;
DROP POLICY IF EXISTS "Users can insert their own lesson plans" ON lesson_plans;
DROP POLICY IF EXISTS "Users can update their own lesson plans" ON lesson_plans;
DROP POLICY IF EXISTS "Users can delete their own lesson plans" ON lesson_plans;

CREATE POLICY "Users can view their own lesson plans" 
ON lesson_plans FOR SELECT
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'lesson_plan')
);

CREATE POLICY "Users can insert their own lesson plans" 
ON lesson_plans FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND has_permission(auth.uid(), 'lesson_plan')
);

CREATE POLICY "Users can update their own lesson plans" 
ON lesson_plans FOR UPDATE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'lesson_plan')
);

CREATE POLICY "Users can delete their own lesson plans" 
ON lesson_plans FOR DELETE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'lesson_plan')
);

-- TASKS table: requires 'tasks' permission
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

CREATE POLICY "Users can view their own tasks" 
ON tasks FOR SELECT
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'tasks')
);

CREATE POLICY "Users can insert their own tasks" 
ON tasks FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND has_permission(auth.uid(), 'tasks')
);

CREATE POLICY "Users can update their own tasks" 
ON tasks FOR UPDATE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'tasks')
);

CREATE POLICY "Users can delete their own tasks" 
ON tasks FOR DELETE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'tasks')
);

-- OFF_DAYS table: requires 'off_days' permission
DROP POLICY IF EXISTS "Users can view their own off days" ON off_days;
DROP POLICY IF EXISTS "Users can insert their own off days" ON off_days;
DROP POLICY IF EXISTS "Users can update their own off days" ON off_days;
DROP POLICY IF EXISTS "Users can delete their own off days" ON off_days;

CREATE POLICY "Users can view their own off days" 
ON off_days FOR SELECT
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'off_days')
);

CREATE POLICY "Users can insert their own off days" 
ON off_days FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND has_permission(auth.uid(), 'off_days')
);

CREATE POLICY "Users can update their own off days" 
ON off_days FOR UPDATE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'off_days')
);

CREATE POLICY "Users can delete their own off days" 
ON off_days FOR DELETE
USING (
  auth.uid() = user_id AND has_permission(auth.uid(), 'off_days')
);

-- ============================================
-- 4. Make ca-project-pdfs bucket private and update storage policies
-- ============================================

-- Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'ca-project-pdfs';

-- Drop the public access policy
DROP POLICY IF EXISTS "Anyone can view PDFs" ON storage.objects;

-- Allow teachers to SELECT their own project PDFs
CREATE POLICY "Teachers can access their project PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ca-project-pdfs' AND
  (SPLIT_PART(name, '/', 1))::uuid IN (
    SELECT id FROM ca_projects WHERE user_id = auth.uid()
  )
);

-- Allow admins to access all PDFs
CREATE POLICY "Admins can access all PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ca-project-pdfs' AND
  has_role(auth.uid(), 'admin')
);

-- Keep existing upload policies (teachers upload to their projects)
DROP POLICY IF EXISTS "Authenticated users can upload to ca-project-pdfs" ON storage.objects;

CREATE POLICY "Teachers can upload to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ca-project-pdfs' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Teachers can update their project PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ca-project-pdfs' AND
  (SPLIT_PART(name, '/', 1))::uuid IN (
    SELECT id FROM ca_projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete their project PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ca-project-pdfs' AND
  (SPLIT_PART(name, '/', 1))::uuid IN (
    SELECT id FROM ca_projects WHERE user_id = auth.uid()
  )
);