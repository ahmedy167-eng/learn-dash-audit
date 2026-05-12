import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Trash2, RefreshCw, UserCheck } from 'lucide-react';

interface GuestStudent {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export function GuestStudentManagement() {
  const [guests, setGuests] = useState<GuestStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGuests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('guest_students')
      .select('id, username, display_name, is_active, created_at, last_login_at')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load guest students');
    else setGuests((data || []) as GuestStudent[]);
    setLoading(false);
  };

  useEffect(() => { fetchGuests(); }, []);

  const setActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from('guest_students').update({ is_active }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(is_active ? 'Account approved' : 'Account deactivated');
    fetchGuests();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this guest account permanently?')) return;
    const { error } = await supabase.from('guest_students').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Account deleted');
    fetchGuests();
  };

  const pending = guests.filter(g => !g.is_active).length;

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
              Approve guest signups before they can access the quiz portal.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchGuests} disabled={loading}>
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
              <TableHead>Created</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : guests.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No guest accounts yet</TableCell></TableRow>
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
