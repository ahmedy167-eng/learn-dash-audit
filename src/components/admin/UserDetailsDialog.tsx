import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, BookOpen, ClipboardCheck, FileText, User } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
}

interface UserDetailsDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Section {
  id: string;
  name: string;
  section_number: string | null;
  course: string | null;
  room: string | null;
  building: string | null;
  teaching_days: string[] | null;
}

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  section_number: string | null;
  course: string | null;
}

interface Audit {
  id: string;
  date_of_teaching: string;
  section_number: string;
  course: string;
  week: string;
  teaching_mode: string;
}

interface LessonPlan {
  id: string;
  title: string;
  lesson_date: string | null;
  course: string | null;
  section_number: string | null;
  week: string | null;
}

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchUserData(user.id);
    }
  }, [user, open]);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      const [sectionsRes, studentsRes, auditsRes, lessonPlansRes] = await Promise.all([
        supabase.from('sections').select('id, name, section_number, course, room, building, teaching_days').eq('user_id', userId),
        supabase.from('students').select('id, full_name, student_id, section_number, course').eq('user_id', userId),
        supabase.from('virtual_audits').select('id, date_of_teaching, section_number, course, week, teaching_mode').eq('user_id', userId).order('date_of_teaching', { ascending: false }),
        supabase.from('lesson_plans').select('id, title, lesson_date, course, section_number, week').eq('user_id', userId).order('lesson_date', { ascending: false }),
      ]);

      setSections(sectionsRes.data || []);
      setStudents(studentsRes.data || []);
      setAudits(auditsRes.data || []);
      setLessonPlans(lessonPlansRes.data || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {user.full_name || 'No name'} 
            <span className="text-muted-foreground font-normal text-sm">({user.email})</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="audits">Audits</TabsTrigger>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="overview" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sections</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{sections.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{students.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Audits</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{audits.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lesson Plans</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{lessonPlans.length}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{user.full_name || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sections" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sections ({sections.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-4 text-muted-foreground">Loading...</p>
                  ) : sections.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No sections found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Section #</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sections.map((section) => (
                          <TableRow key={section.id}>
                            <TableCell className="font-medium">{section.name}</TableCell>
                            <TableCell>{section.section_number || '-'}</TableCell>
                            <TableCell>{section.course || '-'}</TableCell>
                            <TableCell>{section.room ? `${section.building || ''} ${section.room}`.trim() : '-'}</TableCell>
                            <TableCell>{section.teaching_days?.join(', ') || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Students ({students.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-4 text-muted-foreground">Loading...</p>
                  ) : students.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No students found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Course</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.full_name}</TableCell>
                            <TableCell>{student.student_id}</TableCell>
                            <TableCell>{student.section_number || '-'}</TableCell>
                            <TableCell>{student.course || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audits" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Virtual Audits ({audits.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-4 text-muted-foreground">Loading...</p>
                  ) : audits.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No audits found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead>Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audits.map((audit) => (
                          <TableRow key={audit.id}>
                            <TableCell className="font-medium">{audit.date_of_teaching}</TableCell>
                            <TableCell>{audit.section_number}</TableCell>
                            <TableCell>{audit.course}</TableCell>
                            <TableCell>{audit.week}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{audit.teaching_mode}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lessons" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lesson Plans ({lessonPlans.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-4 text-muted-foreground">Loading...</p>
                  ) : lessonPlans.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No lesson plans found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Week</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lessonPlans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.title}</TableCell>
                            <TableCell>{plan.lesson_date || '-'}</TableCell>
                            <TableCell>{plan.course || '-'}</TableCell>
                            <TableCell>{plan.section_number || '-'}</TableCell>
                            <TableCell>{plan.week || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
