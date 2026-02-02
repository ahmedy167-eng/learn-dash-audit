import { useState, useEffect } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { StudentLayout } from '@/components/student/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FolderOpen, Download, FileText, Loader2, CheckCircle, MessageSquare, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface CAProject {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
  deadline_ideas: string | null;
  deadline_first_draft: string | null;
  deadline_second_draft: string | null;
  deadline_final_draft: string | null;
}

interface CASubmission {
  id: string;
  project_id: string;
  stage: string;
  content: string | null;
  feedback: string | null;
  submitted_at: string;
}

const stages = [
  { value: 'ideas', label: 'Ideas & Description' },
  { value: 'first_draft', label: 'First Draft' },
  { value: 'second_draft', label: 'Second Draft' },
  { value: 'final_draft', label: 'Final Draft' },
];

const StudentCAProjects = () => {
  const { student } = useStudentAuth();
  const [projects, setProjects] = useState<CAProject[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, CASubmission[]>>({});
  const [currentContent, setCurrentContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [lastSubmittedStage, setLastSubmittedStage] = useState<string | null>(null);
  const [lastSubmittedProject, setLastSubmittedProject] = useState<CAProject | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [student]);

  // Realtime subscription for live updates when admin uploads PDFs
  useEffect(() => {
    if (!student?.section_id) return;

    const channel = supabase
      .channel('ca-projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ca_projects',
          filter: `section_id=eq.${student.section_id}`
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [student?.section_id]);

  const fetchProjects = async () => {
    if (!student?.section_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('ca_projects')
      .select('*')
      .eq('section_id', student.section_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load CA projects');
    } else {
      setProjects(data || []);
      
      // Fetch submissions for all projects
      if (data && data.length > 0 && student) {
        const projectIds = data.map(p => p.id);
        const { data: submissionsData } = await supabase
          .from('ca_submissions')
          .select('*')
          .eq('student_id', student.id)
          .in('project_id', projectIds);

        const submissionsMap: Record<string, CASubmission[]> = {};
        submissionsData?.forEach(sub => {
          if (!submissionsMap[sub.project_id]) {
            submissionsMap[sub.project_id] = [];
          }
          submissionsMap[sub.project_id].push(sub);
        });
        setSubmissions(submissionsMap);
      }
    }
    setLoading(false);
  };

  const handleViewPDF = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  const handleDownloadPDF = async (pdfUrl: string, title: string) => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_');
      saveAs(blob, `CA_Project_${sanitizedTitle}.pdf`);
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleSubmitStage = async (project: CAProject, stage: string) => {
    if (!student || !currentContent[stage]) {
      toast.error('Please enter your content before submitting');
      return;
    }

    setSubmitting(true);

    // Check if submission already exists
    const existingSubmission = submissions[project.id]?.find(s => s.stage === stage);

    if (existingSubmission) {
      // Update existing
      const { error } = await supabase
        .from('ca_submissions')
        .update({ content: currentContent[stage] })
        .eq('id', existingSubmission.id);

      if (error) {
        toast.error('Failed to update submission');
      } else {
        toast.success('Submission updated successfully');
        fetchProjects();
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('ca_submissions')
        .insert({
          project_id: project.id,
          student_id: student.id,
          stage,
          content: currentContent[stage],
        });

      if (error) {
        toast.error('Failed to submit');
      } else {
        // Show success dialog
        setLastSubmittedStage(stage);
        setLastSubmittedProject(project);
        setSuccessDialogOpen(true);
        fetchProjects();
      }
    }

    setSubmitting(false);
  };

  const getStageSubmission = (projectId: string, stage: string) => {
    return submissions[projectId]?.find(s => s.stage === stage);
  };

  const getStageDeadline = (project: CAProject, stage: string): string | null => {
    switch (stage) {
      case 'ideas': return project.deadline_ideas;
      case 'first_draft': return project.deadline_first_draft;
      case 'second_draft': return project.deadline_second_draft;
      case 'final_draft': return project.deadline_final_draft;
      default: return null;
    }
  };

  const getNextStage = (current: string | null): string | null => {
    if (!current) return null;
    const order = ['ideas', 'first_draft', 'second_draft', 'final_draft'];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const getStageLabel = (stage: string | null): string => {
    if (!stage) return '';
    return stages.find(s => s.value === stage)?.label || stage;
  };

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysRemaining = differenceInDays(deadlineDate, now);

    if (daysRemaining < 0) {
      return { text: 'Overdue', className: 'text-red-500' };
    } else if (daysRemaining <= 3) {
      return { text: format(deadlineDate, 'MMM d'), className: 'text-yellow-500' };
    } else {
      return { text: format(deadlineDate, 'MMM d'), className: 'text-muted-foreground' };
    }
  };

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
          <h1 className="text-2xl font-bold text-foreground">CA Projects</h1>
          <p className="text-muted-foreground">View project requirements and submit your work</p>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No CA projects available yet</p>
              <p className="text-sm text-muted-foreground">Your teacher will add projects here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{project.title}</CardTitle>
                        {project.pdf_url && (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <FileText className="mr-1 h-3 w-3" />
                            PDF Available
                          </Badge>
                        )}
                      </div>
                      {project.description && (
                        <CardDescription className="mt-1">{project.description}</CardDescription>
                      )}
                    </div>
                    {project.pdf_url ? (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleViewPDF(project.pdf_url!)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View PDF
                        </Button>
                        <Button onClick={() => handleDownloadPDF(project.pdf_url!, project.title)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">No PDF yet</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="ideas" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      {stages.map((stage) => {
                        const submission = getStageSubmission(project.id, stage.value);
                        const deadline = getStageDeadline(project, stage.value);
                        const deadlineStatus = getDeadlineStatus(deadline);
                        
                        return (
                          <TabsTrigger key={stage.value} value={stage.value} className="relative flex flex-col gap-0.5 py-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs sm:text-sm">{stage.label.split(' ')[0]}</span>
                              {submission && (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                            {deadlineStatus && (
                              <span className={cn("text-[10px] flex items-center gap-0.5", deadlineStatus.className)}>
                                <Calendar className="h-2.5 w-2.5" />
                                {deadlineStatus.text}
                              </span>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {stages.map((stage) => {
                      const submission = getStageSubmission(project.id, stage.value);
                      const deadline = getStageDeadline(project, stage.value);
                      const deadlineStatus = getDeadlineStatus(deadline);
                      
                      return (
                        <TabsContent key={stage.value} value={stage.value} className="space-y-4 mt-4">
                          {deadline && (
                            <div className={cn(
                              "flex items-center gap-2 text-sm p-2 rounded-lg",
                              deadlineStatus?.className === 'text-red-500' ? 'bg-red-500/10' : 
                              deadlineStatus?.className === 'text-yellow-500' ? 'bg-yellow-500/10' : 'bg-muted/50'
                            )}>
                              <Calendar className="h-4 w-4" />
                              <span>
                                Deadline: <strong>{format(new Date(deadline), 'PPP')}</strong>
                                {deadlineStatus?.className === 'text-red-500' && ' (Overdue)'}
                              </span>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <Label>{stage.label}</Label>
                            <RichTextEditor
                              value={currentContent[stage.value] ?? submission?.content ?? ''}
                              onChange={(value) => setCurrentContent(prev => ({ ...prev, [stage.value]: value }))}
                              placeholder={`Enter your ${stage.label.toLowerCase()} here...`}
                            />
                          </div>

                          {submission?.feedback && (
                            <div className="bg-muted/50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">Teacher Feedback</span>
                              </div>
                              <p className="text-sm">{submission.feedback}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            {submission && (
                              <Badge variant="secondary">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Submitted
                              </Badge>
                            )}
                            <Button 
                              onClick={() => handleSubmitStage(project, stage.value)}
                              disabled={submitting}
                              className="ml-auto"
                            >
                              {submitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                              ) : submission ? (
                                'Update Submission'
                              ) : (
                                'Submit'
                              )}
                            </Button>
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Success Dialog */}
        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent className="text-center sm:max-w-md">
            <div className="flex flex-col items-center py-4">
              <div className="bg-green-100 p-4 rounded-full mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <DialogTitle className="text-2xl mb-2">Well Done! 🎉</DialogTitle>
              <DialogDescription className="text-base">
                You've successfully submitted your {getStageLabel(lastSubmittedStage)}.
              </DialogDescription>
              
              {lastSubmittedStage && getNextStage(lastSubmittedStage) && lastSubmittedProject && (
                <div className="mt-4 p-4 bg-primary/10 rounded-lg w-full">
                  <p className="font-medium">
                    Your next step: <span className="text-primary">{getStageLabel(getNextStage(lastSubmittedStage))}</span>
                  </p>
                  {getStageDeadline(lastSubmittedProject, getNextStage(lastSubmittedStage)!) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Due by: {format(new Date(getStageDeadline(lastSubmittedProject, getNextStage(lastSubmittedStage)!)!), 'PPP')}
                    </p>
                  )}
                </div>
              )}
              
              {lastSubmittedStage === 'final_draft' && (
                <p className="mt-4 text-lg font-bold text-green-600">
                  Congratulations! You've completed all stages! 🏆
                </p>
              )}
            </div>
            <Button onClick={() => setSuccessDialogOpen(false)} className="w-full">
              Continue
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
};

export default StudentCAProjects;
