import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Search, UserX, UserCheck, Bell, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  section_number: string | null;
  course: string | null;
  is_active: boolean;
}

export function StudentManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const [noticeType, setNoticeType] = useState<string>('info');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, student_id, section_number, course, is_active')
        .order('full_name')
        .limit(100);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const toggleStudentStatus = async (student: Student) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: !student.is_active })
        .eq('id', student.id);

      if (error) throw error;

      toast.success(`Student ${student.is_active ? 'deactivated' : 'activated'}`);
      fetchStudents();
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student status');
    }
  };

  const openNoticeDialog = (student: Student) => {
    setSelectedStudent(student);
    setNoticeType('info');
    setNoticeTitle('');
    setNoticeContent('');
    setNoticeDialogOpen(true);
  };

  const sendNotice = async () => {
    if (!selectedStudent || !noticeTitle.trim() || !noticeContent.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('student_notices').insert({
        student_id: selectedStudent.id,
        posted_by: user.id,
        notice_type: noticeType,
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
      });

      if (error) throw error;

      toast.success('Notice sent to student');
      setNoticeDialogOpen(false);
    } catch (error) {
      console.error('Error sending notice:', error);
      toast.error('Failed to send notice');
    } finally {
      setSending(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" />
            Student Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[200px]">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? 'No students found' : 'No students'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredStudents.slice(0, 10).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {student.student_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={student.is_active ? 'default' : 'secondary'} className="text-xs">
                        {student.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openNoticeDialog(student)}
                        title="Send Notice"
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleStudentStatus(student)}
                        title={student.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {student.is_active ? (
                          <UserX className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredStudents.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    And {filteredStudents.length - 10} more...
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Post Notice Dialog */}
      <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Notice to {selectedStudent?.full_name}
            </DialogTitle>
            <DialogDescription>
              This notice will appear on the student's dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notice Type</Label>
              <Select value={noticeType} onValueChange={setNoticeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Information</SelectItem>
                  <SelectItem value="warning">⚠️ Warning</SelectItem>
                  <SelectItem value="attendance">📋 Attendance</SelectItem>
                  <SelectItem value="achievement">🏆 Achievement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="Notice title..."
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNoticeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={sendNotice} 
              disabled={!noticeTitle.trim() || !noticeContent.trim() || sending}
            >
              {sending ? 'Sending...' : 'Send Notice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
