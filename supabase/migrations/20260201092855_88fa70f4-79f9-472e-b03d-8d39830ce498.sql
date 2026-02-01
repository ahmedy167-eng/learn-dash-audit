-- Create storage bucket for CA project PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('ca-project-pdfs', 'ca-project-pdfs', true);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  reading_passage TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_submissions table
CREATE TABLE public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lms_progress table
CREATE TABLE public.lms_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  unit_name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ca_projects table
CREATE TABLE public.ca_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ca_submissions table
CREATE TABLE public.ca_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.ca_projects(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('ideas', 'first_draft', 'second_draft', 'final_draft')),
  content TEXT,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ca_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ca_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes
CREATE POLICY "Users can view their own quizzes" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quizzes" ON public.quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all quizzes" ON public.quizzes FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can view quizzes for their section" ON public.quizzes FOR SELECT USING (true);

-- RLS Policies for quiz_questions
CREATE POLICY "Users can manage their quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid())
);
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions FOR SELECT USING (true);

-- RLS Policies for quiz_submissions
CREATE POLICY "Anyone can insert quiz submissions" ON public.quiz_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view quiz submissions" ON public.quiz_submissions FOR SELECT USING (true);
CREATE POLICY "Admins can view all quiz submissions" ON public.quiz_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for lms_progress
CREATE POLICY "Anyone can view lms progress" ON public.lms_progress FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage lms progress" ON public.lms_progress FOR ALL USING (auth.uid() = updated_by);
CREATE POLICY "Admins can manage all lms progress" ON public.lms_progress FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ca_projects
CREATE POLICY "Users can view their own ca projects" ON public.ca_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ca projects" ON public.ca_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ca projects" ON public.ca_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ca projects" ON public.ca_projects FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all ca projects" ON public.ca_projects FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can view ca projects for their section" ON public.ca_projects FOR SELECT USING (true);

-- RLS Policies for ca_submissions
CREATE POLICY "Anyone can insert ca submissions" ON public.ca_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view ca submissions" ON public.ca_submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can update ca submissions" ON public.ca_submissions FOR UPDATE USING (true);
CREATE POLICY "Admins can manage all ca submissions" ON public.ca_submissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for ca-project-pdfs bucket
CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ca-project-pdfs' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'ca-project-pdfs');
CREATE POLICY "Authenticated users can update their PDFs" ON storage.objects FOR UPDATE USING (bucket_id = 'ca-project-pdfs' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete PDFs" ON storage.objects FOR DELETE USING (bucket_id = 'ca-project-pdfs' AND auth.role() = 'authenticated');

-- Add updated_at triggers
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lms_progress_updated_at BEFORE UPDATE ON public.lms_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ca_projects_updated_at BEFORE UPDATE ON public.ca_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ca_submissions_updated_at BEFORE UPDATE ON public.ca_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();