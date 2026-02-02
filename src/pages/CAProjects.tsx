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
import { Plus, Trash2, Edit, FolderOpen, Upload, Download, Loader2, MessageSquare, FileText } from 'lucide-react';
import { toast } from 'sonner';

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
    full_name: string;
    student_id: string;
  };
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
  const [editingProject, setEditingProject] = useState<CAProject | null>(null);
  
  // Feedback states
  const [selectedSubmission, setSelectedSubmission] = useState<CASubmission | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

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
      .select('*, students(full_name, student_id)')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });

    if (error) {
      toast.error('Failed to load submissions');
    } else {
      setSubmissions(data || []);
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
    setEditingProject(null);
  };

  const openEditProject = (project: CAProject) => {
    setEditingProject(project);
    setFormTitle(project.title);
    setFormDescription(project.description || '');
    setFormSectionId(project.section_id);
    setDialogOpen(true);
  };

  const selectProject = (project: CAProject) => {
    setSelectedProject(project);
    fetchSubmissions(project.id);
  };

  const openFeedback = (submission: CASubmission) => {
    setSelectedSubmission(submission);
    setFeedbackText(submission.feedback || '');
    setFeedbackDialogOpen(true);
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Update project details' : 'Create a new CA project'}
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
            ) : submissions.length === 0 ? (
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
                                  <p className="whitespace-pre-wrap">{submission.content}</p>
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
