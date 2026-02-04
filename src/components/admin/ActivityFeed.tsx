import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Activity, LogIn, FileText, ClipboardCheck, MessageSquare, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  user_type: string;
  action: string;
  entity_type: string | null;
  details: unknown;
  created_at: string;
  students?: { full_name: string } | null;
  profiles?: { full_name: string; email: string } | null;
}

const actionIcons: Record<string, typeof Activity> = {
  login: LogIn,
  logout: LogIn,
  submit_quiz: ClipboardCheck,
  submit_project: FileText,
  send_message: MessageSquare,
  add_student: UserPlus,
};

const actionColors: Record<string, string> = {
  login: 'bg-green-500/10 text-green-600',
  logout: 'bg-muted text-muted-foreground',
  submit_quiz: 'bg-blue-500/10 text-blue-600',
  submit_project: 'bg-purple-500/10 text-purple-600',
  send_message: 'bg-orange-500/10 text-orange-600',
  add_student: 'bg-primary/10 text-primary',
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, user_id, student_id, user_type, action, entity_type, details, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      // Fetch related names
      const studentIds = data?.filter(a => a.student_id).map(a => a.student_id) || [];
      const userIds = data?.filter(a => a.user_id).map(a => a.user_id) || [];

      const [studentsRes, profilesRes] = await Promise.all([
        studentIds.length > 0 
          ? supabase.from('students').select('id, full_name').in('id', studentIds)
          : Promise.resolve({ data: [] }),
        userIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
          : Promise.resolve({ data: [] }),
      ]);

      const studentMap = new Map((studentsRes.data || []).map(s => [s.id, s]));
      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));

      const enrichedActivities = (data || []).map(activity => ({
        ...activity,
        students: activity.student_id ? studentMap.get(activity.student_id) : null,
        profiles: activity.user_id ? profileMap.get(activity.user_id) : null,
      }));

      setActivities(enrichedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
        fetchActivities();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const getName = (activity: ActivityLog) => {
    if (activity.students) return activity.students.full_name;
    if (activity.profiles) return activity.profiles.full_name || activity.profiles.email;
    return 'Unknown';
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px]">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const IconComponent = actionIcons[activity.action] || Activity;
                const colorClass = actionColors[activity.action] || 'bg-muted text-muted-foreground';
                
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-md ${colorClass}`}>
                      <IconComponent className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{getName(activity)}</span>
                        {' '}
                        <span className="text-muted-foreground">{formatAction(activity.action)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {activity.user_type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
