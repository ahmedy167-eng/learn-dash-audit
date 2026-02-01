import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, BookOpen, Loader2, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  section_id: string | null;
  section_number: string | null;
}

interface LMSProgress {
  id: string;
  student_id: string;
  unit_name: string;
  points: number;
  is_completed: boolean;
  students?: {
    full_name: string;
    student_id: string;
  };
}

const LMSManagement = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [progress, setProgress] = useState<LMSProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [formStudentId, setFormStudentId] = useState('');
  const [formUnitName, setFormUnitName] = useState('');
  const [formPoints, setFormPoints] = useState('0');
  const [formIsCompleted, setFormIsCompleted] = useState(false);
  const [editingProgress, setEditingProgress] = useState<LMSProgress | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch students
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, full_name, student_id, section_id, section_number')
      .eq('user_id', user.id);
    setStudents(studentsData || []);

    // Fetch LMS progress with student info
    const { data: progressData, error } = await supabase
      .from('lms_progress')
      .select('*, students(full_name, student_id)')
      .eq('updated_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load LMS progress');
    } else {
      setProgress(progressData || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !formStudentId || !formUnitName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('lms_progress')
      .insert({
        student_id: formStudentId,
        unit_name: formUnitName.trim(),
        points: parseInt(formPoints) || 0,
        is_completed: formIsCompleted,
        updated_by: user.id,
      });

    if (error) {
      toast.error('Failed to add progress');
    } else {
      toast.success('Progress added successfully');
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleUpdate = async () => {
    if (!editingProgress || !formUnitName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase
      .from('lms_progress')
      .update({
        unit_name: formUnitName.trim(),
        points: parseInt(formPoints) || 0,
        is_completed: formIsCompleted,
      })
      .eq('id', editingProgress.id);

    if (error) {
      toast.error('Failed to update progress');
    } else {
      toast.success('Progress updated');
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this progress entry?')) return;

    const { error } = await supabase
      .from('lms_progress')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Progress deleted');
      fetchData();
    }
  };

  const resetForm = () => {
    setFormStudentId('');
    setFormUnitName('');
    setFormPoints('0');
    setFormIsCompleted(false);
    setEditingProgress(null);
  };

  const openEdit = (prog: LMSProgress) => {
    setEditingProgress(prog);
    setFormStudentId(prog.student_id);
    setFormUnitName(prog.unit_name);
    setFormPoints(prog.points.toString());
    setFormIsCompleted(prog.is_completed);
    setDialogOpen(true);
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
            <h1 className="text-2xl font-bold text-foreground">LMS Management</h1>
            <p className="text-muted-foreground">Track and update student learning progress</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Progress
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProgress ? 'Edit Progress' : 'Add Progress'}</DialogTitle>
                <DialogDescription>
                  {editingProgress ? 'Update student progress' : 'Record student learning progress'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Student *</Label>
                  <Select value={formStudentId} onValueChange={setFormStudentId} disabled={!!editingProgress}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} ({student.student_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit Name *</Label>
                  <Input value={formUnitName} onChange={(e) => setFormUnitName(e.target.value)} placeholder="e.g., Unit 1: Introduction" />
                </div>
                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input type="number" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} min="0" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={formIsCompleted} onCheckedChange={setFormIsCompleted} />
                  <Label>Completed</Label>
                </div>
                <Button onClick={editingProgress ? handleUpdate : handleCreate} className="w-full">
                  {editingProgress ? 'Update Progress' : 'Add Progress'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {progress.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No LMS progress recorded yet</p>
              <p className="text-sm text-muted-foreground">Add progress for your students</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Student Progress</CardTitle>
              <CardDescription>All LMS progress entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.map((prog) => (
                    <TableRow key={prog.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{prog.students?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{prog.students?.student_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{prog.unit_name}</TableCell>
                      <TableCell>{prog.points}</TableCell>
                      <TableCell>
                        <Badge variant={prog.is_completed ? 'default' : 'secondary'}>
                          {prog.is_completed ? (
                            <><CheckCircle className="mr-1 h-3 w-3" /> Complete</>
                          ) : (
                            <><Clock className="mr-1 h-3 w-3" /> Pending</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(prog)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(prog.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LMSManagement;
