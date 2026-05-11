ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'intermediate';

CREATE OR REPLACE FUNCTION public.validate_quiz_difficulty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.difficulty NOT IN ('easy','intermediate','advanced') THEN
    RAISE EXCEPTION 'Invalid difficulty: %', NEW.difficulty;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quizzes_validate_difficulty ON public.quizzes;
CREATE TRIGGER quizzes_validate_difficulty
BEFORE INSERT OR UPDATE ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.validate_quiz_difficulty();