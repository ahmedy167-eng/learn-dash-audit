import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pencil, Trash2, FolderOpen, Users, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  category: string | null;
  course: string | null;
  room: string | null;
  building: string | null;
  start_class_time: string | null;
  finish_class_time: string | null;
  teaching_days: string[] | null;
  created_at: string;
  student_count?: number;
}

export default function Sections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSections();
    }
  }, [user?.id]);

  const fetchSections = async () => {
    if (!user?.id) return;
    try {
      // Fetch only current teacher's sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sectionsError) throw sectionsError;

      // Fetch student counts for current teacher's students only
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('section_id')
        .eq('user_id', user.id);

      if (studentsError) throw studentsError;

      // Count students per section
      const countMap: Record<string, number> = {};
      studentsData?.forEach(student => {
        if (student.section_id) {
          countMap[student.section_id] = (countMap[student.section_id] || 0) + 1;
        }
      });

      // Merge counts with sections
      const sectionsWithCounts = (sectionsData || []).map(section => ({
        ...section,
        student_count: countMap[section.id] || 0
      }));

      setSections(sectionsWithCounts);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Section deleted successfully');
      fetchSections();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  };

  const filteredSections = sections.filter(section =>
    section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (section.course?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sections</h1>
            <p className="text-muted-foreground">Manage your class sections and their students</p>
          </div>
          <Button onClick={() => navigate('/sections/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sections Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              All Sections ({filteredSections.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSections.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No sections found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Start by creating your first section'}
                </p>
                {!searchQuery && (
                  <Button className="mt-4" onClick={() => navigate('/sections/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Section
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section Name</TableHead>
                    <TableHead>Section #</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.name}</TableCell>
                      <TableCell>{section.section_number || '-'}</TableCell>
                      <TableCell>{section.course || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{section.category || 'Regular'}</Badge>
                      </TableCell>
                      <TableCell>
                        {section.start_class_time || section.finish_class_time ? (
                          <span className="text-sm">
                            {formatTime(section.start_class_time)} - {formatTime(section.finish_class_time)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {section.teaching_days && section.teaching_days.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {section.teaching_days.map(day => (
                              <Badge key={day} variant="outline" className="text-xs">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Users className="h-3 w-3" />
                          {section.student_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/register?section=${section.id}`}>
                            <Button variant="ghost" size="icon" title="View Register">
                              <Users className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to={`/sections/edit/${section.id}`}>
                            <Button variant="ghost" size="icon" title="Edit Section">
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
                                <AlertDialogTitle>Delete Section</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{section.name}"? Students in this section will be unlinked but not deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteSection(section.id)}
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
