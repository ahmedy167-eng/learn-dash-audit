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
import { BookOpen, Plus, Loader2, Trash2, Pencil, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';

const WEEKS = Array.from({ length: 15 }, (_, i) => `Week ${i + 1}`);
const COURSES = Array.from({ length: 16 }, (_, i) => `ENGL ${101 + i}`);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

interface LessonPlan {
  id: string;
  title: string;
  course: string | null;
  week: string | null;
  day: string | null;
  content: string | null;
  objectives: string | null;
  created_at: string;
  updated_at: string;
}

export default function LessonPlanPage() {
  const { user } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [week, setWeek] = useState('');
  const [day, setDay] = useState('');
  const [content, setContent] = useState('');
  const [objectives, setObjectives] = useState('');

  useEffect(() => {
    fetchLessonPlans();
  }, []);

  useEffect(() => {
    filterPlans();
  }, [searchQuery, lessonPlans]);

  const fetchLessonPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessonPlans(data || []);
      setFilteredPlans(data || []);
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
      toast.error('Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  };

  const filterPlans = () => {
    if (!searchQuery.trim()) {
      setFilteredPlans(lessonPlans);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = lessonPlans.filter(plan => 
      plan.title.toLowerCase().includes(query) ||
      plan.course?.toLowerCase().includes(query) ||
      plan.week?.toLowerCase().includes(query) ||
      plan.day?.toLowerCase().includes(query) ||
      plan.content?.toLowerCase().includes(query) ||
      plan.objectives?.toLowerCase().includes(query)
    );
    setFilteredPlans(filtered);
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
        day: day || null,
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
    setDay(plan.day || '');
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

  const downloadPDF = (plan: LessonPlan) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(plan.title, margin, yPosition);
    yPosition += 15;

    // Course, Week, Day info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const infoLine = [
      plan.course,
      plan.week,
      plan.day
    ].filter(Boolean).join(' | ');
    
    if (infoLine) {
      doc.text(infoLine, margin, yPosition);
      yPosition += 10;
    }

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Created: ${format(parseISO(plan.created_at), 'MMMM d, yyyy')}`, margin, yPosition);
    yPosition += 15;
    doc.setTextColor(0);

    // Objectives section
    if (plan.objectives) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Learning Objectives', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const objectivesLines = doc.splitTextToSize(plan.objectives, maxWidth);
      doc.text(objectivesLines, margin, yPosition);
      yPosition += objectivesLines.length * 6 + 10;
    }

    // Content section
    if (plan.content) {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Lesson Content', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(plan.content, maxWidth);
      
      // Handle multi-page content
      for (let i = 0; i < contentLines.length; i++) {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(contentLines[i], margin, yPosition);
        yPosition += 6;
      }
    }

    // Save the PDF
    const fileName = `${plan.title.replace(/[^a-z0-9]/gi, '_')}_${plan.day || 'plan'}.pdf`;
    doc.save(fileName);
    toast.success('PDF downloaded');
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCourse('');
    setWeek('');
    setDay('');
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                
                <div className="grid grid-cols-3 gap-4">
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
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select value={day} onValueChange={setDay}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
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

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lesson plans by title, course, week, day..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lesson Plans Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {searchQuery ? 'No matching lesson plans' : 'No lesson plans yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search' : 'Create your first lesson plan to get started'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Lesson Plan
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan) => (
              <Card key={plan.id} className="group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{plan.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {plan.course && <span className="mr-2">{plan.course}</span>}
                        {plan.week && <span>• {plan.week}</span>}
                        {plan.day && <span className="ml-2 text-primary font-medium">• {plan.day}</span>}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => downloadPDF(plan)} title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
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
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Updated {format(parseISO(plan.updated_at), 'MMM d, yyyy')}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => downloadPDF(plan)}
                      className="h-7 text-xs"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      PDF
                    </Button>
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
