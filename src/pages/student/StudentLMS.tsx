import { useState, useEffect } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useStudentApi } from '@/hooks/useStudentApi';
import { StudentLayout } from '@/components/student/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Trophy, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LMSProgress {
  id: string;
  unit_name: string;
  points: number;
  is_completed: boolean;
  updated_at: string;
}

const StudentLMS = () => {
  const { student } = useStudentAuth();
  const { getData } = useStudentApi();
  const [progress, setProgress] = useState<LMSProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [student]);

  const fetchProgress = async () => {
    if (!student) {
      setLoading(false);
      return;
    }

    const { data, error } = await getData<LMSProgress[]>('lms_progress');

    if (error) {
      toast.error('Failed to load LMS progress');
    } else {
      setProgress(data || []);
    }
    setLoading(false);
  };

  const totalPoints = progress.reduce((sum, p) => sum + p.points, 0);
  const completedUnits = progress.filter(p => p.is_completed).length;
  const totalUnits = progress.length;
  const completionPercentage = totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0;

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">LMS Updates</h1>
          <p className="text-muted-foreground">Track your learning progress and achievements</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPoints}</div>
              <p className="text-xs text-muted-foreground">Points earned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Units Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedUnits} / {totalUnits}</div>
              <p className="text-xs text-muted-foreground">Units finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(completionPercentage)}%</div>
              <Progress value={completionPercentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Unit Progress List */}
        <h2 className="text-xl font-semibold mb-4">Unit Progress</h2>
        
        {progress.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No LMS progress recorded yet</p>
              <p className="text-sm text-muted-foreground">Your teacher will update your progress here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {progress.map((unit) => (
              <Card key={unit.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      unit.is_completed ? 'bg-green-500/10' : 'bg-muted'
                    }`}>
                      {unit.is_completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{unit.unit_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {unit.is_completed ? 'Completed' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">{unit.points}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                    <Badge variant={unit.is_completed ? 'default' : 'secondary'}>
                      {unit.is_completed ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentLMS;
