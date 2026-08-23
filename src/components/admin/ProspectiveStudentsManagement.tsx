import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  RefreshCw,
  Upload,
  Download,
  Pencil,
  Trash2,
  Calendar,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import ExcelJS from 'exceljs';

interface ProspectiveStudent {
  id: string;
  full_name: string;
  student_id: string;
  email: string | null;
  track_number: string | null;
  academic_year: string;
  weeks: Record<string, string | null>;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}


const ACADEMIC_YEAR = '2026/2027';
const WEEK_NUMBERS = Array.from({ length: 15 }, (_, i) => String(i + 1));
const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Withdrawn', 'Enrolled'];
const WEEK_NONE = '__none__';
const WEEK_STATUS_OPTIONS = [WEEK_NONE, 'Pending', 'Present', 'Absent', 'Late', 'Excused', 'N/A'];

const WEEK_STATUS_COLORS: Record<string, string> = {
  Present: 'bg-green-100 text-green-800 hover:bg-green-200',
  Absent: 'bg-red-100 text-red-800 hover:bg-red-200',
  Late: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  Excused: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  Confirmed: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  'N/A': 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  Pending: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
};

const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'secondary',
  Confirmed: 'default',
  Enrolled: 'default',
  Withdrawn: 'destructive',
};

export function ProspectiveStudentsManagement() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<ProspectiveStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProspectiveStudent | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ProspectiveStudent | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formTrackNumber, setFormTrackNumber] = useState('');
  const [formStatus, setFormStatus] = useState('Pending');
  const [formNotes, setFormNotes] = useState('');
  const [formWeeks, setFormWeeks] = useState<Record<string, string>>({});

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospective_students')
        .select('*')
        .eq('academic_year', ACADEMIC_YEAR)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRecords(
        (data || []).map((r) => ({
          ...r,
          weeks: (r.weeks as Record<string, string | null>) || {},
        })) as ProspectiveStudent[]
      );
    } catch (error: any) {
      console.error('Error fetching prospective students:', error);
      toast.error(error.message || 'Failed to load prospective students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormStudentId('');
    setFormTrackNumber('');
    setFormStatus('Pending');
    setFormNotes('');
    setFormWeeks({});
    setEditingRecord(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (record: ProspectiveStudent) => {
    setEditingRecord(record);
    setFormName(record.full_name);
    setFormStudentId(record.student_id);
    setFormTrackNumber(record.track_number || '');
    setFormStatus(record.status);
    setFormNotes(record.notes || '');
    setFormWeeks(
      WEEK_NUMBERS.reduce((acc, week) => {
        acc[week] = record.weeks?.[week] || '';
        return acc;
      }, {} as Record<string, string>)
    );
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('You must be signed in to save records');
      return;
    }
    if (!formName.trim() || !formStudentId.trim()) {
      toast.error('Full name and student ID are required');
      return;
    }

    setIsSubmitting(true);

    const weeksPayload = WEEK_NUMBERS.reduce((acc, week) => {
      const value = formWeeks[week]?.trim();
      if (value) acc[week] = value;
      return acc;
    }, {} as Record<string, string>);

    const payload = {
      full_name: formName.trim(),
      student_id: formStudentId.trim(),
      track_number: formTrackNumber.trim() || null,
      academic_year: ACADEMIC_YEAR,
      status: formStatus,
      notes: formNotes.trim() || null,
      weeks: weeksPayload,
    };

    // Pre-check for duplicate student ID for this academic year
    const duplicate = records.find(
      (r) =>
        r.student_id.trim().toLowerCase() === payload.student_id.toLowerCase() &&
        r.id !== editingRecord?.id
    );
    if (duplicate) {
      setIsSubmitting(false);
      toast.error(
        `Student ID "${payload.student_id}" already exists (${duplicate.full_name}). Edit the existing record instead.`,
        { duration: 5000 }
      );
      return;
    }

    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('prospective_students')
          .update(payload)
          .eq('id', editingRecord.id);
        if (error) throw error;
        toast.success('Record updated');
      } else {
        const { error } = await supabase.from('prospective_students').insert({
          ...payload,
          created_by: user.id,
        });
        if (error) throw error;
        toast.success('Record added');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchRecords();
    } catch (error: any) {
      console.error('Error saving prospective student:', error);
      if (error.code === '23505' || error.message?.includes('unique constraint')) {
        toast.error(`Student ID "${payload.student_id}" already exists for 2026/2027. Edit the existing record instead.`, { duration: 5000 });
      } else {
        toast.error(error.message || 'Failed to save record');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    try {
      const { error } = await supabase
        .from('prospective_students')
        .delete()
        .eq('id', recordToDelete.id);
      if (error) throw error;
      toast.success('Record deleted');
      setRecordToDelete(null);
      fetchRecords();
    } catch (error: any) {
      console.error('Error deleting prospective student:', error);
      toast.error(error.message || 'Failed to delete record');
    }
  };

  const downloadTemplate = () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Prospective Students');
    const headers = ['Full Name', 'Student ID', 'Track Number', 'Status', 'Notes', ...WEEK_NUMBERS.map((w) => `Week ${w}`)];
    worksheet.addRow(headers);
    worksheet.addRow(['Example Student', 'STU001', 'Track A', 'Pending', 'Note here', ...WEEK_NUMBERS.map(() => '')]);

    headers.forEach((_, index) => {
      worksheet.getColumn(index + 1).width = index < 5 ? 22 : 10;
    });
    worksheet.getRow(1).font = { bold: true };

    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prospective_Students_${ACADEMIC_YEAR.replace('/', '_')}_Template.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        toast.error('No worksheet found in the Excel file');
        return;
      }

      const headerRow = worksheet.getRow(1);
      const headers: Record<string, number> = {};
      headerRow.eachCell((cell, colNumber) => {
        const value = String(cell.value || '').trim().toLowerCase();
        if (value) headers[value] = colNumber;
      });

      const fullNameCol = headers['full name'];
      const studentIdCol = headers['student id'];
      if (!fullNameCol || !studentIdCol) {
        toast.error('Could not find "Full Name" and "Student ID" columns');
        return;
      }

      const trackNumberCol = headers['track number'];
      const statusCol = headers['status'];
      const notesCol = headers['notes'];
      const weekCols: Record<string, number> = {};
      WEEK_NUMBERS.forEach((week) => {
        const key = `week ${week}`;
        if (headers[key]) weekCols[week] = headers[key];
      });

      const rowsToInsert: {
        full_name: string;
        student_id: string;
        track_number: string | null;
        status: string;
        notes: string | null;
        weeks: Record<string, string>;
        created_by: string;
        academic_year: string;
      }[] = [];
      const skippedRows: number[] = [];

      const existingIds = new Set(records.map((r) => r.student_id.trim().toLowerCase()));
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const fullName = String(row.getCell(fullNameCol).value || '').trim();
        const studentId = String(row.getCell(studentIdCol).value || '').trim();
        if (!fullName || !studentId) {
          skippedRows.push(rowNumber);
          return;
        }

        const normalizedId = studentId.toLowerCase();
        if (existingIds.has(normalizedId) || seenIds.has(normalizedId)) {
          duplicateIds.push(studentId);
          return;
        }
        seenIds.add(normalizedId);

        const weeks: Record<string, string> = {};
        Object.entries(weekCols).forEach(([week, col]) => {
          const value = String(row.getCell(col).value || '').trim();
          if (value) weeks[week] = value;
        });

        rowsToInsert.push({
          full_name: fullName,
          student_id: studentId,
          track_number: trackNumberCol ? String(row.getCell(trackNumberCol).value || '').trim() || null : null,
          status: statusCol ? String(row.getCell(statusCol).value || '').trim() || 'Pending' : 'Pending',
          notes: notesCol ? String(row.getCell(notesCol).value || '').trim() || null : null,
          weeks,
          created_by: user?.id as string,
          academic_year: ACADEMIC_YEAR,
        });
      });

      if (rowsToInsert.length === 0) {
        toast.error(
          duplicateIds.length > 0
            ? `Nothing to import — all ${duplicateIds.length} Student ID(s) already exist: ${duplicateIds.slice(0, 5).join(', ')}${duplicateIds.length > 5 ? '...' : ''}`
            : 'No valid student data found in the file',
          { duration: 6000 }
        );
        return;
      }

      const { error } = await supabase.from('prospective_students').insert(rowsToInsert);
      if (error) {
        if (error.message?.includes('unique constraint') || error.code === '23505') {
          toast.error('Import failed: some Student IDs already exist for 2026/2027');
        } else {
          throw error;
        }
        return;
      }

      const parts = [`Imported ${rowsToInsert.length} prospective students`];
      if (duplicateIds.length > 0) {
        parts.push(`skipped ${duplicateIds.length} duplicate(s): ${duplicateIds.slice(0, 5).join(', ')}${duplicateIds.length > 5 ? '...' : ''}`);
      }
      if (skippedRows.length > 0) {
        parts.push(`skipped ${skippedRows.length} empty row(s)`);
      }
      toast.success(parts.join(', '), { duration: 6000 });
      fetchRecords();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredRecords = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return records;
    return records.filter(
      (r) =>
        r.full_name.toLowerCase().includes(query) ||
        r.student_id.toLowerCase().includes(query) ||
        (r.email || '').toLowerCase().includes(query) ||
        (r.track_number || '').toLowerCase().includes(query)
    );
  }, [records, searchQuery]);

  const setWeekStatus = (week: string, value: string) => {
    setFormWeeks((prev) => ({ ...prev, [week]: value === WEEK_NONE ? '' : value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-5 w-5 text-primary" />
              2026/2027 Prospective Students
              <Badge variant="outline">{records.length}</Badge>
            </CardTitle>
            <CardDescription>
              Waitlist for the new academic year. Track each student by week and track number.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || !user}
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Import Excel
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openAddDialog} disabled={!user}>
              <Plus className="h-4 w-4 mr-1" />
              Add Student
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or track number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-10">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No prospective students</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'No records match your search' : 'Add the first student for 2026/2027'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Track Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Weeks 1-15</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium min-w-[150px]">{record.full_name}</TableCell>
                    <TableCell>{record.student_id}</TableCell>
                    <TableCell>{record.track_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANTS[record.status] || 'secondary'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 min-w-[240px]">
                        {WEEK_NUMBERS.map((week) => {
                          const status = record.weeks?.[week] || '';
                          const colorClass = status ? WEEK_STATUS_COLORS[status] || 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground';
                          return (
                            <div
                              key={week}
                              className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded text-[10px] font-medium ${colorClass}`}
                              title={`Week ${week}: ${status || 'No status'}`}
                            >
                              {week}
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {record.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setRecordToDelete(record)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Prospective Student' : 'Add Prospective Student'}</DialogTitle>
            <DialogDescription>
              Record a student for the 2026/2027 academic year. Track number and week-by-week status are optional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
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
                  disabled={!!editingRecord}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trackNumber">Track Number</Label>
                <Input
                  id="trackNumber"
                  placeholder="e.g., Track A"
                  value={formTrackNumber}
                  onChange={(e) => setFormTrackNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Week-by-Week Status</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {WEEK_NUMBERS.map((week) => (
                  <div key={week} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Week {week}</Label>
                    <Select value={formWeeks[week] || WEEK_NONE} onValueChange={(v) => setWeekStatus(week, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEK_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt === WEEK_NONE ? '-' : opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingRecord ? 'Save Changes' : 'Add Student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prospective Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the record for <strong>{recordToDelete?.full_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
