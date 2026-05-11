import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Plus, Trash2, Edit, ClipboardList, Loader2, CheckCircle, HelpCircle, BookOpen, Users, BarChart3, XCircle, ChevronDown, ChevronUp, Sparkles, FileText, Headphones, Volume2 } from 'lucide-react';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
  section_number: string | null;
}

interface SectionStudentCount {
  section_id: string;
  count: number;
}

interface Quiz {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  quiz_type?: string;
  reading_passage?: string | null;
  audio_url?: string | null;
  audio_script?: string | null;
  max_plays?: number | null;
  voice_id?: string | null;
  sections?: Section;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  reading_passage: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
   explanation: string | null;
   skill?: string | null;
 }

const ELEVEN_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Female, US)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Male, UK)' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger (Male, US)' },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda (Female, US)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam (Male, US)' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica (Female, US)' },
];

const SKILL_OPTIONS = [
  { value: 'main_idea', label: 'Main Idea' },
  { value: 'detail', label: 'Detail' },
  { value: 'inference', label: 'Inference' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'purpose', label: 'Author\'s Purpose' },
];
 
 interface StudentQuizSubmission {
   student_id: string;
   student_name: string;
   student_number: string;
   total_questions: number;
   correct_answers: number;
   incorrect_answers: number;
   score_percentage: number;
   submitted_at: string;
   answers: {
     question_id: string;
     question_text: string;
     selected_answer: string;
     correct_answer: string;
     is_correct: boolean;
   }[];
}

