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
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

const WEEKS = Array.from({ length: 15 }, (_, i) => `Week ${i + 1}`);
const COURSES = Array.from({ length: 16 }, (_, i) => `ENGL ${101 + i}`);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

interface LessonPlan {
  id: string;
  title: string;
  course: string | null;
  week: string | null;
  day: string | null;
  objectives: string | null;
  lesson_skill: string | null;
  aim_main: string | null;
  aim_subsidiary: string | null;
  lead_in_presentation: string | null;
  practice_exercises: string | null;
  productive_activities: string | null;
  reflection: string | null;
  content: string | null;
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
  const [lessonSkill, setLessonSkill] = useState('');
  const [aimMain, setAimMain] = useState('');
  const [aimSubsidiary, setAimSubsidiary] = useState('');
  const [objectives, setObjectives] = useState('');
  const [leadInPresentation, setLeadInPresentation] = useState('');
  const [practiceExercises, setPracticeExercises] = useState('');
  const [productiveActivities, setProductiveActivities] = useState('');
  const [reflection, setReflection] = useState('');
  const [content, setContent] = useState('');

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
      plan.objectives?.toLowerCase().includes(query) ||
      plan.lesson_skill?.toLowerCase().includes(query)
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
        lesson_skill: lessonSkill || null,
        aim_main: aimMain || null,
        aim_subsidiary: aimSubsidiary || null,
        objectives: objectives || null,
        lead_in_presentation: leadInPresentation || null,
        practice_exercises: practiceExercises || null,
        productive_activities: productiveActivities || null,
        reflection: reflection || null,
        content: content || null,
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
    setLessonSkill(plan.lesson_skill || '');
    setAimMain(plan.aim_main || '');
    setAimSubsidiary(plan.aim_subsidiary || '');
    setObjectives(plan.objectives || '');
    setLeadInPresentation(plan.lead_in_presentation || '');
    setPracticeExercises(plan.practice_exercises || '');
    setProductiveActivities(plan.productive_activities || '');
    setReflection(plan.reflection || '');
    setContent(plan.content || '');
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

  const downloadWord = async (plan: LessonPlan) => {
    const sections: Paragraph[] = [];

    // Title
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: plan.title, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    // Info line
    const infoLine = [plan.course, plan.week, plan.day].filter(Boolean).join(' | ');
    if (infoLine) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: infoLine, italics: true, size: 24 })],
          spacing: { after: 200 },
        })
      );
    }

    // Date
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `Created: ${format(parseISO(plan.created_at), 'MMMM d, yyyy')}`, color: '666666', size: 20 })],
        spacing: { after: 400 },
      })
    );

    const addSection = (title: string, content: string | null) => {
      if (content) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 24 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        );
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: content, size: 22 })],
            spacing: { after: 200 },
          })
        );
      }
    };

    addSection('Lesson Skill', plan.lesson_skill);
    addSection('Lesson Aim - Main', plan.aim_main);
    addSection('Lesson Aim - Subsidiary', plan.aim_subsidiary);
    addSection('Learning Objectives', plan.objectives);
    addSection('Lead-in & Presentation', plan.lead_in_presentation);
    addSection('Practice Exercises', plan.practice_exercises);
    addSection('Productive Activities', plan.productive_activities);
    addSection('Reflection', plan.reflection);
    addSection('Additional Content', plan.content);

    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${plan.title.replace(/[^a-z0-9]/gi, '_')}_${plan.day || 'plan'}.docx`;
    saveAs(blob, fileName);
    toast.success('Word document downloaded');
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCourse('');
    setWeek('');
    setDay('');
    setLessonSkill('');
    setAimMain('');
    setAimSubsidiary('');
    setObjectives('');
    setLeadInPresentation('');
    setPracticeExercises('');
    setProductiveActivities('');
    setReflection('');
    setContent('');
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <Label htmlFor="lessonSkill">Lesson Skill (What concept are you teaching?)</Label>
                  <Textarea
                    id="lessonSkill"
                    placeholder="Refer to the skill box in your textbook"
                    value={lessonSkill}
                    onChange={(e) => setLessonSkill(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aimMain">Lesson Aim - Main</Label>
                    <Textarea
                      id="aimMain"
                      placeholder="Overall purpose for your lesson"
                      value={aimMain}
                      onChange={(e) => setAimMain(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aimSubsidiary">Lesson Aim - Subsidiary</Label>
                    <Textarea
                      id="aimSubsidiary"
                      placeholder="Secondary aim"
                      value={aimSubsidiary}
                      onChange={(e) => setAimSubsidiary(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Lesson Objectives (By the end of this lesson, students will be able to:)</Label>
                  <Textarea
                    id="objectives"
                    placeholder="Use specific and measurable HOTs action words"
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadInPresentation">Lead-in & Presentation</Label>
                  <Textarea
                    id="leadInPresentation"
                    placeholder="How are you going to present the language point/skill?"
                    value={leadInPresentation}
                    onChange={(e) => setLeadInPresentation(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practiceExercises">Practice Exercises (Controlled and Semi-controlled)</Label>
                  <Textarea
                    id="practiceExercises"
                    placeholder="What practice exercises are students going to do?"
                    value={practiceExercises}
                    onChange={(e) => setPracticeExercises(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productiveActivities">Productive Activities</Label>
                  <Textarea
                    id="productiveActivities"
                    placeholder="What productive activities are students going to do?"
                    value={productiveActivities}
                    onChange={(e) => setProductiveActivities(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reflection">Reflection (POS/NEG)</Label>
                  <Textarea
                    id="reflection"
                    placeholder="Positive and negative reflections"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Additional Notes</Label>
                  <Textarea
                    id="content"
                    placeholder="Any additional notes or materials..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
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
            placeholder="Search lesson plans by title, course, week, day, skill..."
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
                      <Button variant="ghost" size="icon" onClick={() => downloadWord(plan)} title="Download Word">
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
                  {plan.lesson_skill && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Lesson Skill</p>
                      <p className="text-sm line-clamp-2">{plan.lesson_skill}</p>
                    </div>
                  )}
                  {plan.objectives && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Objectives</p>
                      <p className="text-sm line-clamp-2">{plan.objectives}</p>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Updated {format(parseISO(plan.updated_at), 'MMM d, yyyy')}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => downloadWord(plan)}
                      className="h-7 text-xs"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Word
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
