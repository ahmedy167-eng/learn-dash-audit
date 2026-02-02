import { useEffect, useState, useRef } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Loader2, Plus, Pencil, Trash2, ClipboardList, Search, MessageSquare, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
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
  notes: string | null;
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
  
  // Comments dialog state
  const [commentDialogStudent, setCommentDialogStudent] = useState<Student | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Excel import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{full_name: string; student_id: string}[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .select('id, full_name, student_id, section_id, present_count, late_count, absent_count, notes')
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

  const openCommentDialog = (student: Student) => {
    setCommentDialogStudent(student);
    setEditingCommentText(student.notes || '');
  };

  const closeCommentDialog = () => {
    setCommentDialogStudent(null);
    setEditingCommentText('');
  };

  const saveComment = async () => {
    if (!commentDialogStudent) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .update({ notes: editingCommentText.trim() || null })
        .eq('id', commentDialogStudent.id);

      if (error) throw error;
      
      toast.success('Comment saved');
      closeCommentDialog();
      if (selectedSectionId) {
        fetchStudentsForSection(selectedSectionId);
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Failed to save comment');
    }
  };

  // Excel Download Template
  const downloadTemplate = () => {
    if (!selectedSection) {
      toast.error('Please select a section first');
      return;
    }
    
    // Create workbook with headers
    const ws = XLSX.utils.aoa_to_sheet([
      ['Full Name', 'Student ID'],
      ['', ''], // Empty row as example
    ]);
    
    // Set column widths
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedSection.name.substring(0, 31)); // Excel sheet name max 31 chars
    
    // Download file
    XLSX.writeFile(wb, `${selectedSection.name}_Student_Template.xlsx`);
    toast.success('Template downloaded!');
  };

  // Handle Excel file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON (skip header row)
        const jsonData = XLSX.utils.sheet_to_json<{[key: string]: string}>(worksheet);
        
        // Map to our format (handle different column name variations)
        const students = jsonData.map(row => ({
          full_name: String(row['Full Name'] || row['full_name'] || row['Name'] || ''),
          student_id: String(row['Student ID'] || row['student_id'] || row['ID'] || ''),
        })).filter(s => s.full_name.trim() && s.student_id.trim());
        
        if (students.length === 0) {
          toast.error('No valid student data found. Make sure columns are "Full Name" and "Student ID"');
          return;
        }
        
        setImportPreview(students);
        setIsImportDialogOpen(true);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Failed to read Excel file. Please check the file format.');
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  // Confirm import students
  const confirmImport = async () => {
    if (!selectedSectionId || importPreview.length === 0) return;
    
    setIsImporting(true);
    
    try {
      // Prepare student records
      const studentsToInsert = importPreview.map(s => ({
        user_id: user?.id,
        full_name: s.full_name.trim(),
        student_id: s.student_id.trim(),
        section_id: selectedSectionId,
        present_count: 0,
        late_count: 0,
        absent_count: 0,
      }));
      
      const { error } = await supabase
        .from('students')
        .insert(studentsToInsert);
      
      if (error) throw error;
      
      toast.success(`Successfully imported ${importPreview.length} students!`);
      setIsImportDialogOpen(false);
      setImportPreview([]);
      fetchStudentsForSection(selectedSectionId);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import students');
    } finally {
      setIsImporting(false);
    }
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
                <div className="flex gap-2 flex-wrap">
                  {/* Download Template Button */}
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                  
                  {/* Import from Excel Button */}
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Excel
                  </Button>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  
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
                      <TableHead>Comments</TableHead>
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
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 relative"
                            onClick={() => openCommentDialog(student)}
                          >
                            <MessageSquare 
                              className={`h-4 w-4 ${student.notes ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} 
                            />
                            {student.notes && (
                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                            )}
                          </Button>
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

        {/* Comment Dialog */}
        <Dialog open={!!commentDialogStudent} onOpenChange={(open) => !open && closeCommentDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Comments for {commentDialogStudent?.full_name}</DialogTitle>
              <DialogDescription>
                Add or edit comments for this student
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={editingCommentText}
              onChange={(e) => setEditingCommentText(e.target.value)}
              placeholder="Enter comments..."
              className="min-h-[120px]"
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={closeCommentDialog}>
                Cancel
              </Button>
              <Button onClick={saveComment}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Preview Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Import Students Preview
              </DialogTitle>
              <DialogDescription>
                Review the students to be added to {selectedSection?.name}. 
                These students will use their Full Name and Student ID to login.
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Student ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.map((student, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.student_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">
                  {importPreview.length} student(s) will be added
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmImport} disabled={isImporting}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import All
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