const Quizzes = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sectionStudentCounts, setSectionStudentCounts] = useState<Record<string, number>>({});
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formQuizType, setFormQuizType] = useState<'standard' | 'reading' | 'listening'>('standard');
  const [formReadingPassage, setFormReadingPassage] = useState('');
  const [formQuestionCount, setFormQuestionCount] = useState(10);
  const [formAudioScript, setFormAudioScript] = useState('');
  const [formVoiceId, setFormVoiceId] = useState(ELEVEN_VOICES[0].id);
  const [formMaxPlays, setFormMaxPlays] = useState<string>('2');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Question form states
  const [questionText, setQuestionText] = useState('');
  const [readingPassage, setReadingPassage] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
   const [explanation, setExplanation] = useState('');
   const [skill, setSkill] = useState<string>('');
 
   // Results view states
   const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
   const [resultsLoading, setResultsLoading] = useState(false);
   const [studentResults, setStudentResults] = useState<StudentQuizSubmission[]>([]);
   const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, section_number')
      .eq('user_id', user.id);
    setSections(sectionsData || []);

    // Fetch student counts per section
    const sectionIds = (sectionsData || []).map(s => s.id);
    if (sectionIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('students')
        .select('section_id')
        .in('section_id', sectionIds);
      
      const counts: Record<string, number> = {};
      (studentsData || []).forEach(student => {
        if (student.section_id) {
          counts[student.section_id] = (counts[student.section_id] || 0) + 1;
        }
      });
      setSectionStudentCounts(counts);
    }

    const { data: quizzesData, error } = await supabase
      .from('quizzes')
      .select('*, sections(id, name, section_number)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load quizzes');
    } else {
      setQuizzes(quizzesData || []);
    }
    setLoading(false);
  };

  const fetchQuestions = async (quizId: string) => {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load questions');
    } else {
       setQuestions((data || []).map(q => ({ ...q, explanation: q.explanation || null })));
    }
  };

   const fetchQuizResults = async (quizId: string) => {
     setResultsLoading(true);
     
     // Fetch all questions for this quiz
     const { data: questionsData } = await supabase
       .from('quiz_questions')
       .select('id, question_text, correct_answer')
       .eq('quiz_id', quizId);
     
     if (!questionsData || questionsData.length === 0) {
       setStudentResults([]);
       setResultsLoading(false);
       return;
     }
     
     const questionIds = questionsData.map(q => q.id);
     
     // Fetch all submissions for these questions
     const { data: submissionsData } = await supabase
       .from('quiz_submissions')
       .select('student_id, question_id, selected_answer, is_correct, submitted_at')
       .in('question_id', questionIds);
     
     if (!submissionsData || submissionsData.length === 0) {
       setStudentResults([]);
       setResultsLoading(false);
       return;
     }
     
     // Get unique student IDs
     const studentIds = [...new Set(submissionsData.map(s => s.student_id))];
     
     // Fetch student details
     const { data: studentsData } = await supabase
       .from('students')
       .select('id, full_name, student_id')
       .in('id', studentIds);
     
     const studentsMap = new Map(studentsData?.map(s => [s.id, s]) || []);
     const questionsMap = new Map(questionsData.map(q => [q.id, q]));
     
     // Group submissions by student
     const studentSubmissions = new Map<string, typeof submissionsData>();
     submissionsData.forEach(sub => {
       const existing = studentSubmissions.get(sub.student_id) || [];
       existing.push(sub);
       studentSubmissions.set(sub.student_id, existing);
     });
     
     // Build results
     const results: StudentQuizSubmission[] = [];
     studentSubmissions.forEach((subs, studentId) => {
       const student = studentsMap.get(studentId);
       if (!student) return;
       
       const correctCount = subs.filter(s => s.is_correct).length;
       const latestSubmission = subs.reduce((latest, s) => 
         new Date(s.submitted_at) > new Date(latest.submitted_at) ? s : latest
       , subs[0]);
       
       results.push({
         student_id: studentId,
         student_name: student.full_name,
         student_number: student.student_id,
         total_questions: questionsData.length,
         correct_answers: correctCount,
         incorrect_answers: subs.length - correctCount,
         score_percentage: Math.round((correctCount / questionsData.length) * 100),
         submitted_at: latestSubmission.submitted_at,
         answers: subs.map(s => {
           const question = questionsMap.get(s.question_id);
           return {
             question_id: s.question_id,
             question_text: question?.question_text || '',
             selected_answer: s.selected_answer,
             correct_answer: question?.correct_answer || '',
             is_correct: s.is_correct
           };
         })
       });
     });
     
     // Sort by score descending
     results.sort((a, b) => b.score_percentage - a.score_percentage);
     
     setStudentResults(results);
     setResultsLoading(false);
   };
 
   const openResultsDialog = (quiz: Quiz) => {
     setSelectedQuiz(quiz);
     setResultsDialogOpen(true);
     fetchQuizResults(quiz.id);
   };
 
  const handleCreateQuiz = async () => {
    if (!user || !formTitle.trim() || !formSectionId) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formQuizType === 'reading' && formReadingPassage.trim().length < 100) {
      toast.error('Reading passage must be at least 100 characters');
      return;
    }
    if (formQuizType === 'listening' && formAudioScript.trim().length < 100) {
      toast.error('Audio script must be at least 100 characters');
      return;
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        section_id: formSectionId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        is_active: formQuizType === 'listening' ? false : formIsActive,
        quiz_type: formQuizType,
        reading_passage: formQuizType === 'reading' ? formReadingPassage.trim() : null,
        audio_script: formQuizType === 'listening' ? formAudioScript.trim() : null,
        voice_id: formQuizType === 'listening' ? formVoiceId : null,
        max_plays: formQuizType === 'listening' ? (formMaxPlays === 'unlimited' ? null : Number(formMaxPlays)) : null,
      })
      .select('*, sections(id, name, section_number)')
      .single();

    if (error || !data) {
      toast.error('Failed to create quiz');
      return;
    }

    toast.success('Quiz created successfully');

    if (formQuizType === 'reading') {
      const ok = await generateReadingQuestions(data.id, formReadingPassage.trim(), formQuestionCount);
      if (ok) {
        setSelectedQuiz(data as Quiz);
        await fetchQuestions(data.id);
      }
    } else if (formQuizType === 'listening') {
      const ok = await generateListeningQuiz(data.id, formAudioScript.trim(), formQuestionCount, formVoiceId);
      if (ok) {
        await supabase.from('quizzes').update({ is_active: formIsActive }).eq('id', data.id);
        setSelectedQuiz(data as Quiz);
        await fetchQuestions(data.id);
      } else {
        toast.error('Audio generation failed — quiz saved as inactive. Open Edit to retry.');
      }
    }

    resetForm();
    setDialogOpen(false);
    fetchData();
  };

  const generateListeningQuiz = async (quizId: string, script: string, count: number, voiceId: string): Promise<boolean> => {
    setGeneratingAI(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); return false; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-listening-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ script, count, voice_id: voiceId, quiz_id: quizId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Audio/AI generation failed'); return false; }
      const rows = (json.questions || []).map((q: any) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        skill: q.skill,
        reading_passage: null,
      }));
      const { error: insErr } = await supabase.from('quiz_questions').insert(rows);
      if (insErr) { toast.error('Failed to save generated questions'); return false; }
      toast.success(`Audio created and ${rows.length} questions generated`);
      return true;
    } catch (e) {
      toast.error('Generation failed');
      return false;
    } finally {
      setGeneratingAI(false);
    }
  };

  const generateReadingQuestions = async (quizId: string, passage: string, count: number): Promise<boolean> => {
    setGeneratingAI(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not authenticated'); return false; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-reading-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ passage, count }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'AI generation failed');
        return false;
      }
      const rows = (json.questions || []).map((q: any) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        reading_passage: null,
      }));
      const { error: insErr } = await supabase.from('quiz_questions').insert(rows);
      if (insErr) { toast.error('Failed to save generated questions'); return false; }
      toast.success(`Generated ${rows.length} questions`);
      return true;
    } catch (e) {
      toast.error('AI generation failed');
      return false;
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedQuiz) return;
    if (selectedQuiz.quiz_type === 'reading') {
      if (!confirm('This will delete existing questions and generate new ones from the passage. Continue?')) return;
      await supabase.from('quiz_questions').delete().eq('quiz_id', selectedQuiz.id);
      const passage = selectedQuiz.reading_passage || '';
      if (!passage) { toast.error('No passage on this quiz'); return; }
      const ok = await generateReadingQuestions(selectedQuiz.id, passage, formQuestionCount);
      if (ok) await fetchQuestions(selectedQuiz.id);
    } else if (selectedQuiz.quiz_type === 'listening') {
      if (!confirm('This will regenerate the audio AND replace all questions. Continue?')) return;
      await supabase.from('quiz_questions').delete().eq('quiz_id', selectedQuiz.id);
      const script = selectedQuiz.audio_script || '';
      if (!script) { toast.error('No script on this quiz'); return; }
      const voice = selectedQuiz.voice_id || ELEVEN_VOICES[0].id;
      const ok = await generateListeningQuiz(selectedQuiz.id, script, formQuestionCount, voice);
      if (ok) {
        await fetchQuestions(selectedQuiz.id);
        await fetchData();
      }
    }
  };

  const handleUpdateQuiz = async () => {
    if (!editingQuiz || !formTitle.trim() || !formSectionId) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formQuizType === 'listening' && formAudioScript.trim().length < 100) {
      toast.error('Audio script must be at least 100 characters');
      return;
    }

    const scriptChanged = formQuizType === 'listening' && formAudioScript.trim() !== (editingQuiz.audio_script || '').trim();
    const voiceChanged = formQuizType === 'listening' && formVoiceId !== (editingQuiz.voice_id || '');
    const needsRegen = scriptChanged || voiceChanged;

    const { error } = await supabase
      .from('quizzes')
      .update({
        section_id: formSectionId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        is_active: needsRegen ? false : formIsActive,
        reading_passage: formQuizType === 'reading' ? formReadingPassage.trim() : null,
        audio_script: formQuizType === 'listening' ? formAudioScript.trim() : null,
        voice_id: formQuizType === 'listening' ? formVoiceId : null,
        max_plays: formQuizType === 'listening' ? (formMaxPlays === 'unlimited' ? null : Number(formMaxPlays)) : null,
      })
      .eq('id', editingQuiz.id);

    if (error) {
      toast.error('Failed to update quiz');
      return;
    }

    if (needsRegen) {
      await supabase.from('quiz_questions').delete().eq('quiz_id', editingQuiz.id);
      const ok = await generateListeningQuiz(editingQuiz.id, formAudioScript.trim(), formQuestionCount, formVoiceId);
      if (ok) {
        await supabase.from('quizzes').update({ is_active: formIsActive }).eq('id', editingQuiz.id);
      } else {
        toast.error('Audio regeneration failed — quiz marked inactive. Edit again to retry.');
      }
    }

    toast.success('Quiz updated successfully');
    resetForm();
    setDialogOpen(false);
    fetchData();
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) {
      toast.error('Failed to delete quiz');
    } else {
      toast.success('Quiz deleted');
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
        setQuestions([]);
      }
      fetchData();
    }
  };

  const handleCreateQuestion = async () => {
    if (!selectedQuiz || !questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim() || !correctAnswer) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: selectedQuiz.id,
        question_text: questionText.trim(),
        reading_passage: readingPassage.trim() || null,
        option_a: optionA.trim(),
        option_b: optionB.trim(),
        option_c: optionC.trim(),
        option_d: optionD.trim(),
        correct_answer: correctAnswer,
         explanation: explanation.trim() || null,
         skill: selectedQuiz.quiz_type === 'listening' ? (skill || 'detail') : null,
      });

    if (error) {
      toast.error('Failed to create question');
    } else {
      toast.success('Question added');
      resetQuestionForm();
      setQuestionDialogOpen(false);
      fetchQuestions(selectedQuiz.id);
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion || !questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim() || !correctAnswer) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('quiz_questions')
      .update({
        question_text: questionText.trim(),
        reading_passage: readingPassage.trim() || null,
        option_a: optionA.trim(),
        option_b: optionB.trim(),
        option_c: optionC.trim(),
        option_d: optionD.trim(),
        correct_answer: correctAnswer,
         explanation: explanation.trim() || null,
         skill: selectedQuiz?.quiz_type === 'listening' ? (skill || 'detail') : null,
      })
      .eq('id', editingQuestion.id);

    if (error) {
      toast.error('Failed to update question');
    } else {
      toast.success('Question updated');
      resetQuestionForm();
      setQuestionDialogOpen(false);
      fetchQuestions(selectedQuiz!.id);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      toast.error('Failed to delete question');
    } else {
      toast.success('Question deleted');
      fetchQuestions(selectedQuiz!.id);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormSectionId('');
    setFormIsActive(true);
    setFormQuizType('standard');
    setFormReadingPassage('');
    setFormQuestionCount(10);
    setFormAudioScript('');
    setFormVoiceId(ELEVEN_VOICES[0].id);
    setFormMaxPlays('2');
    setEditingQuiz(null);
  };

  const resetQuestionForm = () => {
    setQuestionText('');
    setReadingPassage('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectAnswer('');
    setEditingQuestion(null);
     setExplanation('');
     setSkill('');
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormTitle(quiz.title);
    setFormDescription(quiz.description || '');
    setFormSectionId(quiz.section_id);
    setFormIsActive(quiz.is_active);
    setFormQuizType((quiz.quiz_type as 'standard' | 'reading' | 'listening') || 'standard');
    setFormReadingPassage(quiz.reading_passage || '');
    setFormAudioScript(quiz.audio_script || '');
    setFormVoiceId(quiz.voice_id || ELEVEN_VOICES[0].id);
    setFormMaxPlays(quiz.max_plays == null ? 'unlimited' : String(quiz.max_plays));
    setDialogOpen(true);
  };

  const openEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setQuestionText(question.question_text);
    setReadingPassage(question.reading_passage || '');
    setOptionA(question.option_a);
    setOptionB(question.option_b);
    setOptionC(question.option_c);
    setOptionD(question.option_d);
    setCorrectAnswer(question.correct_answer);
     setExplanation(question.explanation || '');
     setSkill(question.skill || '');
    setQuestionDialogOpen(true);
  };

  const selectQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    fetchQuestions(quiz.id);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              Quizzes
            </h1>
            <p className="text-muted-foreground">Create and manage quizzes for your students</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm">
                <Plus className="mr-2 h-5 w-5" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
                <DialogDescription>
                  {editingQuiz ? 'Update quiz details' : 'Add a new quiz for your students'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {!editingQuiz && (
                  <div className="space-y-2">
                    <Label>Quiz Type *</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormQuizType('standard')}
                        className={`p-3 rounded-lg border text-left transition-colors ${formQuizType === 'standard' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      >
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <ClipboardList className="h-4 w-4" /> Standard
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Add questions one by one</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormQuizType('reading')}
                        className={`p-3 rounded-lg border text-left transition-colors ${formQuizType === 'reading' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      >
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <FileText className="h-4 w-4" /> Reading
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">AI questions from a passage</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormQuizType('listening')}
                        className={`p-3 rounded-lg border text-left transition-colors ${formQuizType === 'listening' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      >
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <Headphones className="h-4 w-4" /> Listening
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">AI audio + questions</p>
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Section *</Label>
                  <Select value={formSectionId} onValueChange={setFormSectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name} {section.section_number && `(${section.section_number})`} - {sectionStudentCounts[section.id] || 0} students
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only students assigned to this section will see the quiz
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Enter quiz title" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" rows={2} />
                </div>

                {formQuizType === 'reading' && (
                  <>
                    <div className="space-y-2">
                      <Label>Reading Passage *</Label>
                      <Textarea
                        value={formReadingPassage}
                        onChange={(e) => setFormReadingPassage(e.target.value)}
                        placeholder="Paste or write the reading comprehension passage here (min 100 characters)..."
                        rows={10}
                        className="font-serif"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formReadingPassage.trim().length} characters
                      </p>
                    </div>
                    {!editingQuiz && (
                      <div className="space-y-2">
                        <Label>Number of Questions ({formQuestionCount})</Label>
                        <input
                          type="range"
                          min={10}
                          max={25}
                          value={formQuestionCount}
                          onChange={(e) => setFormQuestionCount(Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>10</span><span>25</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {formQuizType === 'listening' && (
                  <>
                    <div className="space-y-2">
                      <Label>Audio Script *</Label>
                      <Textarea
                        value={formAudioScript}
                        onChange={(e) => setFormAudioScript(e.target.value)}
                        placeholder="Write the script that will be read aloud (min 100, max 4000 characters)..."
                        rows={8}
                      />
                      <p className="text-xs text-muted-foreground">{formAudioScript.trim().length} / 4000 characters</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Voice</Label>
                        <Select value={formVoiceId} onValueChange={setFormVoiceId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ELEVEN_VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Max Plays</Label>
                        <Select value={formMaxPlays} onValueChange={setFormMaxPlays}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 time</SelectItem>
                            <SelectItem value="2">2 times</SelectItem>
                            <SelectItem value="3">3 times</SelectItem>
                            <SelectItem value="unlimited">Unlimited</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {!editingQuiz && (
                      <div className="space-y-2">
                        <Label>Number of Questions ({formQuestionCount})</Label>
                        <input type="range" min={10} max={25} value={formQuestionCount}
                          onChange={(e) => setFormQuestionCount(Number(e.target.value))} className="w-full" />
                        <div className="flex justify-between text-xs text-muted-foreground"><span>10</span><span>25</span></div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Active Status</Label>
                    <p className="text-xs text-muted-foreground">Visible to students</p>
                  </div>
                  <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                </div>
                <Button onClick={editingQuiz ? handleUpdateQuiz : handleCreateQuiz} className="w-full" disabled={generatingAI}>
                  {generatingAI ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating questions with AI…</>
                  ) : editingQuiz ? 'Update Quiz' : ((formQuizType === 'reading' || formQuizType === 'listening') ? (<><Sparkles className="mr-2 h-4 w-4" /> Create & Generate</>) : 'Create Quiz')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ClipboardList className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{quizzes.length}</p>
                  <p className="text-xs text-muted-foreground">Total Quizzes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{quizzes.filter(q => q.is_active).length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{questions.length}</p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sections.length}</p>
                  <p className="text-xs text-muted-foreground">Sections</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-5 items-start">
          {/* Quiz List - Left Panel */}
          <Card className="lg:col-span-2 flex flex-col min-h-[600px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Your Quizzes</CardTitle>
                <Badge variant="secondary">{quizzes.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-6 pb-6">
              {quizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg">
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <ClipboardList className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">No quizzes yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Create your first quiz to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quizzes.map((quiz) => (
                    <Card 
                      key={quiz.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedQuiz?.id === quiz.id 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => selectQuiz(quiz)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <CardTitle className="text-base truncate">{quiz.title}</CardTitle>
                            <CardDescription className="text-xs">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {quiz.sections?.name}
                                {quiz.sections?.section_number && ` (${quiz.sections.section_number})`}
                              </span>
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={quiz.is_active ? 'default' : 'secondary'}
                            className={quiz.is_active ? 'bg-green-500/10 text-green-600 border-green-200' : ''}
                          >
                            {quiz.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {sectionStudentCounts[quiz.section_id] || 0} students
                          </Badge>
                          {quiz.quiz_type === 'reading' && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-200">
                              <FileText className="h-3 w-3 mr-1" /> Reading
                            </Badge>
                          )}
                          {quiz.quiz_type === 'listening' && (
                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                              <Headphones className="h-3 w-3 mr-1" /> Listening
                            </Badge>
                          )}
                        </div>
                        {quiz.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{quiz.description}</p>
                        )}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => { e.stopPropagation(); openEditQuiz(quiz); }}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={(e) => { e.stopPropagation(); openResultsDialog(quiz); }}
                         >
                           <BarChart3 className="h-3.5 w-3.5" />
                         </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Questions Panel - Right Side */}
          <Card className="lg:col-span-3 flex flex-col min-h-[600px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {selectedQuiz ? selectedQuiz.title : 'Select a Quiz'}
                  {selectedQuiz?.quiz_type === 'reading' && (
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-200">
                      <FileText className="h-3 w-3 mr-1" /> Reading
                    </Badge>
                  )}
                  {selectedQuiz?.quiz_type === 'listening' && (
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                      <Headphones className="h-3 w-3 mr-1" /> Listening
                    </Badge>
                  )}
                </CardTitle>
              {selectedQuiz && (
                <div className="flex items-center gap-2">
                  {(selectedQuiz.quiz_type === 'reading' || selectedQuiz.quiz_type === 'listening') && (
                    <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={generatingAI}>
                      {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Regenerate</>}
                    </Button>
                  )}
                <Dialog open={questionDialogOpen} onOpenChange={(open) => { setQuestionDialogOpen(open); if (!open) resetQuestionForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Reading Passage (Optional)</Label>
                        <Textarea value={readingPassage} onChange={(e) => setReadingPassage(e.target.value)} placeholder="Enter reading comprehension passage..." rows={4} />
                      </div>
                      <div className="space-y-2">
                        <Label>Question *</Label>
                        <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Enter the question..." rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Option A *</Label>
                          <Input value={optionA} onChange={(e) => setOptionA(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Option B *</Label>
                          <Input value={optionB} onChange={(e) => setOptionB(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Option C *</Label>
                          <Input value={optionC} onChange={(e) => setOptionC(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Option D *</Label>
                          <Input value={optionD} onChange={(e) => setOptionD(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Correct Answer *</Label>
                        <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                       {selectedQuiz?.quiz_type === 'listening' && (
                        <div className="space-y-2">
                          <Label>Skill / Tag *</Label>
                          <Select value={skill || 'detail'} onValueChange={setSkill}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select skill" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main_idea">Main Idea</SelectItem>
                              <SelectItem value="detail">Detail</SelectItem>
                              <SelectItem value="inference">Inference</SelectItem>
                              <SelectItem value="vocabulary">Vocabulary</SelectItem>
                              <SelectItem value="purpose">Purpose / Tone</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Used to group results into improvement areas</p>
                        </div>
                       )}
                       <div className="space-y-2">
                         <Label>Explanation (Optional)</Label>
                         <Textarea 
                           value={explanation} 
                           onChange={(e) => setExplanation(e.target.value)} 
                           placeholder="Explain why this is the correct answer... (shown to students after they complete the quiz)" 
                           rows={3} 
                         />
                         <p className="text-xs text-muted-foreground">
                           This explanation will be shown to students who answer incorrectly after completing the quiz
                         </p>
                       </div>
                      <Button onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="w-full">
                        {editingQuestion ? 'Update Question' : 'Add Question'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-6 pb-6">
              {!selectedQuiz ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg">
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <HelpCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">No quiz selected</p>
                    <p className="text-sm text-muted-foreground mt-1">Select a quiz from the left to manage questions</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg">
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">No questions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Add your first question to this quiz</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedQuiz?.quiz_type === 'reading' && selectedQuiz.reading_passage && (
                    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <FileText className="h-4 w-4" /> Reading Passage
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap font-serif leading-relaxed max-h-48 overflow-y-auto">
                          {selectedQuiz.reading_passage}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {questions.map((question, index) => (
                    <Card key={question.id} className="overflow-hidden">
                      <CardHeader className="pb-3 bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {index + 1}
                            </div>
                            <span className="font-medium">Question {index + 1}</span>
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                            Answer: {question.correct_answer}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {question.reading_passage && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">📖 Reading Passage</p>
                            <p className="text-sm line-clamp-3">{question.reading_passage}</p>
                          </div>
                        )}
                        
                        <p className="font-medium text-foreground">{question.question_text}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {['A', 'B', 'C', 'D'].map((option) => {
                            const optionValue = question[`option_${option.toLowerCase()}` as keyof QuizQuestion] as string;
                            const isCorrect = question.correct_answer === option;
                            return (
                              <div 
                                key={option}
                                className={`p-3 rounded-lg border text-sm ${
                                  isCorrect 
                                    ? 'bg-green-500/10 border-green-300 dark:border-green-700' 
                                    : 'bg-muted/30 border-border'
                                }`}
                              >
                                <span className="font-semibold mr-2">{option}.</span>
                                {optionValue}
                                {isCorrect && <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-500" />}
                              </div>
                            );
                          })}
                        </div>
                        
                        <Separator />
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditQuestion(question)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                         
                         {question.explanation && (
                           <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                             <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">💡 Explanation</p>
                             <p className="text-sm text-amber-700 dark:text-amber-300">{question.explanation}</p>
                           </div>
                         )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
         
         {/* Results Dialog */}
         <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
           <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                 <BarChart3 className="h-5 w-5" />
                 Quiz Results: {selectedQuiz?.title}
               </DialogTitle>
               <DialogDescription>
                 Student performance and detailed answers
               </DialogDescription>
             </DialogHeader>
             
             <ScrollArea className="flex-1 -mx-6 px-6">
               {resultsLoading ? (
                 <div className="flex items-center justify-center py-12">
                   <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
               ) : studentResults.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12">
                   <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                   <p className="text-muted-foreground">No submissions yet</p>
                   <p className="text-sm text-muted-foreground">Students haven't taken this quiz yet</p>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {studentResults.map((result) => (
                     <Collapsible 
                       key={result.student_id}
                       open={expandedStudent === result.student_id}
                       onOpenChange={(open) => setExpandedStudent(open ? result.student_id : null)}
                     >
                       <Card>
                         <CollapsibleTrigger asChild>
                           <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 <div className="space-y-1">
                                   <CardTitle className="text-base">{result.student_name}</CardTitle>
                                   <CardDescription className="text-xs">ID: {result.student_number}</CardDescription>
                                 </div>
                               </div>
                               <div className="flex items-center gap-4">
                                 <div className="text-right">
                                   <p className="text-lg font-bold text-primary">{result.score_percentage}%</p>
                                   <p className="text-xs text-muted-foreground">
                                     {result.correct_answers}/{result.total_questions} correct
                                   </p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                     <CheckCircle className="h-3 w-3 mr-1" />
                                     {result.correct_answers}
                                   </Badge>
                                   <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                     <XCircle className="h-3 w-3 mr-1" />
                                     {result.incorrect_answers}
                                   </Badge>
                                   {expandedStudent === result.student_id ? (
                                     <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                   ) : (
                                     <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                   )}
                                 </div>
                               </div>
                             </div>
                             <Progress value={result.score_percentage} className="h-2 mt-2" />
                           </CardHeader>
                         </CollapsibleTrigger>
                         <CollapsibleContent>
                           <CardContent className="pt-0">
                             <Separator className="mb-4" />
                             <Table>
                               <TableHeader>
                                 <TableRow>
                                   <TableHead className="w-12">#</TableHead>
                                   <TableHead>Question</TableHead>
                                   <TableHead className="w-24">Selected</TableHead>
                                   <TableHead className="w-24">Correct</TableHead>
                                   <TableHead className="w-20">Result</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {result.answers.map((answer, idx) => (
                                   <TableRow key={answer.question_id}>
                                     <TableCell className="font-medium">{idx + 1}</TableCell>
                                     <TableCell className="max-w-xs truncate">{answer.question_text}</TableCell>
                                     <TableCell>
                                       <Badge variant="outline">{answer.selected_answer}</Badge>
                                     </TableCell>
                                     <TableCell>
                                       <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                         {answer.correct_answer}
                                       </Badge>
                                     </TableCell>
                                     <TableCell>
                                       {answer.is_correct ? (
                                         <CheckCircle className="h-5 w-5 text-green-600" />
                                       ) : (
                                         <XCircle className="h-5 w-5 text-red-600" />
                                       )}
                                     </TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </CardContent>
                         </CollapsibleContent>
                       </Card>
                     </Collapsible>
                   ))}
                 </div>
               )}
             </ScrollArea>
           </DialogContent>
         </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Quizzes;
