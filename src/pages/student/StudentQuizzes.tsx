import { useState, useEffect } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useStudentApi } from '@/hooks/useStudentApi';
import { StudentLayout } from '@/components/student/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ClipboardList, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
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
  correct_answer?: string;
}

interface QuizSubmission {
  id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
}

const StudentQuizzes = () => {
  const { student } = useStudentAuth();
  const { getData, performAction } = useStudentApi();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, QuizSubmission>>({});
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, [student]);

  const fetchQuizzes = async () => {
    if (!student?.section_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await getData<Quiz[]>('quizzes');

    if (error) {
      toast.error('Failed to load quizzes');
    } else {
      setQuizzes(data || []);
    }
    setLoading(false);
  };

  const fetchQuizDetails = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setLoading(true);

    // Fetch questions
    const { data: questionsData, error: questionsError } = await getData<QuizQuestion[]>('quiz_questions', { quizId: quiz.id });

    if (questionsError) {
      toast.error('Failed to load quiz questions');
      setLoading(false);
      return;
    }

    setQuestions(questionsData || []);

    // Fetch existing submissions
    if (student) {
      const { data: submissionsData } = await getData<QuizSubmission[]>('quiz_submissions');

      const submissionsMap: Record<string, QuizSubmission> = {};
      const questionIds = new Set((questionsData || []).map(q => q.id));
      submissionsData?.forEach(sub => {
        if (questionIds.has(sub.question_id)) {
          submissionsMap[sub.question_id] = sub;
        }
      });
      setSubmissions(submissionsMap);
    }

    setLoading(false);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setCurrentAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitAnswer = async (question: QuizQuestion) => {
    if (!student || !currentAnswers[question.id]) {
      toast.error('Please select an answer');
      return;
    }

    setSubmitting(true);

    // Note: correct_answer is not exposed to client anymore for security
    // The server will validate and return whether it's correct
    const { data, error } = await performAction<QuizSubmission>('submit_quiz', {
      questionId: question.id,
      selectedAnswer: currentAnswers[question.id],
      isCorrect: false, // Server will validate this
    });

    if (error) {
      toast.error('Failed to submit answer');
    } else if (data) {
      setSubmissions(prev => ({ ...prev, [question.id]: data }));
      if (data.is_correct) {
        toast.success('Correct answer! 🎉');
      } else {
        toast.error('Incorrect answer');
      }
    }

    setSubmitting(false);
  };

  const goBack = () => {
    setSelectedQuiz(null);
    setQuestions([]);
    setSubmissions({});
    setCurrentAnswers({});
  };

  if (loading && !selectedQuiz) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  // Quiz Detail View
  if (selectedQuiz) {
    return (
      <StudentLayout>
        <div className="p-6 md:p-8">
          <Button variant="ghost" onClick={goBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{selectedQuiz.title}</h1>
            {selectedQuiz.description && (
              <p className="text-muted-foreground mt-1">{selectedQuiz.description}</p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No questions in this quiz yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {questions.map((question, index) => {
                const submission = submissions[question.id];
                const hasSubmitted = !!submission;

                return (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                        {hasSubmitted && (
                          <Badge variant={submission.is_correct ? 'default' : 'destructive'}>
                            {submission.is_correct ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Correct</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Incorrect</>
                            )}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {question.reading_passage && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm font-medium mb-2">Reading Passage:</p>
                          <p className="text-sm whitespace-pre-wrap">{question.reading_passage}</p>
                        </div>
                      )}

                      <p className="font-medium">{question.question_text}</p>

                      <RadioGroup
                        value={hasSubmitted ? submission.selected_answer : currentAnswers[question.id] || ''}
                        onValueChange={(value) => handleAnswerChange(question.id, value)}
                        disabled={hasSubmitted}
                      >
                        {[
                          { value: 'A', label: question.option_a },
                          { value: 'B', label: question.option_b },
                          { value: 'C', label: question.option_c },
                          { value: 'D', label: question.option_d },
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                            <Label htmlFor={`${question.id}-${option.value}`}>
                              {option.value}. {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>

                      {!hasSubmitted && (
                        <Button 
                          onClick={() => handleSubmitAnswer(question)}
                          disabled={submitting || !currentAnswers[question.id]}
                        >
                          {submitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                          ) : (
                            'Submit Answer'
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </StudentLayout>
    );
  }

  // Quiz List View
  return (
    <StudentLayout>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Quizzes</h1>
          <p className="text-muted-foreground">Practice and test your knowledge</p>
        </div>

        {quizzes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No quizzes available yet</p>
              <p className="text-sm text-muted-foreground">Check back later for new quizzes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fetchQuizDetails(quiz)}>
                <CardHeader>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  {quiz.description && (
                    <CardDescription>{quiz.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Start Quiz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentQuizzes;
