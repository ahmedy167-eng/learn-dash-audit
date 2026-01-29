-- Create sections table for managing class sections
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  section_number TEXT,
  category TEXT DEFAULT 'Regular',
  course TEXT,
  room TEXT,
  building TEXT,
  start_class_time TIME WITHOUT TIME ZONE,
  finish_class_time TIME WITHOUT TIME ZONE,
  teaching_days TEXT[] DEFAULT '{}',
  off_days DATE[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- RLS policies for sections
CREATE POLICY "Users can view their own sections"
  ON public.sections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sections"
  ON public.sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sections"
  ON public.sections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sections"
  ON public.sections FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add section_id foreign key to students table
ALTER TABLE public.students 
ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;