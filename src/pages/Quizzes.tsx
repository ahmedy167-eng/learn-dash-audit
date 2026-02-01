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
import { Plus, Trash2, Edit, ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
  section_number: string | null;
}

interface Quiz {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
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
}

const Quizzes = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
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

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch sections
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, section_number')
      .eq('user_id', user.id);
    setSections(sectionsData || []);

    // Fetch quizzes
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
      setQuestions(data || []);
    }
  };

  const handleCreateQuiz = async () => {
    if (!user || !formTitle.trim() || !formSectionId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        section_id: formSectionId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        is_active: formIsActive,
      });

    if (error) {
      toast.error('Failed to create quiz');
    } else {
      toast.success('Quiz created successfully');
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleUpdateQuiz = async () => {
    if (!editingQuiz || !formTitle.trim() || !formSectionId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('quizzes')
      .update({
        section_id: formSectionId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        is_active: formIsActive,
      })
      .eq('id', editingQuiz.id);

    if (error) {
      toast.error('Failed to update quiz');
    } else {
      toast.success('Quiz updated successfully');
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
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
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormTitle(quiz.title);
    setFormDescription(quiz.description || '');
    setFormSectionId(quiz.section_id);
    setFormIsActive(quiz.is_active);
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
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quizzes</h1>
            <p className="text-muted-foreground">Create and manage quizzes for your students</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingQuiz ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
                <DialogDescription>
                  {editingQuiz ? 'Update quiz details' : 'Add a new quiz for your students'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Section *</Label>
                  <Select value={formSectionId} onValueChange={setFormSectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name} {section.section_number && `(${section.section_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Quiz title" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                  <Label>Active (visible to students)</Label>
                </div>
                <Button onClick={editingQuiz ? handleUpdateQuiz : handleCreateQuiz} className="w-full">
                  {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quiz List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Quizzes</h2>
            {quizzes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No quizzes yet</p>
                  <p className="text-sm text-muted-foreground">Create your first quiz to get started</p>
                </CardContent>
              </Card>
            ) : (
              quizzes.map((quiz) => (
                <Card 
                  key={quiz.id} 
                  className={`cursor-pointer transition-colors ${selectedQuiz?.id === quiz.id ? 'border-primary' : 'hover:border-primary/50'}`}
                  onClick={() => selectQuiz(quiz)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>
                          {quiz.sections?.name} {quiz.sections?.section_number && `(${quiz.sections.section_number})`}
                        </CardDescription>
                      </div>
                      <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                        {quiz.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {quiz.description && <p className="text-sm text-muted-foreground mb-3">{quiz.description}</p>}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditQuiz(quiz); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {selectedQuiz ? `Questions: ${selectedQuiz.title}` : 'Select a Quiz'}
              </h2>
              {selectedQuiz && (
                <Dialog open={questionDialogOpen} onOpenChange={(open) => { setQuestionDialogOpen(open); if (!open) resetQuestionForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Reading Passage (Optional)</Label>
                        <Textarea value={readingPassage} onChange={(e) => setReadingPassage(e.target.value)} placeholder="Enter reading comprehension passage..." rows={4} />
                      </div>
                      <div className="space-y-2">
                        <Label>Question *</Label>
                        <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Enter the question..." />
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
                      <Button onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="w-full">
                        {editingQuestion ? 'Update Question' : 'Add Question'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {!selectedQuiz ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a quiz to manage questions</p>
                </CardContent>
              </Card>
            ) : questions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No questions yet</p>
                  <p className="text-sm text-muted-foreground">Add your first question</p>
                </CardContent>
              </Card>
            ) : (
              questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">Question {index + 1}</CardTitle>
                      <Badge>Answer: {question.correct_answer}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {question.reading_passage && (
                      <div className="bg-muted/50 p-3 rounded text-sm mb-2">
                        <p className="font-medium mb-1">Reading Passage:</p>
                        <p className="line-clamp-2">{question.reading_passage}</p>
                      </div>
                    )}
                    <p className="font-medium">{question.question_text}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>A. {question.option_a}</p>
                      <p>B. {question.option_b}</p>
                      <p>C. {question.option_c}</p>
                      <p>D. {question.option_d}</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => openEditQuestion(question)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Quizzes;
