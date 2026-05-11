UPDATE public.quizzes
SET is_active = false
WHERE quiz_type = 'listening'
  AND is_active = true
  AND audio_url IS NULL;