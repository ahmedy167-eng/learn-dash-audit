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
import { Plus, Trash2, Edit, ClipboardList, Loader2, CheckCircle, HelpCircle, BookOpen, Users } from 'lucide-react';
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
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
                <DialogDescription>
                  {editingQuiz ? 'Update quiz details' : 'Add a new quiz for your students'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
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
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" rows={3} />
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Active Status</Label>
                    <p className="text-xs text-muted-foreground">Visible to students</p>
                  </div>
                  <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                </div>
                <Button onClick={editingQuiz ? handleUpdateQuiz : handleCreateQuiz} className="w-full">
                  {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
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
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {sectionStudentCounts[quiz.section_id] || 0} students
                          </Badge>
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
                <CardTitle className="text-lg">
                  {selectedQuiz ? selectedQuiz.title : 'Select a Quiz'}
                </CardTitle>
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
                      <Button onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion} className="w-full">
                        {editingQuestion ? 'Update Question' : 'Add Question'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Quizzes;
