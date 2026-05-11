
-- Add listening quiz columns
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_script text,
  ADD COLUMN IF NOT EXISTS max_plays integer,
  ADD COLUMN IF NOT EXISTS voice_id text;

-- Add skill tag column to questions (used by listening quizzes)
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS skill text;

-- Create private storage bucket for quiz audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-audio', 'quiz-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: teachers manage files under their own user_id/ prefix
CREATE POLICY "Teachers can read their own quiz audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'quiz-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can upload their own quiz audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quiz-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can update their own quiz audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quiz-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can delete their own quiz audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quiz-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
