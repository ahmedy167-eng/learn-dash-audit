import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  section_id: string | null;
  section_number: string | null;
  category: string | null;
  course: string | null;
  class: string | null;
  room: string | null;
  building: string | null;
  present_count: number;
  late_count: number;
  absent_count: number;
  created_at: string;
}

interface Section {
  id: string;
  name: string;
  section_number: string | null;
  course: string | null;
}

const CATEGORIES = ['Regular', 'Intensive', 'Evening', 'Weekend'];

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new student dialog
  const [formName, setFormName] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formCourse, setFormCourse] = useState('');
  const [formCategory, setFormCategory] = useState('Regular');

  useEffect(() => {
    fetchStudents();
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, section_number, course')
        .order('name');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formName.trim() || !formStudentId.trim()) {
      toast.error('Student name and ID are required');
      return;
    }

    setIsSubmitting(true);

    // Find the selected section to get section_number and course
    const selectedSection = sections.find(s => s.id === formSectionId);

    try {
      const { error } = await supabase
        .from('students')
        .insert([{
          user_id: user?.id,
          full_name: formName.trim(),
          student_id: formStudentId.trim(),
          class: formClass.trim() || null,
          section_id: formSectionId || null,
          section_number: selectedSection?.section_number || null,
          course: selectedSection?.course || formCourse.trim() || null,
          category: formCategory,
          present_count: 0,
          late_count: 0,
          absent_count: 0,
        }]);

      if (error) throw error;

      toast.success('Student added successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormStudentId('');
    setFormClass('');
    setFormSectionId('');
    setFormCourse('');
    setFormCategory('Regular');
  };

  const deleteStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  const updateAttendance = async (id: string, type: 'present' | 'late' | 'absent') => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    try {
      const updates: Record<string, number> = {};
      if (type === 'present') {
        updates.present_count = (student.present_count || 0) + 1;
      } else if (type === 'late') {
        updates.late_count = (student.late_count || 0) + 1;
      } else if (type === 'absent') {
        updates.absent_count = (student.absent_count || 0) + 1;
      }

      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Marked as ${type}`);
      fetchStudents();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const calculateAbsencePercentage = (student: Student) => {
    // 2 late = 1 absent, each total absent = 0.25%
    const totalAbsents = (student.absent_count || 0) + Math.floor((student.late_count || 0) / 2);
    return (totalAbsents * 0.25).toFixed(2);
  };

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground">Manage your students and track attendance</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStudent} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Student Name</Label>
                    <Input
                      id="studentName"
                      placeholder="Enter full name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      placeholder="Enter student ID"
                      value={formStudentId}
                      onChange={(e) => setFormStudentId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">Class</Label>
                    <Input
                      id="class"
                      placeholder="e.g., Grade 10"
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select value={formSectionId} onValueChange={setFormSectionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Input
                      id="course"
                      placeholder="e.g., Computer Science"
                      value={formCourse}
                      onChange={(e) => setFormCourse(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Student
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Students ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No students found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Start by adding your first student'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Absence %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.class || '-'}</TableCell>
                      <TableCell>{student.section_number || '-'}</TableCell>
                      <TableCell>{student.course || '-'}</TableCell>
                      <TableCell>
                        <Select
                          onValueChange={(value) => updateAttendance(student.id, value as 'present' | 'late' | 'absent')}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue placeholder="Mark..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="text-green-600">P: {student.present_count || 0}</span>
                          <span className="text-yellow-600">L: {student.late_count || 0}</span>
                          <span className="text-red-600">A: {student.absent_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={parseFloat(calculateAbsencePercentage(student)) >= 1 ? "destructive" : "secondary"}>
                          {calculateAbsencePercentage(student)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/register?edit=${student.id}`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {student.full_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteStudent(student.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
