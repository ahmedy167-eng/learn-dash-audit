import { useState, useEffect, useRef } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useStudentApi } from '@/hooks/useStudentApi';
import { StudentLayout } from '@/components/student/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
 import { ClipboardList, CheckCircle, XCircle, ArrowLeft, Loader2, Trophy, Lightbulb, FileText, Headphones, Play, Lock, Target } from 'lucide-react';
 import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  quiz_type?: string;
  reading_passage?: string | null;
  max_plays?: number | null;
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
  skill?: string | null;
}

interface QuizSubmission {
  id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
}

 interface QuizResult {
   question_id: string;
   question_text: string;
   reading_passage: string | null;
   option_a: string;
   option_b: string;
   option_c: string;
   option_d: string;
   selected_answer: string | null;
   correct_answer: string;
   is_correct: boolean;
   explanation: string | null;
   skill?: string | null;
 }
 
 interface QuizResultsData {
   complete: boolean;
   totalQuestions: number;
   correctCount?: number;
   incorrectCount?: number;
   scorePercentage?: number;
   answeredCount?: number;
   results?: QuizResult[];
   message?: string;
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
   const [showResults, setShowResults] = useState(false);
   const [quizResults, setQuizResults] = useState<QuizResultsData | null>(null);
   const [loadingResults, setLoadingResults] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [hasFinishedFirstPlay, setHasFinishedFirstPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    setAudioUrl(null);
    setPlayCount(0);
    setHasFinishedFirstPlay(false);
    setIsPlaying(false);

    // For listening quizzes, fetch signed audio URL
    if (quiz.quiz_type === 'listening') {
      setAudioLoading(true);
      const { data: audioData, error: audioErr } = await getData<{ signedUrl: string }>('quiz_audio', { quizId: quiz.id });
      if (audioErr || !audioData?.signedUrl) {
        toast.error('Failed to load audio');
      } else {
        setAudioUrl(audioData.signedUrl);
      }
      setAudioLoading(false);
    }

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
      // If student already submitted at least one, treat first play as already done (re-entry)
      if (Object.keys(submissionsMap).length > 0) {
        setHasFinishedFirstPlay(true);
      }
    }

    setLoading(false);
  };

  const handlePlayAudio = () => {
    if (!audioRef.current || !selectedQuiz) return;
    const max = selectedQuiz.max_plays;
    if (max != null && playCount >= max) {
      toast.error(`You have reached the listening limit (${max} ${max === 1 ? 'play' : 'plays'})`);
      return;
    }
    audioRef.current.play().catch(() => toast.error('Could not play audio'));
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
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setSelectedQuiz(null);
    setQuestions([]);
    setSubmissions({});
    setCurrentAnswers({});
     setShowResults(false);
     setQuizResults(null);
    setAudioUrl(null);
    setPlayCount(0);
    setHasFinishedFirstPlay(false);
    setIsPlaying(false);
  };
 
   // Check if all questions are answered
   const allQuestionsAnswered = questions.length > 0 && questions.every(q => !!submissions[q.id]);
 
   const handleViewResults = async () => {
     if (!selectedQuiz) return;
     
     setLoadingResults(true);
     const { data, error } = await getData<QuizResultsData>('quiz_results', { quizId: selectedQuiz.id });
     
     if (error) {
       toast.error('Failed to load results');
       setLoadingResults(false);
       return;
     }
     
     if (data && data.complete) {
       setQuizResults(data);
       setShowResults(true);
     } else {
       toast.error(data?.message || 'Complete all questions first');
     }
     setLoadingResults(false);
   };
 
   const getOptionLabel = (answer: string, question: QuizResult) => {
     switch (answer) {
       case 'A': return question.option_a;
       case 'B': return question.option_b;
       case 'C': return question.option_c;
       case 'D': return question.option_d;
       default: return '';
     }
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

   // Quiz Results View
  if (selectedQuiz) {
     if (showResults && quizResults) {
       return (
         <StudentLayout>
           <div className="p-6 md:p-8">
             <Button variant="ghost" onClick={() => setShowResults(false)} className="mb-4">
               <ArrowLeft className="mr-2 h-4 w-4" />
               Back to Questions
             </Button>
 
             {/* Score Summary Card */}
             <Card className="mb-6 border-primary/20">
               <CardHeader className="text-center pb-4">
                 <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                   <Trophy className="h-8 w-8 text-primary" />
                 </div>
                 <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
                 <CardDescription>{selectedQuiz.title}</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="text-center">
                   <p className="text-4xl font-bold text-primary mb-2">
                     {quizResults.correctCount}/{quizResults.totalQuestions}
                   </p>
                   <p className="text-muted-foreground">
                     Score: {quizResults.scorePercentage}%
                   </p>
                 </div>
                 <Progress value={quizResults.scorePercentage} className="h-3" />
                 <div className="flex justify-center gap-6 pt-2">
                   <div className="text-center">
                     <div className="flex items-center gap-1 text-green-600">
                       <CheckCircle className="h-4 w-4" />
                       <span className="font-semibold">{quizResults.correctCount}</span>
                     </div>
                     <p className="text-xs text-muted-foreground">Correct</p>
                   </div>
                   <div className="text-center">
                     <div className="flex items-center gap-1 text-red-600">
                       <XCircle className="h-4 w-4" />
                       <span className="font-semibold">{quizResults.incorrectCount}</span>
                     </div>
                     <p className="text-xs text-muted-foreground">Incorrect</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
 
             {/* Skill / Improvement Areas Breakdown (listening) */}
             {selectedQuiz.quiz_type === 'listening' && quizResults.results && quizResults.results.some(r => r.skill) && (() => {
               const skillLabels: Record<string, string> = {
                 main_idea: 'Main Idea',
                 detail: 'Detail',
                 inference: 'Inference',
                 vocabulary: 'Vocabulary',
                 purpose: 'Purpose / Tone',
               };
               const buckets = new Map<string, { correct: number; total: number }>();
               quizResults.results.forEach(r => {
                 const key = r.skill || 'other';
                 const b = buckets.get(key) || { correct: 0, total: 0 };
                 b.total += 1;
                 if (r.is_correct) b.correct += 1;
                 buckets.set(key, b);
               });
               const rows = Array.from(buckets.entries()).map(([k, v]) => ({
                 key: k,
                 label: skillLabels[k] || k,
                 correct: v.correct,
                 total: v.total,
                 pct: Math.round((v.correct / v.total) * 100),
               })).sort((a, b) => a.pct - b.pct);
               return (
                 <Card className="mb-6 border-purple-200 dark:border-purple-800">
                   <CardHeader className="pb-3">
                     <CardTitle className="text-base flex items-center gap-2">
                       <Target className="h-4 w-4 text-purple-600" /> Areas to improve
                     </CardTitle>
                     <CardDescription>Performance grouped by skill. Skills below 60% are flagged as focus areas.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-3">
                     {rows.map(row => (
                       <div key={row.key} className="space-y-1">
                         <div className="flex items-center justify-between text-sm">
                           <span className="font-medium">{row.label}</span>
                           <span className="flex items-center gap-2">
                             <span className="text-muted-foreground">{row.correct}/{row.total}</span>
                             <Badge variant={row.pct < 60 ? 'destructive' : row.pct < 80 ? 'secondary' : 'default'}>
                               {row.pct}%{row.pct < 60 ? ' · Focus' : ''}
                             </Badge>
                           </span>
                         </div>
                         <Progress value={row.pct} className="h-2" />
                       </div>
                     ))}
                   </CardContent>
                 </Card>
               );
             })()}

             {/* Question Results */}
             <div className="space-y-4">
               <h2 className="text-lg font-semibold">Question Review</h2>
               {quizResults.results?.map((result, index) => (
                 <Card key={result.question_id} className={result.is_correct ? 'border-green-200' : 'border-red-200'}>
                   <CardHeader className="pb-3">
                     <div className="flex items-start justify-between">
                       <CardTitle className="text-base">Question {index + 1}</CardTitle>
                       <Badge variant={result.is_correct ? 'default' : 'destructive'}>
                         {result.is_correct ? (
                           <><CheckCircle className="w-3 h-3 mr-1" /> Correct</>
                         ) : (
                           <><XCircle className="w-3 h-3 mr-1" /> Incorrect</>
                         )}
                       </Badge>
                     </div>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     {result.reading_passage && (
                       <div className="bg-muted/50 p-4 rounded-lg">
                         <p className="text-sm font-medium mb-2">Reading Passage:</p>
                         <p className="text-sm whitespace-pre-wrap">{result.reading_passage}</p>
                       </div>
                     )}
 
                     <p className="font-medium">{result.question_text}</p>
 
                     <div className="space-y-2">
                       {['A', 'B', 'C', 'D'].map((option) => {
                         const isSelected = result.selected_answer === option;
                         const isCorrect = result.correct_answer === option;
                         let className = 'p-3 rounded-lg border text-sm flex items-center justify-between';
                         
                         if (isCorrect) {
                           className += ' bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700';
                         } else if (isSelected && !isCorrect) {
                           className += ' bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700';
                         } else {
                           className += ' bg-muted/30 border-border';
                         }
                         
                         return (
                           <div key={option} className={className}>
                             <span>
                               <span className="font-semibold mr-2">{option}.</span>
                               {getOptionLabel(option, result)}
                             </span>
                             <div className="flex items-center gap-2">
                               {isSelected && (
                                 <Badge variant="outline" className="text-xs">Your answer</Badge>
                               )}
                               {isCorrect && (
                                 <CheckCircle className="h-4 w-4 text-green-600" />
                               )}
                             </div>
                           </div>
                         );
                       })}
                     </div>
 
                     {/* Explanation for incorrect answers */}
                     {!result.is_correct && result.explanation && (
                       <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                         <div className="flex items-start gap-2">
                           <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                           <div>
                             <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Explanation</p>
                             <p className="text-sm text-amber-700 dark:text-amber-300">{result.explanation}</p>
                           </div>
                         </div>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               ))}
             </div>
 
             <div className="mt-6">
               <Button onClick={goBack} variant="outline" className="w-full">
                 <ArrowLeft className="mr-2 h-4 w-4" />
                 Back to Quizzes
               </Button>
             </div>
           </div>
         </StudentLayout>
       );
     }
 
     // Quiz Questions View
    return (
      <StudentLayout>
        <div className="p-6 md:p-8">
          <Button variant="ghost" onClick={goBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {selectedQuiz.title}
              {selectedQuiz.quiz_type === 'reading' && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                  <FileText className="h-3 w-3 mr-1" /> Reading
                </Badge>
              )}
              {selectedQuiz.quiz_type === 'listening' && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
                  <Headphones className="h-3 w-3 mr-1" /> Listening
                </Badge>
              )}
            </h1>
            {selectedQuiz.description && (
              <p className="text-muted-foreground mt-1">{selectedQuiz.description}</p>
            )}
          </div>

          {selectedQuiz.quiz_type === 'reading' && selectedQuiz.reading_passage && (
            <Card className="mb-6 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <FileText className="h-4 w-4" /> Reading Passage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm md:text-base whitespace-pre-wrap font-serif leading-relaxed">
                  {selectedQuiz.reading_passage}
                </p>
              </CardContent>
            </Card>
          )}

          {selectedQuiz.quiz_type === 'listening' && (
            <Card className="mb-6 sticky top-2 z-10 bg-purple-50/70 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Headphones className="h-4 w-4" /> Listening Audio
                </CardTitle>
                <CardDescription>
                  {selectedQuiz.max_plays
                    ? `You can listen up to ${selectedQuiz.max_plays} ${selectedQuiz.max_plays === 1 ? 'time' : 'times'}.`
                    : 'You can replay the audio as many times as you want after the first full play.'}
                  {' '}Questions unlock when the first play finishes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {audioLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading audio...
                  </div>
                ) : audioUrl ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      controls
                      controlsList="nodownload noplaybackrate"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => {
                        setIsPlaying(false);
                        setPlayCount((c) => c + 1);
                        setHasFinishedFirstPlay(true);
                      }}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Plays used: <strong>{playCount}</strong>
                        {selectedQuiz.max_plays ? ` / ${selectedQuiz.max_plays}` : ''}
                      </span>
                      {!hasFinishedFirstPlay && !isPlaying && (
                        <Button size="sm" variant="secondary" onClick={handlePlayAudio}>
                          <Play className="h-3 w-3 mr-1" /> Start listening
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-destructive">Audio is not available.</p>
                )}
              </CardContent>
            </Card>
          )}

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
          ) : selectedQuiz.quiz_type === 'listening' && !hasFinishedFirstPlay ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Lock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">Questions are locked</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Listen to the audio above all the way through. Questions will appear once the first play finishes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
               {/* Done Button - Shows when all questions are answered */}
               {allQuestionsAnswered && (
                 <Card className="border-primary/50 bg-primary/5">
                   <CardContent className="flex flex-col items-center justify-center py-6">
                     <CheckCircle className="h-8 w-8 text-primary mb-2" />
                     <p className="text-lg font-semibold mb-1">All questions answered!</p>
                     <p className="text-sm text-muted-foreground mb-4">Click below to see your results</p>
                     <Button onClick={handleViewResults} disabled={loadingResults} size="lg">
                       {loadingResults ? (
                         <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Results...</>
                       ) : (
                         <><Trophy className="mr-2 h-4 w-4" /> View Results</>
                       )}
                     </Button>
                   </CardContent>
                 </Card>
               )}
 
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
                     {selectedQuiz?.quiz_type !== 'reading' && question.reading_passage && (
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
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    {quiz.quiz_type === 'listening' && (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200 shrink-0">
                        <Headphones className="h-3 w-3 mr-1" /> Listening
                      </Badge>
                    )}
                    {quiz.quiz_type === 'reading' && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 shrink-0">
                        <FileText className="h-3 w-3 mr-1" /> Reading
                      </Badge>
                    )}
                  </div>
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
