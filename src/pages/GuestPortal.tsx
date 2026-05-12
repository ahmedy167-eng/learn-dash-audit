import { useEffect, useState, useRef, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Loader2, LogOut, GraduationCap, ClipboardList, ArrowLeft, RotateCcw, Play, Pause, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  quiz_type: string;
  difficulty: string;
  has_audio: boolean | null;
  audio_script: string | null;
  transcript_visibility: 'never' | 'after_audio' | 'always' | null;
  max_plays: number | null;
  reading_passage: string | null;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  reading_passage: string | null;
  skill: string | null;
}

interface ResultRow {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  correct_answer: string;
  explanation: string | null;
}

export default function GuestPortal() {
  const { guest, loading, signOut, apiCall } = useGuestAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<{ score: number; total: number; results: ResultRow[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retaking, setRetaking] = useState(false);

  // audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [hasFinishedFirstPlay, setHasFinishedFirstPlay] = useState(false);

  useEffect(() => {
    if (!guest) return;
    setLoadingQuizzes(true);
    apiCall('list-quizzes')
      .then((d) => setQuizzes(d.quizzes || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingQuizzes(false));
  }, [guest, apiCall]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!guest) return <Navigate to="/guest-login" replace />;

  const openQuiz = async (q: Quiz) => {
    setSelected(q);
    setAnswers({});
    setResults(null);
    setPlayCount(0);
    setHasFinishedFirstPlay(false);
    setIsPlaying(false);
    setLoadingQ(true);
    try {
      const d = await apiCall('get-questions', { quizId: q.id });
      setQuestions(d.questions || []);
    } catch (e: any) {
      toast.error(e.message);
      setSelected(null);
    } finally {
      setLoadingQ(false);
    }
  };

  const back = () => {
    setSelected(null);
    setQuestions([]);
    setAnswers({});
    setResults(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  };

  const submit = async () => {
    if (!selected) return;
    if (Object.keys(answers).length < questions.length) {
      toast.error('Please answer all questions');
      return;
    }
    setSubmitting(true);
    try {
      const d = await apiCall('submit-quiz', { quizId: selected.id, answers });
      setResults(d);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const retake = async () => {
    if (!selected) return;
    setRetaking(true);
    try {
      await apiCall('retake-quiz', { quizId: selected.id });
      setAnswers({});
      setResults(null);
      setPlayCount(0);
      setHasFinishedFirstPlay(false);
      setIsPlaying(false);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRetaking(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !selected) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (selected.max_plays && playCount >= selected.max_plays) {
        toast.error(`Maximum ${selected.max_plays} plays reached`);
        return;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const showTranscript = useMemo(() => {
    if (!selected) return false;
    if (selected.transcript_visibility === 'always') return true;
    if (selected.transcript_visibility === 'after_audio' && hasFinishedFirstPlay) return true;
    return false;
  }, [selected, hasFinishedFirstPlay]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Guest Portal</p>
              <p className="text-xs text-muted-foreground">{guest.display_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/guest-login'); }}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {!selected ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" /> Available Quizzes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Pick a quiz to begin</p>
            </div>
            {loadingQuizzes ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : quizzes.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No quizzes available right now. Check back later.</CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {quizzes.map((q) => (
                  <Card key={q.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => openQuiz(q)}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{q.title}</CardTitle>
                        <Badge variant="outline" className="text-xs capitalize">{q.quiz_type}</Badge>
                      </div>
                      {q.description && <CardDescription className="line-clamp-2">{q.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary" className="text-xs capitalize">{q.difficulty}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={back} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Quizzes
            </Button>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>{selected.title}</CardTitle>
                {selected.description && <CardDescription>{selected.description}</CardDescription>}
              </CardHeader>
            </Card>

            {selected.reading_passage && (
              <Card className="mb-4">
                <CardHeader><CardTitle className="text-base">Reading Passage</CardTitle></CardHeader>
                <CardContent><div className="whitespace-pre-wrap text-sm">{selected.reading_passage}</div></CardContent>
              </Card>
            )}

            {selected.audio_url && (
              <Card className="mb-4">
                <CardHeader><CardTitle className="text-base">Audio</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <audio
                    ref={audioRef}
                    src={selected.audio_url}
                    onEnded={() => { setIsPlaying(false); setPlayCount((c) => c + 1); setHasFinishedFirstPlay(true); }}
                    onPause={() => setIsPlaying(false)}
                  />
                  <div className="flex items-center gap-3">
                    <Button onClick={togglePlay} variant="outline" size="sm">
                      {isPlaying ? <><Pause className="h-4 w-4 mr-1" />Pause</> : <><Play className="h-4 w-4 mr-1" />Play</>}
                    </Button>
                    {selected.max_plays && (
                      <span className="text-sm text-muted-foreground">Plays: {playCount} / {selected.max_plays}</span>
                    )}
                  </div>
                  {showTranscript && selected.audio_script && (
                    <div className="mt-3 p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">{selected.audio_script}</div>
                  )}
                </CardContent>
              </Card>
            )}

            {loadingQ ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : results ? (
              <Card>
                <CardHeader>
                  <CardTitle>Your Score: {results.score} / {results.total}</CardTitle>
                  <CardDescription>{Math.round((results.score / Math.max(results.total, 1)) * 100)}% correct</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {questions.map((q, i) => {
                    const r = results.results.find((x) => x.question_id === q.id);
                    if (!r) return null;
                    return (
                      <div key={q.id} className="border rounded-lg p-3">
                        <p className="font-medium text-sm mb-2">{i + 1}. {q.question_text}</p>
                        <div className="flex items-center gap-2 text-sm">
                          {r.is_correct ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          <span>Your answer: <strong>{r.selected_answer}</strong></span>
                          {!r.is_correct && <span className="text-muted-foreground">(Correct: {r.correct_answer})</span>}
                        </div>
                        {r.explanation && <p className="text-xs text-muted-foreground mt-2">{r.explanation}</p>}
                      </div>
                    );
                  })}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-1" />Back to Quizzes</Button>
                    <Button onClick={retake} disabled={retaking}>
                      {retaking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                      Retake Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader><CardTitle>Questions</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  {questions.map((q, i) => (
                    <div key={q.id} className="border rounded-lg p-4">
                      <p className="font-medium text-sm mb-3">{i + 1}. {q.question_text}</p>
                      <div className="space-y-2">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                          const txt = (q as any)[`option_${opt.toLowerCase()}`] as string;
                          const checked = answers[q.id] === opt;
                          return (
                            <label key={opt} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                              <input type="radio" name={q.id} value={opt} checked={checked}
                                onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} className="mt-1" />
                              <span className="text-sm"><strong>{opt}.</strong> {txt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <Button onClick={submit} disabled={submitting} className="w-full">
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit Quiz'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
