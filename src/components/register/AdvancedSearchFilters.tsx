import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, X, Bell, Eye } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  section_number: string | null;
  course: string | null;
  present_count: number;
  late_count: number;
  absent_count: number;
}

interface Section {
  id: string;
  name: string;
  section_number: string | null;
  course: string | null;
}

interface AdvancedSearchFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  sections: Section[];
  onViewStudent: (student: Student) => void;
  onPostNotice: (student: Student) => void;
}

export function AdvancedSearchFilters({
  open,
  onOpenChange,
  students,
  sections,
  onViewStudent,
  onPostNotice,
}: AdvancedSearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [minAbsence, setMinAbsence] = useState('');
  const [maxAbsence, setMaxAbsence] = useState('');

  const calculateAbsencePercentage = (student: Student) => {
    const totalAbsents = (student.absent_count || 0) + Math.floor((student.late_count || 0) / 2);
    return totalAbsents * 0.25;
  };

  const uniqueCourses = [...new Set(students.map(s => s.course).filter(Boolean))];

  const filteredStudents = students.filter(student => {
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!student.full_name.toLowerCase().includes(query) && 
          !student.student_id.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Section filter
    if (sectionFilter !== 'all' && student.section_number !== sectionFilter) {
      return false;
    }

    // Course filter
    if (courseFilter !== 'all' && student.course !== courseFilter) {
      return false;
    }

    // Absence percentage filter
    const absencePercent = calculateAbsencePercentage(student);
    if (minAbsence && absencePercent < parseFloat(minAbsence)) {
      return false;
    }
    if (maxAbsence && absencePercent > parseFloat(maxAbsence)) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSectionFilter('all');
    setCourseFilter('all');
    setMinAbsence('');
    setMaxAbsence('');
  };

  const uniqueSections = [...new Set(students.map(s => s.section_number).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Section</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {uniqueSections.map(section => (
                    <SelectItem key={section} value={section!}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {uniqueCourses.map(course => (
                    <SelectItem key={course} value={course!}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Min Absence %</Label>
              <Input
                type="number"
                placeholder="0"
                value={minAbsence}
                onChange={(e) => setMinAbsence(e.target.value)}
                min="0"
                step="0.25"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Max Absence %</Label>
              <Input
                type="number"
                placeholder="100"
                value={maxAbsence}
                onChange={(e) => setMaxAbsence(e.target.value)}
                min="0"
                step="0.25"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filteredStudents.length} students found
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Results Table */}
        <ScrollArea className="flex-1 border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Absence %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No students found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.student_id}</TableCell>
                    <TableCell>{student.section_number || '-'}</TableCell>
                    <TableCell>{student.course || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={calculateAbsencePercentage(student) >= 1 ? 'destructive' : 'secondary'}
                      >
                        {calculateAbsencePercentage(student).toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onViewStudent(student)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onPostNotice(student)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
