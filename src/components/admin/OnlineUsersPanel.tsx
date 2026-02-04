import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Session {
  id: string;
  user_type: string;
  login_at: string;
  is_active: boolean;
  students?: { full_name: string; student_id: string } | null;
  profiles?: { full_name: string; email: string } | null;
}

export function OnlineUsersPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      // Fetch recent sessions (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          id,
          user_id,
          student_id,
          user_type,
          login_at,
          logout_at,
          is_active
        `)
        .gte('login_at', twentyFourHoursAgo)
        .order('login_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch student and user names separately
      const studentIds = data?.filter(s => s.student_id).map(s => s.student_id) || [];
      const userIds = data?.filter(s => s.user_id).map(s => s.user_id) || [];

      const [studentsRes, profilesRes] = await Promise.all([
        studentIds.length > 0 
          ? supabase.from('students').select('id, full_name, student_id').in('id', studentIds)
          : Promise.resolve({ data: [] }),
        userIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
          : Promise.resolve({ data: [] }),
      ]);

      const studentMap = new Map((studentsRes.data || []).map(s => [s.id, s]));
      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));

      const enrichedSessions = (data || []).map(session => ({
        ...session,
        students: session.student_id ? studentMap.get(session.student_id) : null,
        profiles: session.user_id ? profileMap.get(session.user_id) : null,
      }));

      setSessions(enrichedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const onlineCount = sessions.filter(s => s.is_active).length;

  const getName = (session: Session) => {
    if (session.students) return session.students.full_name;
    if (session.profiles) return session.profiles.full_name || session.profiles.email;
    return 'Unknown User';
  };

  const getSubtitle = (session: Session) => {
    if (session.students) return `ID: ${session.students.student_id}`;
    if (session.profiles) return session.profiles.email;
    return '';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Online Users
          <Badge variant="secondary" className="ml-auto">
            {onlineCount} online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px]">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent sessions
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-3">
                  <Circle 
                    className={`h-2.5 w-2.5 flex-shrink-0 ${
                      session.is_active ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getName(session)}</p>
                    <p className="text-xs text-muted-foreground truncate">{getSubtitle(session)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {session.user_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.login_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
