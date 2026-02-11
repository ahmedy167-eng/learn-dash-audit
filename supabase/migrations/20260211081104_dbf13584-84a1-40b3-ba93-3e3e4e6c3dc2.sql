
-- Create student_content_updates table
CREATE TABLE public.student_content_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  update_type text NOT NULL CHECK (update_type IN ('quiz', 'lms', 'ca_project')),
  title text NOT NULL,
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS - accessed via edge function with service role only
ALTER TABLE public.student_content_updates ENABLE ROW LEVEL SECURITY;
-- No policies = no direct client access

-- Index for fast lookups
CREATE INDEX idx_student_content_updates_student ON public.student_content_updates(student_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_content_updates;

-- Trigger function: on quiz insert/update
CREATE OR REPLACE FUNCTION public.notify_students_quiz_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  quiz_title text;
  msg text;
BEGIN
  quiz_title := NEW.title;
  
  IF TG_OP = 'INSERT' THEN
    msg := 'New quiz published: ' || quiz_title;
  ELSE
    msg := 'Quiz updated: ' || quiz_title;
  END IF;

  INSERT INTO public.student_content_updates (student_id, update_type, title, reference_id)
  SELECT s.id, 'quiz', msg, NEW.id
  FROM public.students s
  WHERE s.section_id = NEW.section_id AND s.is_active = true;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quiz_content_update
AFTER INSERT OR UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.notify_students_quiz_change();

-- Trigger function: on LMS progress insert/update
CREATE OR REPLACE FUNCTION public.notify_student_lms_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.student_content_updates (student_id, update_type, title, reference_id)
  VALUES (NEW.student_id, 'lms', 'Your LMS progress was updated for: ' || NEW.unit_name, NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lms_content_update
AFTER INSERT OR UPDATE ON public.lms_progress
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_lms_change();

-- Trigger function: on CA project insert/update
CREATE OR REPLACE FUNCTION public.notify_students_ca_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  project_title text;
  msg text;
BEGIN
  project_title := NEW.title;

  IF TG_OP = 'INSERT' THEN
    msg := 'New CA Project: ' || project_title;
  ELSE
    msg := 'CA Project updated: ' || project_title;
  END IF;

  INSERT INTO public.student_content_updates (student_id, update_type, title, reference_id)
  SELECT s.id, 'ca_project', msg, NEW.id
  FROM public.students s
  WHERE s.section_id = NEW.section_id AND s.is_active = true;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ca_content_update
AFTER INSERT OR UPDATE ON public.ca_projects
FOR EACH ROW
EXECUTE FUNCTION public.notify_students_ca_change();
