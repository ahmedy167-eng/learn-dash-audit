import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Loader2, CalendarIcon, History, Search, Pencil, FileText, FileDown, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CAMPUSES = ['Olaysha Female', 'Diriyah Female', 'Diriyah Male'];
const WEEKS = Array.from({ length: 15 }, (_, i) => `Week ${i + 1}`);
const TEACHING_MODES = ['Face to Face', 'Virtual'];
const COURSES = Array.from({ length: 16 }, (_, i) => `ENGL ${101 + i}`);
const BOOKS = [
  'Q:Skills Intro: Reading and Writing',
  'Q:Skills Intro: Listening and Speaking',
  'Q:Skills 1: Reading and Writing',
  'Q:Skills 1: Listening and Speaking',
  'Q:Skills 2: Reading and Writing',
  'Q:Skills 2: Listening and Speaking',
  'Q:Skills 3: Reading and Writing',
  'Q:Skills 3: Listening and Speaking',
  'Q:Skills 4: Reading and Writing',
  'Q:Skills 4: Listening and Speaking',
  'Q:Skills 5: Reading and Writing',
  'Q:Skills 5: Listening and Speaking',
  'Scientific Terminology',
  'CPM 1: Career Path Medical',
  'CPM 2: Career Path Medical',
  'CPM 3: Career Path Medical',
  'EFM: English for Medicine',
  'Revision',
  'First Week Material',
  'CA',
];
const UNITS = Array.from({ length: 15 }, (_, i) => `Unit ${i + 1}`);

interface Audit {
  id: string;
  teacher_name: string;
  elsd_id: string;
  campus: string;
  section_number: string;
  week: string;
  date_of_teaching: string;
  teaching_mode: string;
  course: string;
  book: string;
  unit: string;
  page: string | null;
  number_of_students: number | null;
  comments: string | null;
  created_at: string;
}

interface CoverAudit extends Audit {
  original_teacher_name: string;
}

type AuditType = 'virtual' | 'cover';

