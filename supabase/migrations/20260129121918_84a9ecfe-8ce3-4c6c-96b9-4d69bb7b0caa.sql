-- Create cover_class_audits table for tracking cover class virtual audits
CREATE TABLE public.cover_class_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  teacher_name TEXT NOT NULL,
  original_teacher_name TEXT NOT NULL,
  elsd_id TEXT NOT NULL,
  campus TEXT NOT NULL,
  section_number TEXT NOT NULL,
  week TEXT NOT NULL,
  date_of_teaching DATE NOT NULL,
  teaching_mode TEXT NOT NULL,
  course TEXT NOT NULL,
  book TEXT NOT NULL,
  unit TEXT NOT NULL,
  page TEXT,
  number_of_students INTEGER,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cover_class_audits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own cover class audits"
ON public.cover_class_audits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cover class audits"
ON public.cover_class_audits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cover class audits"
ON public.cover_class_audits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cover class audits"
ON public.cover_class_audits
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cover_class_audits_updated_at
BEFORE UPDATE ON public.cover_class_audits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();