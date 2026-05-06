CREATE TABLE public.diary_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weekday TEXT NOT NULL,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note_time TIME,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT,
  reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diary_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own diary notes" ON public.diary_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own diary notes" ON public.diary_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own diary notes" ON public.diary_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own diary notes" ON public.diary_notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all diary notes" ON public.diary_notes FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_diary_notes_updated_at
BEFORE UPDATE ON public.diary_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_diary_notes_user_weekday ON public.diary_notes(user_id, weekday);