import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const WEEKS = Array.from({ length: 15 }, (_, i) => `Week ${i + 1}`);
const COURSES = Array.from({ length: 16 }, (_, i) => `ENGL ${101 + i}`);

interface LessonPlan {
  id: string;
  title: string;
  course: string | null;
  week: string | null;
  content: string | null;
  objectives: string | null;
  created_at: string;
  updated_at: string;
}

export default function LessonPlanPage() {
  const { user } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [week, setWeek] = useState('');
  const [content, setContent] = useState('');
  const [objectives, setObjectives] = useState('');

  useEffect(() => {
    fetchLessonPlans();
  }, []);

  const fetchLessonPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessonPlans(data || []);
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
      toast.error('Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast.error('Please enter a title');
      return;
    }

    setIsSubmitting(true);

    try {
      const planData = {
        title,
        course: course || null,
        week: week || null,
        content: content || null,
        objectives: objectives || null,
        user_id: user?.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from('lesson_plans')
          .update(planData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Lesson plan updated');
      } else {
        const { error } = await supabase
          .from('lesson_plans')
          .insert([planData]);

        if (error) throw error;
        toast.success('Lesson plan created');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchLessonPlans();
    } catch (error: any) {
      console.error('Error saving lesson plan:', error);
      toast.error(error.message || 'Failed to save lesson plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const editPlan = (plan: LessonPlan) => {
    setEditingId(plan.id);
    setTitle(plan.title);
    setCourse(plan.course || '');
    setWeek(plan.week || '');
    setContent(plan.content || '');
    setObjectives(plan.objectives || '');
    setIsDialogOpen(true);
  };

  const deletePlan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lesson plan deleted');
      fetchLessonPlans();
    } catch (error) {
      console.error('Error deleting lesson plan:', error);
      toast.error('Failed to delete lesson plan');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCourse('');
    setWeek('');
    setContent('');
    setObjectives('');
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lesson Plans</h1>
            <p className="text-muted-foreground">Create and manage your lesson plans</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Lesson Plan' : 'Create New Lesson Plan'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter lesson plan title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Select value={course} onValueChange={setCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Week</Label>
                    <Select value={week} onValueChange={setWeek}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select week" />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKS.map((w) => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Learning Objectives</Label>
                  <Textarea
                    id="objectives"
                    placeholder="What should students learn from this lesson?"
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Lesson Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Describe the lesson activities, materials, and procedures..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? 'Update Plan' : 'Create Plan'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lesson Plans Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : lessonPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No lesson plans yet</h3>
              <p className="text-muted-foreground">Create your first lesson plan to get started</p>
              <Button className="mt-4" onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Lesson Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lessonPlans.map((plan) => (
              <Card key={plan.id} className="group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{plan.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {plan.course && <span className="mr-2">{plan.course}</span>}
                        {plan.week && <span>• {plan.week}</span>}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => editPlan(plan)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deletePlan(plan.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {plan.objectives && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Objectives</p>
                      <p className="text-sm line-clamp-2">{plan.objectives}</p>
                    </div>
                  )}
                  {plan.content && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Content</p>
                      <p className="text-sm line-clamp-3">{plan.content}</p>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Updated {format(parseISO(plan.updated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
