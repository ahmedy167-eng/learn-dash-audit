import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Trash2, Edit, FolderOpen, Upload, Download, Loader2, MessageSquare, FileText, CalendarIcon, CheckCircle, Clock, Users, Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';

interface Section {
  id: string;
  name: string;
  section_number: string | null;
}

interface CAProject {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
  created_at: string;
  deadline_ideas: string | null;
  deadline_first_draft: string | null;
  deadline_second_draft: string | null;
  deadline_final_draft: string | null;
  sections?: Section;
}

interface CASubmission {
  id: string;
  project_id: string;
  student_id: string;
  stage: string;
  content: string | null;
  feedback: string | null;
  submitted_at: string;
  students?: {
    id: string;
    full_name: string;
    student_id: string;
  };
}

interface Student {
  id: string;
  full_name: string;
  student_id: string;
}

const stages = [
  { value: 'ideas', label: 'Ideas & Description' },
  { value: 'first_draft', label: 'First Draft' },
  { value: 'second_draft', label: 'Second Draft' },
  { value: 'final_draft', label: 'Final Draft' },
];

const CAProjects = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [projects, setProjects] = useState<CAProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<CAProject | null>(null);
  const [submissions, setSubmissions] = useState<CASubmission[]>([]);
  const [sectionStudents, setSectionStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);
  const [uploadTargetProjectId, setUploadTargetProjectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formDeadlineIdeas, setFormDeadlineIdeas] = useState<Date | undefined>();
  const [formDeadlineFirstDraft, setFormDeadlineFirstDraft] = useState<Date | undefined>();
  const [formDeadlineSecondDraft, setFormDeadlineSecondDraft] = useState<Date | undefined>();
  const [formDeadlineFinalDraft, setFormDeadlineFinalDraft] = useState<Date | undefined>();
  const [editingProject, setEditingProject] = useState<CAProject | null>(null);
  
  // Feedback states
  const [selectedSubmission, setSelectedSubmission] = useState<CASubmission | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Progress dialog states
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentProgress, setSelectedStudentProgress] = useState<Student | null>(null);

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

    // Fetch projects
    const { data: projectsData, error } = await supabase
      .from('ca_projects')
      .select('*, sections(id, name, section_number)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load projects');
    } else {
      setProjects(projectsData || []);
    }
    setLoading(false);
  };

  const fetchSubmissions = async (projectId: string) => {
    const { data, error } = await supabase
      .from('ca_submissions')
      .select('*, students(id, full_name, student_id)')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });

    if (error) {
      toast.error('Failed to load submissions');
    } else {
      setSubmissions(data || []);
    }
  };

  const fetchSectionStudents = async (sectionId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, student_id')
      .eq('section_id', sectionId)
      .order('full_name');

    if (error) {
      console.error('Failed to load section students:', error);
    } else {
      setSectionStudents(data || []);
    }
  };

  const handleCreateProject = async () => {
    if (!user || !formTitle.trim() || !formSectionId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('ca_projects')
      .insert({
        user_id: user.id,
        section_id: formSectionId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        deadline_ideas: formDeadlineIdeas?.toISOString() || null,
        deadline_first_draft: formDeadlineFirstDraft?.toISOString() || null,
        deadline_second_draft: formDeadlineSecondDraft?.toISOString() || null,
        deadline_final_draft: formDeadlineFinalDraft?.toISOString() || null,
      });

    if (error) {
      toast.error('Failed to create project');
    } else {
      toast.success('Project created');
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !formTitle.trim() || !formSectionId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('ca_projects')
      .update({
        section_id: formSectionId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        deadline_ideas: formDeadlineIdeas?.toISOString() || null,
        deadline_first_draft: formDeadlineFirstDraft?.toISOString() || null,
        deadline_second_draft: formDeadlineSecondDraft?.toISOString() || null,
        deadline_final_draft: formDeadlineFinalDraft?.toISOString() || null,
      })
      .eq('id', editingProject.id);

    if (error) {
      toast.error('Failed to update project');
    } else {
      toast.success('Project updated');
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    const { error } = await supabase
      .from('ca_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      toast.error('Failed to delete project');
    } else {
      toast.success('Project deleted');
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setSubmissions([]);
        setSectionStudents([]);
      }
      fetchData();
    }
  };

  const handleUploadPDF = async (file: File) => {
    if (!uploadTargetProjectId) {
      toast.error('No project selected for upload');
      return;
    }

    if (!file.type.includes('pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploadingProjectId(uploadTargetProjectId);
    const fileName = `${uploadTargetProjectId}/${Date.now()}-${file.name}`;

    const { data, error: uploadError } = await supabase.storage
      .from('ca-project-pdfs')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload PDF');
      setUploadingProjectId(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('ca-project-pdfs')
      .getPublicUrl(data.path);

    const { error: updateError } = await supabase
      .from('ca_projects')
      .update({ pdf_url: urlData.publicUrl })
      .eq('id', uploadTargetProjectId);

    if (updateError) {
      toast.error('Failed to save PDF URL');
    } else {
      toast.success('PDF uploaded successfully! Students can now download it.');
      fetchData();
    }
    setUploadingProjectId(null);
    setUploadTargetProjectId(null);
  };

  const handleProvideFeedback = async () => {
    if (!selectedSubmission) return;

    const { error } = await supabase
      .from('ca_submissions')
      .update({ feedback: feedbackText.trim() || null })
      .eq('id', selectedSubmission.id);

    if (error) {
      toast.error('Failed to save feedback');
    } else {
      toast.success('Feedback saved');
      setFeedbackDialogOpen(false);
      setSelectedSubmission(null);
      setFeedbackText('');
      if (selectedProject) {
        fetchSubmissions(selectedProject.id);
      }
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormSectionId('');
    setFormDeadlineIdeas(undefined);
    setFormDeadlineFirstDraft(undefined);
    setFormDeadlineSecondDraft(undefined);
    setFormDeadlineFinalDraft(undefined);
    setEditingProject(null);
  };

  const openEditProject = (project: CAProject) => {
    setEditingProject(project);
    setFormTitle(project.title);
    setFormDescription(project.description || '');
    setFormSectionId(project.section_id);
    setFormDeadlineIdeas(project.deadline_ideas ? new Date(project.deadline_ideas) : undefined);
    setFormDeadlineFirstDraft(project.deadline_first_draft ? new Date(project.deadline_first_draft) : undefined);
    setFormDeadlineSecondDraft(project.deadline_second_draft ? new Date(project.deadline_second_draft) : undefined);
    setFormDeadlineFinalDraft(project.deadline_final_draft ? new Date(project.deadline_final_draft) : undefined);
    setDialogOpen(true);
  };

  const selectProject = (project: CAProject) => {
    setSelectedProject(project);
    fetchSubmissions(project.id);
    fetchSectionStudents(project.section_id);
  };

  const openFeedback = (submission: CASubmission) => {
    setSelectedSubmission(submission);
    setFeedbackText(submission.feedback || '');
    setFeedbackDialogOpen(true);
  };

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysRemaining = differenceInDays(deadlineDate, now);

    if (daysRemaining < 0) {
      return { text: 'Overdue', className: 'text-red-500 bg-red-500/10' };
    } else if (daysRemaining <= 3) {
      return { text: `${daysRemaining}d left`, className: 'text-yellow-500 bg-yellow-500/10' };
    } else {
      return { text: format(deadlineDate, 'MMM d'), className: 'text-muted-foreground bg-muted' };
    }
  };

  const getUniqueStudents = (): Student[] => {
    const studentMap = new Map<string, Student>();
    
    // Add students who have submitted
    submissions.forEach(sub => {
      if (sub.students && !studentMap.has(sub.students.id)) {
        studentMap.set(sub.students.id, {
          id: sub.students.id,
          full_name: sub.students.full_name,
          student_id: sub.students.student_id,
        });
      }
    });
    
    // Add all section students
    sectionStudents.forEach(student => {
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, student);
      }
    });
    
    return Array.from(studentMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  };

  const getFilteredStudents = () => {
    const students = getUniqueStudents();
    if (!studentSearch.trim()) return students;
    
    const search = studentSearch.toLowerCase().trim();
    return students.filter(s => 
      s.full_name.toLowerCase().includes(search) ||
      s.student_id.toLowerCase().includes(search)
    );
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
            <h1 className="text-2xl font-bold text-foreground">CA Projects</h1>
            <p className="text-muted-foreground">Manage CA projects and review student submissions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Update project details and deadlines' : 'Create a new CA project with stage deadlines'}
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
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Project title" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Project description" />
                </div>
                
                {/* Stage Deadlines */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Stage Deadlines
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Ideas Deadline */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Ideas & Description</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDeadlineIdeas && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formDeadlineIdeas ? format(formDeadlineIdeas, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={formDeadlineIdeas} onSelect={setFormDeadlineIdeas} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* First Draft Deadline */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">First Draft</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDeadlineFirstDraft && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formDeadlineFirstDraft ? format(formDeadlineFirstDraft, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={formDeadlineFirstDraft} onSelect={setFormDeadlineFirstDraft} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Second Draft Deadline */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Second Draft</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDeadlineSecondDraft && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formDeadlineSecondDraft ? format(formDeadlineSecondDraft, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={formDeadlineSecondDraft} onSelect={setFormDeadlineSecondDraft} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Final Draft Deadline */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Final Draft</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDeadlineFinalDraft && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formDeadlineFinalDraft ? format(formDeadlineFinalDraft, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={formDeadlineFinalDraft} onSelect={setFormDeadlineFinalDraft} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                
                <Button onClick={editingProject ? handleUpdateProject : handleCreateProject} className="w-full">
                  {editingProject ? 'Update Project' : 'Create Project'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Single hidden file input at page level */}
        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadPDF(file);
            e.target.value = '';
          }}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Project List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Projects</h2>
            {projects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No projects yet</p>
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer transition-colors ${selectedProject?.id === project.id ? 'border-primary' : 'hover:border-primary/50'}`}
                  onClick={() => selectProject(project)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <CardDescription>
                          {project.sections?.name} {project.sections?.section_number && `(${project.sections.section_number})`}
                        </CardDescription>
                      </div>
                      {project.pdf_url && (
                        <Badge variant="secondary">
                          <FileText className="mr-1 h-3 w-3" /> PDF
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.description && <p className="text-sm text-muted-foreground mb-3">{project.description}</p>}
                    
                    {/* Deadline badges */}
                    {(project.deadline_ideas || project.deadline_first_draft || project.deadline_second_draft || project.deadline_final_draft) && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {stages.map(stage => {
                          const deadline = stage.value === 'ideas' ? project.deadline_ideas :
                            stage.value === 'first_draft' ? project.deadline_first_draft :
                            stage.value === 'second_draft' ? project.deadline_second_draft :
                            project.deadline_final_draft;
                          const status = getDeadlineStatus(deadline);
                          if (!status) return null;
                          return (
                            <Badge key={stage.value} variant="outline" className={cn("text-xs", status.className)}>
                              {stage.label.split(' ')[0]}: {status.text}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setUploadTargetProjectId(project.id);
                          fileInputRef.current?.click(); 
                        }}
                        disabled={uploadingProjectId === project.id}
                      >
                        {uploadingProjectId === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                        Upload PDF
                      </Button>
                      {project.pdf_url && (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); window.open(project.pdf_url!, '_blank'); }}>
                          <Download className="h-4 w-4 mr-1" />
                          View PDF
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditProject(project); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Submissions Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {selectedProject ? `Submissions: ${selectedProject.title}` : 'Select a Project'}
            </h2>

            {!selectedProject ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a project to view submissions</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Student Progress Overview - Trigger Button */}
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4 px-6 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all group"
                  onClick={() => setProgressDialogOpen(true)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">Student Progress Overview</p>
                      <p className="text-sm text-muted-foreground">{getUniqueStudents().length} students enrolled</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>

                {/* Student Progress Overview Dialog */}
                <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
                  <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-5 w-5 text-primary" />
                        Student Progress Overview
                      </DialogTitle>
                      <DialogDescription>
                        Track submission status for {selectedProject?.title}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or student ID..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Progress Table */}
                    <div className="flex-1 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="min-w-[200px]">Student</TableHead>
                            <TableHead className="min-w-[100px]">ID</TableHead>
                            {stages.map(s => (
                              <TableHead key={s.value} className="text-center min-w-[80px]">
                                {s.label.split(' ')[0]}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredStudents().map(student => (
                            <TableRow 
                              key={student.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedStudentProgress(student)}
                            >
                              <TableCell className="font-medium">{student.full_name}</TableCell>
                              <TableCell className="text-muted-foreground">{student.student_id}</TableCell>
                              {stages.map(s => {
                                const sub = submissions.find(sub => 
                                  sub.student_id === student.id && sub.stage === s.value
                                );
                                return (
                                  <TableCell key={s.value} className="text-center">
                                    {sub ? (
                                      sub.feedback ? 
                                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : 
                                        <Clock className="h-4 w-4 text-yellow-500 mx-auto" />
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {getFilteredStudents().length === 0 && (
                        <div className="py-12 text-center text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No students found matching "{studentSearch}"</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex gap-6 pt-3 border-t text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" /> Reviewed
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" /> Pending Review
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">—</span> Not Submitted
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Individual Student Progress Dialog */}
                <Dialog 
                  open={!!selectedStudentProgress} 
                  onOpenChange={(open) => !open && setSelectedStudentProgress(null)}
                >
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{selectedStudentProgress?.full_name}</DialogTitle>
                      <DialogDescription>ID: {selectedStudentProgress?.student_id}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3">
                      {stages.map(stage => {
                        const sub = submissions.find(s => 
                          s.student_id === selectedStudentProgress?.id && s.stage === stage.value
                        );
                        return (
                          <div key={stage.value} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="font-medium">{stage.label}</span>
                            {sub ? (
                              <Badge variant={sub.feedback ? 'default' : 'secondary'}>
                                {sub.feedback ? 'Reviewed' : 'Pending'}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Not Submitted</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Submissions by Stage */}
                {submissions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No submissions yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Tabs defaultValue="ideas" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      {stages.map((stage) => (
                        <TabsTrigger key={stage.value} value={stage.value}>
                          {stage.label.split(' ')[0]}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {stages.map((stage) => {
                      const stageSubmissions = submissions.filter(s => s.stage === stage.value);
                      
                      return (
                        <TabsContent key={stage.value} value={stage.value} className="space-y-4 mt-4">
                          {stageSubmissions.length === 0 ? (
                            <Card>
                              <CardContent className="py-8 text-center text-muted-foreground">
                                No submissions for {stage.label}
                              </CardContent>
                            </Card>
                          ) : (
                            stageSubmissions.map((submission) => (
                              <Card key={submission.id}>
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <CardTitle className="text-base">{submission.students?.full_name}</CardTitle>
                                      <CardDescription>ID: {submission.students?.student_id}</CardDescription>
                                    </div>
                                    <Badge variant={submission.feedback ? 'default' : 'secondary'}>
                                      {submission.feedback ? 'Reviewed' : 'Pending'}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {submission.content && (
                                    <div className="bg-muted/50 p-3 rounded text-sm">
                                      <div 
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(submission.content) }}
                                      />
                                    </div>
                                  )}
                                  {submission.feedback && (
                                    <div className="bg-primary/5 p-3 rounded text-sm border border-primary/20">
                                      <p className="font-medium mb-1 text-primary">Your Feedback:</p>
                                      <p>{submission.feedback}</p>
                                    </div>
                                  )}
                                  <Button variant="outline" size="sm" onClick={() => openFeedback(submission)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {submission.feedback ? 'Edit Feedback' : 'Add Feedback'}
                                  </Button>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </>
            )}
          </div>
        </div>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Provide Feedback</DialogTitle>
              <DialogDescription>
                Give feedback to {selectedSubmission?.students?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Feedback</Label>
                <Textarea 
                  value={feedbackText} 
                  onChange={(e) => setFeedbackText(e.target.value)} 
                  placeholder="Enter your feedback..."
                  rows={5}
                />
              </div>
              <Button onClick={handleProvideFeedback} className="w-full">
                Save Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CAProjects;
