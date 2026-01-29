import { useState, useEffect } from 'react';
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
import { ClipboardList, Loader2, CalendarIcon, History } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

export default function VirtualAudit() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(true);

  // Form state
  const [teacherName, setTeacherName] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacherName || !elsdId || !campus || !sectionNumber || !week || !dateOfTeaching || !teachingMode || !course || !book || !unit) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('virtual_audits')
        .insert([{
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
        }]);

      if (error) throw error;

      toast.success('Virtual audit submitted successfully');
      resetForm();
      fetchAudits();
    } catch (error: any) {
      console.error('Error submitting audit:', error);
      toast.error(error.message || 'Failed to submit audit');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTeacherName('');
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Virtual Audit</h1>
          <p className="text-muted-foreground">Log and track teaching observations</p>
        </div>

        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">New Audit</TabsTrigger>
            <TabsTrigger value="history">Audit History ({audits.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-lg">
                    <ClipboardList className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle>New Virtual Audit</CardTitle>
                    <CardDescription>Fill in the teaching observation details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="teacherName">Teacher's Name *</Label>
                      <Input
                        id="teacherName"
                        placeholder="Enter teacher name"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        required
                      />
                    </div>

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
                      Submit Audit
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Clear Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Audit History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAudits ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : audits.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No audits yet</h3>
                    <p className="text-muted-foreground">Submit your first virtual audit to see it here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Campus</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Students</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audits.map((audit) => (
                          <TableRow key={audit.id}>
                            <TableCell>{format(parseISO(audit.date_of_teaching), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="font-medium">{audit.teacher_name}</TableCell>
                            <TableCell>{audit.campus}</TableCell>
                            <TableCell>{audit.course}</TableCell>
                            <TableCell>{audit.week}</TableCell>
                            <TableCell>{audit.teaching_mode}</TableCell>
                            <TableCell>{audit.number_of_students || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