export default function VirtualAudit() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [coverAudits, setCoverAudits] = useState<CoverAudit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [loadingCoverAudits, setLoadingCoverAudits] = useState(true);
  
  // Audit type toggle
  const [auditType, setAuditType] = useState<AuditType>('virtual');
  
  // Search and edit state
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [teacherName, setTeacherName] = useState('');
  const [originalTeacherName, setOriginalTeacherName] = useState('');
  const [elsdId, setElsdId] = useState('');
  const [campus, setCampus] = useState('');
  const [sectionNumber, setSectionNumber] = useState('');
  const [week, setWeek] = useState('');
  const [dateOfTeaching, setDateOfTeaching] = useState<Date>();
  const [teachingMode, setTeachingMode] = useState('');
  const [course, setCourse] = useState('');
  const [book, setBook] = useState('');
  const [unit, setUnit] = useState('');
  const [page, setPage] = useState('');
  const [numberOfStudents, setNumberOfStudents] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchAudits();
    fetchCoverAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const { data, error } = await supabase
        .from('virtual_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudits(data || []);
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setLoadingAudits(false);
    }
  };

  const fetchCoverAudits = async () => {
    try {
      const { data, error } = await supabase
        .from('cover_class_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoverAudits(data || []);
    } catch (error) {
      console.error('Error fetching cover audits:', error);
    } finally {
      setLoadingCoverAudits(false);
    }
  };

  // Filter audits based on search query
  const filteredAudits = useMemo(() => {
    if (!searchQuery.trim()) return audits;
    const query = searchQuery.toLowerCase();
    return audits.filter(audit => 
      audit.teacher_name.toLowerCase().includes(query) ||
      audit.elsd_id.toLowerCase().includes(query) ||
      audit.campus.toLowerCase().includes(query) ||
      audit.section_number.toLowerCase().includes(query) ||
      audit.course.toLowerCase().includes(query) ||
      audit.week.toLowerCase().includes(query) ||
      audit.book.toLowerCase().includes(query) ||
      (audit.comments?.toLowerCase().includes(query) ?? false)
    );
  }, [audits, searchQuery]);

  const filteredCoverAudits = useMemo(() => {
    if (!searchQuery.trim()) return coverAudits;
    const query = searchQuery.toLowerCase();
    return coverAudits.filter(audit => 
      audit.teacher_name.toLowerCase().includes(query) ||
      audit.original_teacher_name.toLowerCase().includes(query) ||
      audit.elsd_id.toLowerCase().includes(query) ||
      audit.campus.toLowerCase().includes(query) ||
      audit.section_number.toLowerCase().includes(query) ||
      audit.course.toLowerCase().includes(query) ||
      audit.week.toLowerCase().includes(query) ||
      audit.book.toLowerCase().includes(query) ||
      (audit.comments?.toLowerCase().includes(query) ?? false)
    );
  }, [coverAudits, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacherName || !elsdId || !campus || !sectionNumber || !week || !dateOfTeaching || !teachingMode || !course || !book || !unit) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (auditType === 'cover' && !originalTeacherName) {
      toast.error('Please enter the original teacher name');
      return;
    }

    setIsLoading(true);

    try {
      const auditData = {
        user_id: user?.id,
        teacher_name: teacherName,
        elsd_id: elsdId,
        campus,
        section_number: sectionNumber,
        week,
        date_of_teaching: format(dateOfTeaching, 'yyyy-MM-dd'),
        teaching_mode: teachingMode,
        course,
        book,
        unit,
        page: page || null,
        number_of_students: numberOfStudents ? parseInt(numberOfStudents) : null,
        comments: comments || null,
      };

      if (auditType === 'virtual') {
        if (editingId) {
          const { error } = await supabase
            .from('virtual_audits')
            .update(auditData)
            .eq('id', editingId);
          if (error) throw error;
          toast.success('Audit updated successfully');
        } else {
          const { error } = await supabase
            .from('virtual_audits')
            .insert([auditData]);
          if (error) throw error;
          toast.success('Virtual audit submitted successfully');
        }
        fetchAudits();
      } else {
        const coverData = { ...auditData, original_teacher_name: originalTeacherName };
        if (editingId) {
          const { error } = await supabase
            .from('cover_class_audits')
            .update(coverData)
            .eq('id', editingId);
          if (error) throw error;
          toast.success('Cover class audit updated successfully');
        } else {
          const { error } = await supabase
            .from('cover_class_audits')
            .insert([coverData]);
          if (error) throw error;
          toast.success('Cover class audit submitted successfully');
        }
        fetchCoverAudits();
      }
      
      resetForm();
    } catch (error: any) {
      console.error('Error submitting audit:', error);
      toast.error(error.message || 'Failed to submit audit');
    } finally {
      setIsLoading(false);
    }
  };

  const editAudit = (audit: Audit | CoverAudit, type: AuditType) => {
    setAuditType(type);
    setEditingId(audit.id);
    setTeacherName(audit.teacher_name);
    setElsdId(audit.elsd_id);
    setCampus(audit.campus);
    setSectionNumber(audit.section_number);
    setWeek(audit.week);
    setDateOfTeaching(parseISO(audit.date_of_teaching));
    setTeachingMode(audit.teaching_mode);
    setCourse(audit.course);
    setBook(audit.book);
    setUnit(audit.unit);
    setPage(audit.page || '');
    setNumberOfStudents(audit.number_of_students?.toString() || '');
    setComments(audit.comments || '');
    
    if (type === 'cover' && 'original_teacher_name' in audit) {
      setOriginalTeacherName(audit.original_teacher_name);
    }
    
    // Switch to form tab
    const tabTrigger = document.querySelector('[data-state="inactive"][value="new"]') as HTMLElement;
    tabTrigger?.click();
  };

  const resetForm = () => {
    setEditingId(null);
    setTeacherName('');
    setOriginalTeacherName('');
    setElsdId('');
    setCampus('');
    setSectionNumber('');
    setWeek('');
    setDateOfTeaching(undefined);
    setTeachingMode('');
    setCourse('');
    setBook('');
    setUnit('');
    setPage('');
    setNumberOfStudents('');
    setComments('');
  };

  const downloadAuditWord = async (audit: Audit | CoverAudit, isCover: boolean = false) => {
    const createTableRow = (label: string, value: string) => {
      return new DocxTableRow({
        children: [
          new DocxTableCell({
            width: { size: 3000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
            shading: { fill: 'f3f4f6' },
          }),
          new DocxTableCell({
            width: { size: 6000, type: WidthType.DXA },
            children: [new Paragraph({ text: value })],
          }),
        ],
      });
    };

    const rows = [
      createTableRow('Teacher Name', audit.teacher_name),
    ];

    if (isCover && 'original_teacher_name' in audit) {
      rows.push(createTableRow('Original Teacher', audit.original_teacher_name));
    }

    rows.push(
      createTableRow('ELSD ID', audit.elsd_id),
      createTableRow('Campus', audit.campus),
      createTableRow('Section Number', audit.section_number),
      createTableRow('Week', audit.week),
      createTableRow('Date of Teaching', format(parseISO(audit.date_of_teaching), 'MMMM d, yyyy')),
      createTableRow('Teaching Mode', audit.teaching_mode),
      createTableRow('Course', audit.course),
      createTableRow('Book', audit.book),
      createTableRow('Unit', audit.unit),
      createTableRow('Page', audit.page || 'N/A'),
      createTableRow('Number of Students', audit.number_of_students?.toString() || 'N/A'),
      createTableRow('Comments', audit.comments || 'N/A'),
    );

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: isCover ? 'COVER CLASS VIRTUAL AUDIT RECORD' : 'VIRTUAL AUDIT RECORD',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: format(parseISO(audit.date_of_teaching), 'MMMM d, yyyy'),
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${isCover ? 'cover_' : ''}audit_${audit.teacher_name.replace(/\s+/g, '_')}_${format(parseISO(audit.date_of_teaching), 'yyyy-MM-dd')}.docx`;
    saveAs(blob, fileName);
    toast.success('Word document downloaded');
  };

  const downloadAuditPdf = (audit: Audit | CoverAudit, isCover: boolean = false) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const title = isCover ? 'COVER CLASS VIRTUAL AUDIT RECORD' : 'VIRTUAL AUDIT RECORD';
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    // Date subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(format(parseISO(audit.date_of_teaching), 'MMMM d, yyyy'), doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

    // Table data
    const tableData: string[][] = [
      ['Teacher Name', audit.teacher_name],
    ];

    if (isCover && 'original_teacher_name' in audit) {
      tableData.push(['Original Teacher', audit.original_teacher_name]);
    }

    tableData.push(
      ['ELSD ID', audit.elsd_id],
      ['Campus', audit.campus],
      ['Section Number', audit.section_number],
      ['Week', audit.week],
      ['Date of Teaching', format(parseISO(audit.date_of_teaching), 'MMMM d, yyyy')],
      ['Teaching Mode', audit.teaching_mode],
      ['Course', audit.course],
      ['Book', audit.book],
      ['Unit', audit.unit],
      ['Page', audit.page || 'N/A'],
      ['Number of Students', audit.number_of_students?.toString() || 'N/A'],
      ['Comments', audit.comments || 'N/A'],
    );

    autoTable(doc, {
      startY: 35,
      head: [],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [243, 244, 246], cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
    });

    const fileName = `${isCover ? 'cover_' : ''}audit_${audit.teacher_name.replace(/\s+/g, '_')}_${format(parseISO(audit.date_of_teaching), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    toast.success('PDF downloaded');
  };

  const renderAuditForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="teacherName">{auditType === 'cover' ? "Cover Teacher's Name *" : "Teacher's Name *"}</Label>
          <Input
            id="teacherName"
            placeholder="Enter teacher name"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            required
          />
        </div>

        {auditType === 'cover' && (
          <div className="space-y-2">
            <Label htmlFor="originalTeacherName">Original Teacher's Name *</Label>
            <Input
              id="originalTeacherName"
              placeholder="Teacher being covered"
              value={originalTeacherName}
              onChange={(e) => setOriginalTeacherName(e.target.value)}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="elsdId">ELSD ID *</Label>
          <Input
            id="elsdId"
            placeholder="Enter ELSD ID"
            value={elsdId}
            onChange={(e) => setElsdId(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Campus *</Label>
          <Select value={campus} onValueChange={setCampus}>
            <SelectTrigger>
              <SelectValue placeholder="Select campus" />
            </SelectTrigger>
            <SelectContent>
              {CAMPUSES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sectionNumber">Section Number *</Label>
          <Input
            id="sectionNumber"
            placeholder="Enter section number"
            value={sectionNumber}
            onChange={(e) => setSectionNumber(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Week *</Label>
          <Select value={week} onValueChange={setWeek}>
            <SelectTrigger>
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {WEEKS.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date of Teaching *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateOfTeaching && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfTeaching ? format(dateOfTeaching, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateOfTeaching}
                onSelect={setDateOfTeaching}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Teaching Mode *</Label>
          <Select value={teachingMode} onValueChange={setTeachingMode}>
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {TEACHING_MODES.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Course *</Label>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {COURSES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Book *</Label>
          <Select value={book} onValueChange={setBook}>
            <SelectTrigger>
              <SelectValue placeholder="Select book" />
            </SelectTrigger>
            <SelectContent>
              {BOOKS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Unit *</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="page">Page</Label>
          <Input
            id="page"
            placeholder="Enter page number"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="numberOfStudents">Number of Students</Label>
          <Input
            id="numberOfStudents"
            type="number"
            placeholder="Enter number"
            value={numberOfStudents}
            onChange={(e) => setNumberOfStudents(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comments">Comments</Label>
        <Textarea
          id="comments"
          placeholder="Enter any additional comments..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingId ? 'Save Changes' : 'Submit Audit'}
        </Button>
        <Button type="button" variant="outline" onClick={resetForm}>
          {editingId ? 'Cancel Edit' : 'Clear Form'}
        </Button>
      </div>
    </form>
  );

  const renderAuditHistory = (auditList: (Audit | CoverAudit)[], isCover: boolean = false) => {
    const loading = isCover ? loadingCoverAudits : loadingAudits;
    const filtered = isCover ? filteredCoverAudits : filteredAudits;

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {isCover ? 'Cover Class Audit History' : 'Audit History'}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {searchQuery ? 'No matching audits found' : 'No audits yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Submit your first audit to see it here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Teacher</TableHead>
                    {isCover && <TableHead>Original Teacher</TableHead>}
                    <TableHead>Campus</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>{format(parseISO(audit.date_of_teaching), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{audit.teacher_name}</TableCell>
                      {isCover && 'original_teacher_name' in audit && (
                        <TableCell>{(audit as CoverAudit).original_teacher_name}</TableCell>
                      )}
                      <TableCell>{audit.campus}</TableCell>
                      <TableCell>{audit.course}</TableCell>
                      <TableCell>{audit.week}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editAudit(audit, isCover ? 'cover' : 'virtual')}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadAuditPdf(audit, isCover)}
                            title="Download PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadAuditWord(audit, isCover)}
                            title="Download Word"
                          >
                            <FileDown className="h-4 w-4" />
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
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Virtual Audit</h1>
          <p className="text-muted-foreground">Log and track teaching observations</p>
        </div>

        {/* Audit Type Toggle */}
        <div className="flex gap-2">
          <Button
            variant={auditType === 'virtual' ? 'default' : 'outline'}
            onClick={() => { setAuditType('virtual'); resetForm(); }}
            className="flex items-center gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            Virtual Audit
          </Button>
          <Button
            variant={auditType === 'cover' ? 'default' : 'outline'}
            onClick={() => { setAuditType('cover'); resetForm(); }}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Cover Class Virtual Audit
          </Button>
        </div>

        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">
              {editingId ? 'Edit Audit' : 'New Audit'}
            </TabsTrigger>
            <TabsTrigger value="history">
              {auditType === 'virtual' 
                ? `Audit History (${audits.length})`
                : `Cover Class History (${coverAudits.length})`
              }
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-lg">
                    {auditType === 'cover' ? (
                      <Users className="h-6 w-6 text-primary-foreground" />
                    ) : (
                      <ClipboardList className="h-6 w-6 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <CardTitle>
                      {editingId 
                        ? 'Edit Audit Record'
                        : auditType === 'cover' 
                          ? 'New Cover Class Virtual Audit'
                          : 'New Virtual Audit'
                      }
                    </CardTitle>
                    <CardDescription>
                      {auditType === 'cover'
                        ? 'Fill in the cover class teaching observation details'
                        : 'Fill in the teaching observation details'
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderAuditForm()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {auditType === 'virtual' 
              ? renderAuditHistory(audits, false)
              : renderAuditHistory(coverAudits, true)
            }
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
