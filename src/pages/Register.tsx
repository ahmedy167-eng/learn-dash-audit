import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2, CalendarIcon, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['Regular', 'Intensive', 'Evening', 'Weekend'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [sectionNumber, setSectionNumber] = useState('');
  const [category, setCategory] = useState('Regular');
  const [course, setCourse] = useState('');
  const [room, setRoom] = useState('');
  const [building, setBuilding] = useState('');
  const [startClassTime, setStartClassTime] = useState('');
  const [finishClassTime, setFinishClassTime] = useState('');
  const [teachingDays, setTeachingDays] = useState<string[]>([]);
  const [offDays, setOffDays] = useState<Date[]>([]);
  const [offDayInput, setOffDayInput] = useState<Date>();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editId) {
      fetchStudent(editId);
    }
  }, [editId]);

  const fetchStudent = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setFullName(data.full_name);
        setStudentId(data.student_id);
        setSectionNumber(data.section_number || '');
        setCategory(data.category || 'Regular');
        setCourse(data.course || '');
        setRoom(data.room || '');
        setBuilding(data.building || '');
        setStartClassTime(data.start_class_time || '');
        setFinishClassTime(data.finish_class_time || '');
        setTeachingDays(data.teaching_days || []);
        if (data.off_days) {
          setOffDays(data.off_days.map((d: string) => new Date(d)));
        }
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Failed to load student data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !studentId.trim()) {
      toast.error('Full name and Student ID are required');
      return;
    }

    setIsLoading(true);

    try {
      const studentData = {
        full_name: fullName.trim(),
        student_id: studentId.trim(),
        section_number: sectionNumber.trim() || null,
        category: category,
        course: course.trim() || null,
        room: room.trim() || null,
        building: building.trim() || null,
        start_class_time: startClassTime || null,
        finish_class_time: finishClassTime || null,
        teaching_days: teachingDays,
        off_days: offDays.map(d => format(d, 'yyyy-MM-dd')),
        notes: notes.trim() || null,
        user_id: user?.id,
      };

      if (editId) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editId);

        if (error) throw error;
        toast.success('Entry updated successfully');
      } else {
        const { error } = await supabase
          .from('students')
          .insert([studentData]);

        if (error) throw error;
        toast.success('Entry added successfully');
      }

      navigate('/students');
    } catch (error: any) {
      console.error('Error saving entry:', error);
      toast.error(error.message || 'Failed to save entry');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setStudentId('');
    setSectionNumber('');
    setCategory('Regular');
    setCourse('');
    setRoom('');
    setBuilding('');
    setStartClassTime('');
    setFinishClassTime('');
    setTeachingDays([]);
    setOffDays([]);
    setNotes('');
  };

  const toggleDay = (day: string) => {
    setTeachingDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const addOffDay = () => {
    if (offDayInput && !offDays.some(d => d.toDateString() === offDayInput.toDateString())) {
      setOffDays([...offDays, offDayInput]);
      setOffDayInput(undefined);
    }
  };

  const removeOffDay = (date: Date) => {
    setOffDays(offDays.filter(d => d.toDateString() !== date.toDateString()));
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <UserPlus className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>{editId ? 'Edit Register Entry' : 'Add Register Entry'}</CardTitle>
                <CardDescription>
                  {editId ? 'Update entry information' : 'Enter the student and class information below'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Full Name & Student ID */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID *</Label>
                  <Input
                    id="studentId"
                    placeholder="Enter student ID"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Row 2: Section Number & Category */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sectionNumber">Section Number</Label>
                  <Input
                    id="sectionNumber"
                    placeholder="e.g., A, B, 01"
                    value={sectionNumber}
                    onChange={(e) => setSectionNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
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

              {/* Row 3: Course & Room */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    placeholder="e.g., Computer Science"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Input
                    id="room"
                    placeholder="e.g., Lab 101"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 4: Building */}
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input
                  id="building"
                  placeholder="e.g., Science Block"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                />
              </div>

              {/* Row 5: Class Times */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startClassTime">Start Class Time</Label>
                  <div className="relative">
                    <Input
                      id="startClassTime"
                      type="time"
                      value={startClassTime}
                      onChange={(e) => setStartClassTime(e.target.value)}
                      className="pl-10"
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finishClassTime">Finish Class Time</Label>
                  <div className="relative">
                    <Input
                      id="finishClassTime"
                      type="time"
                      value={finishClassTime}
                      onChange={(e) => setFinishClassTime(e.target.value)}
                      className="pl-10"
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Teaching Days */}
              <div className="space-y-2">
                <Label>Teaching Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <label
                      key={day}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer transition-colors",
                        teachingDays.includes(day) 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-background hover:bg-accent"
                      )}
                    >
                      <Checkbox 
                        checked={teachingDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                        className={cn(
                          teachingDays.includes(day) && "border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                        )}
                      />
                      <span className="text-sm font-medium">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Off Days */}
              <div className="space-y-2">
                <Label>Off Days</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !offDayInput && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {offDayInput ? format(offDayInput, "dd/MM/yyyy") : "dd/mm/yyyy"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={offDayInput}
                        onSelect={setOffDayInput}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Button type="button" variant="outline" onClick={addOffDay}>
                    Add
                  </Button>
                </div>
                {offDays.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {offDays.map((date, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {format(date, "MMM d, yyyy")}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeOffDay(date)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/students')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editId ? 'Update Entry' : 'Add Entry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
