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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BookOpen, Plus, Loader2, Trash2, Pencil, Download, Search, CalendarIcon, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';

const WEEKS = Array.from({ length: 15 }, (_, i) => `Week ${i + 1}`);
const COURSES = Array.from({ length: 16 }, (_, i) => `ENGL ${101 + i}`);

interface LessonPlan {
  id: string;
  title: string;
  course: string | null;
  week: string | null;
  day: string | null;
  section_number: string | null;
  building: string | null;
  room: string | null;
  lesson_date: string | null;
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

interface ValidationErrors {
  [key: string]: string;
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
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Form state
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [week, setWeek] = useState('');
  const [sectionNumber, setSectionNumber] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [lessonDate, setLessonDate] = useState<Date | undefined>(undefined);
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
      plan.section_number?.toLowerCase().includes(query) ||
      plan.building?.toLowerCase().includes(query) ||
      plan.room?.toLowerCase().includes(query) ||
      plan.objectives?.toLowerCase().includes(query) ||
      plan.lesson_skill?.toLowerCase().includes(query)
    );
    setFilteredPlans(filtered);
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!title.trim()) errors.title = 'Title is required';
    if (!course) errors.course = 'Please select a course';
    if (!week) errors.week = 'Please select a week';
    if (!sectionNumber.trim()) errors.sectionNumber = 'Section number is required';
    if (!building.trim()) errors.building = 'Building is required';
    if (!room.trim()) errors.room = 'Class room is required';
    if (!lessonDate) errors.lessonDate = 'Please select a lesson date';
    if (!lessonSkill.trim()) errors.lessonSkill = 'Lesson skill is required';
    if (!aimMain.trim()) errors.aimMain = 'Main aim is required';
    if (!aimSubsidiary.trim()) errors.aimSubsidiary = 'Subsidiary aim is required';
    if (!objectives.trim()) errors.objectives = 'Objectives are required';
    if (!leadInPresentation.trim()) errors.leadInPresentation = 'Lead-in & presentation is required';
    if (!practiceExercises.trim()) errors.practiceExercises = 'Practice exercises are required';
    if (!productiveActivities.trim()) errors.productiveActivities = 'Productive activities are required';
    if (!reflection.trim()) errors.reflection = 'Reflection is required';

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Show toast with first error
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const planData = {
        title,
        course: course || null,
        week: week || null,
        day: null,
        section_number: sectionNumber || null,
        building: building || null,
        room: room || null,
        lesson_date: lessonDate ? format(lessonDate, 'yyyy-MM-dd') : null,
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
        toast.success('Lesson plan saved successfully');
      } else {
        const { error } = await supabase
          .from('lesson_plans')
          .insert([planData]);

        if (error) throw error;
        toast.success('Lesson plan saved successfully');
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
    setSectionNumber(plan.section_number || '');
    setBuilding(plan.building || '');
    setRoom(plan.room || '');
    setLessonDate(plan.lesson_date ? parseISO(plan.lesson_date) : undefined);
    setLessonSkill(plan.lesson_skill || '');
    setAimMain(plan.aim_main || '');
    setAimSubsidiary(plan.aim_subsidiary || '');
    setObjectives(plan.objectives || '');
    setLeadInPresentation(plan.lead_in_presentation || '');
    setPracticeExercises(plan.practice_exercises || '');
    setProductiveActivities(plan.productive_activities || '');
    setReflection(plan.reflection || '');
    setContent(plan.content || '');
    setValidationErrors({});
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
    const dateStr = plan.lesson_date ? format(parseISO(plan.lesson_date), 'd/M/yyyy') : 'N/A';
    
    // Create border style for tables
    const tableBorder = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: '000000',
    };

    const createTableCell = (text: string, isHeader: boolean = false, width?: number) => {
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                bold: isHeader,
                size: 22,
              }),
            ],
          }),
        ],
        width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
        borders: {
          top: tableBorder,
          bottom: tableBorder,
          left: tableBorder,
          right: tableBorder,
        },
      });
    };

    // Header section
    const headerParagraph = new Paragraph({
      children: [
        new TextRun({
          text: 'LESSON PLAN',
          bold: true,
          size: 36,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    });

    const titleParagraph = new Paragraph({
      children: [
        new TextRun({
          text: `${plan.title} - ${dateStr}`,
          bold: true,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    });

    // Details table
    const detailsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell('Course', true, 30),
            createTableCell(plan.course || 'N/A', false, 70),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Week', true, 30),
            createTableCell(plan.week || 'N/A', false, 70),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Section', true, 30),
            createTableCell(plan.section_number || 'N/A', false, 70),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Building', true, 30),
            createTableCell(plan.building || 'N/A', false, 70),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Room', true, 30),
            createTableCell(plan.room || 'N/A', false, 70),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Date', true, 30),
            createTableCell(dateStr, false, 70),
          ],
        }),
      ],
    });

    // Spacer
    const spacer = new Paragraph({ spacing: { after: 300 } });

    // Content table
    const contentRows = [
      { label: 'Lesson Skill', value: plan.lesson_skill },
      { label: 'Aim (Main)', value: plan.aim_main },
      { label: 'Aim (Subsidiary)', value: plan.aim_subsidiary },
      { label: 'Objectives', value: plan.objectives },
      { label: 'Lead-in & Presentation', value: plan.lead_in_presentation },
      { label: 'Practice Exercises', value: plan.practice_exercises },
      { label: 'Productive Activities', value: plan.productive_activities },
      { label: 'Reflection', value: plan.reflection },
    ];

    if (plan.content) {
      contentRows.push({ label: 'Additional Notes', value: plan.content });
    }

    const contentTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: contentRows.map(row => 
        new TableRow({
          children: [
            createTableCell(row.label, true, 25),
            createTableCell(row.value || 'N/A', false, 75),
          ],
        })
      ),
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [headerParagraph, titleParagraph, detailsTable, spacer, contentTable],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const datePart = plan.lesson_date ? format(parseISO(plan.lesson_date), 'd-M-yyyy') : 'plan';
    const fileName = `${plan.title.replace(/[^a-z0-9]/gi, '_')}_${datePart}.docx`;
    saveAs(blob, fileName);
    toast.success('Word document downloaded');
  };

  const downloadPdf = (plan: LessonPlan) => {
    const dateStr = plan.lesson_date ? format(parseISO(plan.lesson_date), 'd/M/yyyy') : 'N/A';
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LESSON PLAN', doc.internal.pageSize.width / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`${plan.title} - ${dateStr}`, doc.internal.pageSize.width / 2, 30, { align: 'center' });

    // Details table
    const detailsData = [
      ['Course', plan.course || 'N/A'],
      ['Week', plan.week || 'N/A'],
      ['Section', plan.section_number || 'N/A'],
      ['Building', plan.building || 'N/A'],
      ['Room', plan.room || 'N/A'],
      ['Date', dateStr],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Field', 'Value']],
      body: detailsData,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // Content table
    const contentData = [
      ['Lesson Skill', plan.lesson_skill || 'N/A'],
      ['Aim (Main)', plan.aim_main || 'N/A'],
      ['Aim (Subsidiary)', plan.aim_subsidiary || 'N/A'],
      ['Objectives', plan.objectives || 'N/A'],
      ['Lead-in & Presentation', plan.lead_in_presentation || 'N/A'],
      ['Practice Exercises', plan.practice_exercises || 'N/A'],
      ['Productive Activities', plan.productive_activities || 'N/A'],
      ['Reflection', plan.reflection || 'N/A'],
    ];

    if (plan.content) {
      contentData.push(['Additional Notes', plan.content]);
    }

    // Get Y position after first table
    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    autoTable(doc, {
      startY: finalY + 10,
      head: [['Section', 'Content']],
      body: contentData,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3, fontSize: 10 },
    });

    const datePart = plan.lesson_date ? format(parseISO(plan.lesson_date), 'd-M-yyyy') : 'plan';
    const fileName = `${plan.title.replace(/[^a-z0-9]/gi, '_')}_${datePart}.pdf`;
    doc.save(fileName);
    toast.success('PDF downloaded');
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCourse('');
    setWeek('');
    setSectionNumber('');
    setBuilding('');
    setRoom('');
    setLessonDate(undefined);
    setLessonSkill('');
    setAimMain('');
    setAimSubsidiary('');
    setObjectives('');
    setLeadInPresentation('');
    setPracticeExercises('');
    setProductiveActivities('');
    setReflection('');
    setContent('');
    setValidationErrors({});
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const hasError = (field: string) => !!validationErrors[field];

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
                  <Label htmlFor="title" className="flex items-center gap-1">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter lesson plan title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={cn(hasError('title') && 'border-destructive')}
                  />
                  {hasError('title') && <p className="text-sm text-destructive">{validationErrors.title}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Course <span className="text-destructive">*</span>
                    </Label>
                    <Select value={course} onValueChange={setCourse}>
                      <SelectTrigger className={cn(hasError('course') && 'border-destructive')}>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasError('course') && <p className="text-sm text-destructive">{validationErrors.course}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Week <span className="text-destructive">*</span>
                    </Label>
                    <Select value={week} onValueChange={setWeek}>
                      <SelectTrigger className={cn(hasError('week') && 'border-destructive')}>
                        <SelectValue placeholder="Select week" />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKS.map((w) => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasError('week') && <p className="text-sm text-destructive">{validationErrors.week}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sectionNumber" className="flex items-center gap-1">
                      Section Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sectionNumber"
                      placeholder="e.g., 101"
                      value={sectionNumber}
                      onChange={(e) => setSectionNumber(e.target.value)}
                      className={cn(hasError('sectionNumber') && 'border-destructive')}
                    />
                    {hasError('sectionNumber') && <p className="text-sm text-destructive">{validationErrors.sectionNumber}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building" className="flex items-center gap-1">
                      Building <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="building"
                      placeholder="e.g., B1"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                      className={cn(hasError('building') && 'border-destructive')}
                    />
                    {hasError('building') && <p className="text-sm text-destructive">{validationErrors.building}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room" className="flex items-center gap-1">
                      Class Room <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="room"
                      placeholder="e.g., 204"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className={cn(hasError('room') && 'border-destructive')}
                    />
                    {hasError('room') && <p className="text-sm text-destructive">{validationErrors.room}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Lesson Date <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !lessonDate && "text-muted-foreground",
                          hasError('lessonDate') && 'border-destructive'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {lessonDate ? format(lessonDate, "d/M/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={lessonDate}
                        onSelect={setLessonDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {hasError('lessonDate') && <p className="text-sm text-destructive">{validationErrors.lessonDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lessonSkill" className="flex items-center gap-1">
                    Lesson Skill <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="lessonSkill"
                    placeholder="Refer to the skill box in your textbook"
                    value={lessonSkill}
                    onChange={(e) => setLessonSkill(e.target.value)}
                    rows={2}
                    className={cn(hasError('lessonSkill') && 'border-destructive')}
                  />
                  {hasError('lessonSkill') && <p className="text-sm text-destructive">{validationErrors.lessonSkill}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aimMain" className="flex items-center gap-1">
                      Lesson Aim - Main <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="aimMain"
                      placeholder="Overall purpose for your lesson"
                      value={aimMain}
                      onChange={(e) => setAimMain(e.target.value)}
                      rows={2}
                      className={cn(hasError('aimMain') && 'border-destructive')}
                    />
                    {hasError('aimMain') && <p className="text-sm text-destructive">{validationErrors.aimMain}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aimSubsidiary" className="flex items-center gap-1">
                      Lesson Aim - Subsidiary <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="aimSubsidiary"
                      placeholder="Secondary aim"
                      value={aimSubsidiary}
                      onChange={(e) => setAimSubsidiary(e.target.value)}
                      rows={2}
                      className={cn(hasError('aimSubsidiary') && 'border-destructive')}
                    />
                    {hasError('aimSubsidiary') && <p className="text-sm text-destructive">{validationErrors.aimSubsidiary}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives" className="flex items-center gap-1">
                    Lesson Objectives <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="objectives"
                    placeholder="Use specific and measurable HOTs action words"
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    rows={3}
                    className={cn(hasError('objectives') && 'border-destructive')}
                  />
                  {hasError('objectives') && <p className="text-sm text-destructive">{validationErrors.objectives}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadInPresentation" className="flex items-center gap-1">
                    Lead-in & Presentation <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="leadInPresentation"
                    placeholder="How are you going to present the language point/skill?"
                    value={leadInPresentation}
                    onChange={(e) => setLeadInPresentation(e.target.value)}
                    rows={3}
                    className={cn(hasError('leadInPresentation') && 'border-destructive')}
                  />
                  {hasError('leadInPresentation') && <p className="text-sm text-destructive">{validationErrors.leadInPresentation}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practiceExercises" className="flex items-center gap-1">
                    Practice Exercises <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="practiceExercises"
                    placeholder="What practice exercises are students going to do?"
                    value={practiceExercises}
                    onChange={(e) => setPracticeExercises(e.target.value)}
                    rows={3}
                    className={cn(hasError('practiceExercises') && 'border-destructive')}
                  />
                  {hasError('practiceExercises') && <p className="text-sm text-destructive">{validationErrors.practiceExercises}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productiveActivities" className="flex items-center gap-1">
                    Productive Activities <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="productiveActivities"
                    placeholder="What productive activities are students going to do?"
                    value={productiveActivities}
                    onChange={(e) => setProductiveActivities(e.target.value)}
                    rows={3}
                    className={cn(hasError('productiveActivities') && 'border-destructive')}
                  />
                  {hasError('productiveActivities') && <p className="text-sm text-destructive">{validationErrors.productiveActivities}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reflection" className="flex items-center gap-1">
                    Reflection (POS/NEG) <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reflection"
                    placeholder="Positive and negative reflections"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    rows={3}
                    className={cn(hasError('reflection') && 'border-destructive')}
                  />
                  {hasError('reflection') && <p className="text-sm text-destructive">{validationErrors.reflection}</p>}
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

                {/* Sticky Save Button */}
                <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t border-border -mx-6 px-6">
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Lesson Plan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lesson plans by title, course, week, section, building, room..."
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
                        {plan.lesson_date && <span className="ml-2 text-primary font-medium">• {format(parseISO(plan.lesson_date), 'd/M/yyyy')}</span>}
                      </CardDescription>
                      {(plan.section_number || plan.building || plan.room) && (
                        <CardDescription className="mt-1 text-xs">
                          {plan.section_number && <span>Sec {plan.section_number}</span>}
                          {plan.building && <span className="ml-2">• Bldg {plan.building}</span>}
                          {plan.room && <span className="ml-2">• Rm {plan.room}</span>}
                        </CardDescription>
                      )}
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
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadPdf(plan)}
                        className="h-7 text-xs"
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        PDF
                      </Button>
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
