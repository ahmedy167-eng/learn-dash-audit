import { useState, useEffect } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { StudentLayout } from '@/components/student/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Download, FileText, Loader2, CheckCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface CAProject {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
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
  const [selectedProject, setSelectedProject] = useState<CAProject | null>(null);
  const [currentContent, setCurrentContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const handleDownloadPDF = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  const handleSubmitStage = async (projectId: string, stage: string) => {
    if (!student || !currentContent[stage]) {
      toast.error('Please enter your content before submitting');
      return;
    }

    setSubmitting(true);

    // Check if submission already exists
    const existingSubmission = submissions[projectId]?.find(s => s.stage === stage);

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
          project_id: projectId,
          student_id: student.id,
          stage,
          content: currentContent[stage],
        });

      if (error) {
        toast.error('Failed to submit');
      } else {
        toast.success('Submitted successfully');
        fetchProjects();
      }
    }

    setSubmitting(false);
  };

  const getStageSubmission = (projectId: string, stage: string) => {
    return submissions[projectId]?.find(s => s.stage === stage);
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
                      <Button onClick={() => handleDownloadPDF(project.pdf_url!)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
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
                        return (
                          <TabsTrigger key={stage.value} value={stage.value} className="relative">
                            {stage.label}
                            {submission && (
                              <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-500" />
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {stages.map((stage) => {
                      const submission = getStageSubmission(project.id, stage.value);
                      
                      return (
                        <TabsContent key={stage.value} value={stage.value} className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>{stage.label}</Label>
                            <Textarea
                              placeholder={`Enter your ${stage.label.toLowerCase()} here...`}
                              value={currentContent[stage.value] ?? submission?.content ?? ''}
                              onChange={(e) => setCurrentContent(prev => ({ ...prev, [stage.value]: e.target.value }))}
                              rows={6}
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
                              onClick={() => handleSubmitStage(project.id, stage.value)}
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
      </div>
    </StudentLayout>
  );
};

export default StudentCAProjects;
