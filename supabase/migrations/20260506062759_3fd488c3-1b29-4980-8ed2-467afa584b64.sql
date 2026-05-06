
ALTER TABLE public.diary_notes
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Personal',
  ADD COLUMN IF NOT EXISTS mood text,
  ADD COLUMN IF NOT EXISTS mood_emoji text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_action_items jsonb,
  ADD COLUMN IF NOT EXISTS ai_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS voice_url text,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_diary_notes_user_category ON public.diary_notes(user_id, category);
CREATE INDEX IF NOT EXISTS idx_diary_notes_user_date ON public.diary_notes(user_id, note_date DESC);

-- Storage bucket for voice notes (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('diary-voice', 'diary-voice', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own diary voice"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'diary-voice' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own diary voice"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'diary-voice' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own diary voice"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'diary-voice' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own diary voice"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'diary-voice' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Diary links table for smart memory linking
CREATE TABLE IF NOT EXISTS public.diary_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  note_id uuid NOT NULL REFERENCES public.diary_notes(id) ON DELETE CASCADE,
  linked_note_id uuid NOT NULL REFERENCES public.diary_notes(id) ON DELETE CASCADE,
  relevance numeric NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, linked_note_id)
);

ALTER TABLE public.diary_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own diary links"
ON public.diary_links FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diary links"
ON public.diary_links FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary links"
ON public.diary_links FOR DELETE TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON public.diary_links FROM anon, PUBLIC;
GRANT SELECT, INSERT, DELETE ON public.diary_links TO authenticated;
