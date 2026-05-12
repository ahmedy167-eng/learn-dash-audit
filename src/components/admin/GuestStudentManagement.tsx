import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Trash2, RefreshCw, UserCheck } from 'lucide-react';

interface GuestStudent {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  assigned_teacher_id: string | null;
}

interface Teacher {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const UNASSIGNED = '__unassigned__';

export function GuestStudentManagement() {
  const [guests, setGuests] = useState<GuestStudent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: g, error: gErr }, { data: profiles }] = await Promise.all([
      supabase
        .from('guest_students')
        .select('id, username, display_name, is_active, created_at, last_login_at, assigned_teacher_id')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, full_name, email'),
    ]);
    if (gErr) toast.error('Failed to load guest students');
    else setGuests((g || []) as GuestStudent[]);
    setTeachers((profiles || []) as Teacher[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const setActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from('guest_students').update({ is_active }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(is_active ? 'Account approved' : 'Account deactivated');
    fetchAll();
  };

  const assignTeacher = async (id: string, value: string) => {
    const assigned_teacher_id = value === UNASSIGNED ? null : value;
    const { error } = await supabase.from('guest_students').update({ assigned_teacher_id } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(assigned_teacher_id ? 'Teacher assigned' : 'Teacher cleared');
    setGuests(prev => prev.map(g => g.id === id ? { ...g, assigned_teacher_id } : g));
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this guest account permanently?')) return;
    const { error } = await supabase.from('guest_students').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Account deleted');
    fetchAll();
  };

  const pending = guests.filter(g => !g.is_active).length;

  const teacherLabel = (t: Teacher) => t.full_name || t.email || t.user_id.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Guest Students
              {pending > 0 && (
                <Badge variant="destructive" className="ml-2">{pending} pending</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Approve guest signups and assign each one to a teacher. Guests only see quizzes from their assigned teacher's guest section.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Teacher</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : guests.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No guest accounts yet</TableCell></TableRow>
            ) : (
              guests.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.display_name}</TableCell>
                  <TableCell className="text-muted-foreground">{g.username}</TableCell>
                  <TableCell>
                    {g.is_active ? (
                      <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={g.assigned_teacher_id || UNASSIGNED}
                      onValueChange={(v) => assignTeacher(g.id, v)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                        {teachers.map(t => (
                          <SelectItem key={t.user_id} value={t.user_id}>{teacherLabel(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{g.last_login_at ? new Date(g.last_login_at).toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {g.is_active ? (
                      <Button variant="outline" size="sm" onClick={() => setActive(g.id, false)}>Deactivate</Button>
                    ) : (
                      <Button size="sm" onClick={() => setActive(g.id, true)}>Approve</Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => remove(g.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
