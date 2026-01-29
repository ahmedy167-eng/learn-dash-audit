import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Loader2, Plus, Pencil, Trash2, ClipboardList, Search } from 'lucide-react';
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

interface Section {
  id: string;
  name: string;
  section_number: string | null;
  course: string | null;
  category: string | null;
}

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  section_id: string | null;
  present_count: number;
  late_count: number;
  absent_count: number;
}

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSectionId = searchParams.get('section');
  
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state for adding students
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      fetchStudentsForSection(selectedSectionId);
    } else {
      setStudents([]);
    }
  }, [selectedSectionId]);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, section_number, course, category')
        .order('name');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForSection = async (sectionId: string) => {
    setStudentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, student_id, section_id, present_count, late_count, absent_count')
        .eq('section_id', sectionId)
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSectionChange = (sectionId: string) => {
    setSearchParams({ section: sectionId });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formName.trim() || !formStudentId.trim()) {
      toast.error('Full name and Student ID are required');
      return;
    }

    if (!selectedSectionId) {
      toast.error('Please select a section first');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({
            full_name: formName.trim(),
            student_id: formStudentId.trim(),
          })
          .eq('id', editingStudent.id);

        if (error) throw error;
        toast.success('Student updated successfully');
      } else {
        const { error } = await supabase
          .from('students')
          .insert([{
            user_id: user?.id,
            full_name: formName.trim(),
            student_id: formStudentId.trim(),
            section_id: selectedSectionId,
            present_count: 0,
            late_count: 0,
            absent_count: 0,
          }]);

        if (error) throw error;
        toast.success('Student added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchStudentsForSection(selectedSectionId);
    } catch (error: any) {
      console.error('Error saving student:', error);
      toast.error(error.message || 'Failed to save student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormStudentId('');
    setEditingStudent(null);
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.full_name);
    setFormStudentId(student.student_id);
    setIsDialogOpen(true);
  };

  const deleteStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Student removed from section');
      if (selectedSectionId) {
        fetchStudentsForSection(selectedSectionId);
      }
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
      if (selectedSectionId) {
        fetchStudentsForSection(selectedSectionId);
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const calculateAbsencePercentage = (student: Student) => {
    const totalAbsents = (student.absent_count || 0) + Math.floor((student.late_count || 0) / 2);
    return (totalAbsents * 0.25).toFixed(2);
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);

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
            <h1 className="text-2xl font-bold text-foreground">Class Register</h1>
            <p className="text-muted-foreground">Select a section to view and manage student attendance</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/sections')}>
            Manage Sections
          </Button>
        </div>

        {/* Section Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Select Section
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading sections...</span>
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No sections found. Create a section first to manage students.</p>
                <Button onClick={() => navigate('/sections/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Section
                </Button>
              </div>
            ) : (
              <Select value={selectedSectionId || ''} onValueChange={handleSectionChange}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue placeholder="Select a section..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name} {section.section_number ? `(${section.section_number})` : ''} 
                      {section.course ? ` - ${section.course}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Students Register */}
        {selectedSectionId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {selectedSection?.name} Register
                  </CardTitle>
                  <CardDescription>
                    {selectedSection?.course && <span>{selectedSection.course}</span>}
                    {selectedSection?.category && (
                      <Badge variant="secondary" className="ml-2">{selectedSection.category}</Badge>
                    )}
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddStudent} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          placeholder="Enter student's full name"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID *</Label>
                        <Input
                          id="studentId"
                          placeholder="Enter student ID"
                          value={formStudentId}
                          onChange={(e) => setFormStudentId(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => {
                          setIsDialogOpen(false);
                          resetForm();
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingStudent ? 'Update' : 'Add Student'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative max-w-md mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {studentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No students in this section</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try a different search term' : 'Add students to start tracking attendance'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Absence %</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>{student.student_id}</TableCell>
                        <TableCell>
                          <Select
                            onValueChange={(value) => updateAttendance(student.id, value as 'present' | 'late' | 'absent')}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue placeholder="Mark..." />
                            </SelectTrigger>
                            <SelectContent>
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
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Student</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {student.full_name} from this section? This will delete the student record.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteStudent(student.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
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
        )}
      </div>
    </DashboardLayout>
  );
}
