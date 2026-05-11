ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS quiz_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS reading_passage text;

ALTER TABLE public.quizzes
  DROP CONSTRAINT IF EXISTS quizzes_quiz_type_check;
ALTER TABLE public.quizzes
  ADD CONSTRAINT quizzes_quiz_type_check CHECK (quiz_type IN ('standard','reading'));