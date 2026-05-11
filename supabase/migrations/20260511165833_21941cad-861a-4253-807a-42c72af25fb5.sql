ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS transcript_visibility text NOT NULL DEFAULT 'never';

CREATE OR REPLACE FUNCTION public.validate_quiz_transcript_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.transcript_visibility NOT IN ('never','after_audio','always') THEN
    RAISE EXCEPTION 'Invalid transcript_visibility: %', NEW.transcript_visibility;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_quiz_transcript_visibility_trigger ON public.quizzes;
CREATE TRIGGER validate_quiz_transcript_visibility_trigger
BEFORE INSERT OR UPDATE ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.validate_quiz_transcript_visibility();