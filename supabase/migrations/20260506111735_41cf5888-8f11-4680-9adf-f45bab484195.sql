
-- Revisions table: snapshot of each feedback round
CREATE TABLE public.ca_submission_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.ca_submissions(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  content_snapshot text,
  feedback_html_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ca_submission_revisions_submission ON public.ca_submission_revisions(submission_id, round_number);

ALTER TABLE public.ca_submission_revisions ENABLE ROW LEVEL SECURITY;

-- Teacher (owner of project) can manage; admins too
CREATE POLICY "Teachers can view revisions for their projects"
ON public.ca_submission_revisions
FOR SELECT
TO authenticated
USING (
  submission_id IN (
    SELECT s.id FROM public.ca_submissions s
    JOIN public.ca_projects p ON p.id = s.project_id
    WHERE p.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers can insert revisions for their projects"
ON public.ca_submission_revisions
FOR INSERT
TO authenticated
WITH CHECK (
  submission_id IN (
    SELECT s.id FROM public.ca_submissions s
    JOIN public.ca_projects p ON p.id = s.project_id
    WHERE p.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Realtime: ca_submissions full row updates
ALTER TABLE public.ca_submissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ca_submissions;

-- Notification trigger: when teacher annotates (feedback_html changes), notify student
CREATE OR REPLACE FUNCTION public.notify_student_ca_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proj_title text;
BEGIN
  IF NEW.feedback_html IS DISTINCT FROM OLD.feedback_html
     AND NEW.feedback_html IS NOT NULL
     AND length(NEW.feedback_html) > 0 THEN
    SELECT title INTO proj_title FROM public.ca_projects WHERE id = NEW.project_id;
    INSERT INTO public.student_content_updates (student_id, update_type, title, reference_id)
    VALUES (NEW.student_id, 'ca_feedback',
            'New teacher feedback on: ' || COALESCE(proj_title, 'CA Project') || ' (' || NEW.stage || ')',
            NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student_ca_feedback
AFTER UPDATE ON public.ca_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_ca_feedback();
