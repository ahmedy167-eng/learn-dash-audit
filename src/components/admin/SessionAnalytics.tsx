import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Clock, TrendingUp, Users } from 'lucide-react';

interface SessionStats {
  totalSessions: number;
  avgDuration: number;
  todaySessions: number;
  peakHour: string;
}

export function SessionAnalytics() {
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    avgDuration: 0,
    todaySessions: 0,
    peakHour: 'N/A',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch all sessions with duration
        const { data: sessions, error } = await supabase
          .from('user_sessions_safe')
          .select('login_at, session_duration_minutes')
          .not('session_duration_minutes', 'is', null);

        if (error) throw error;

        // Calculate stats
        const totalSessions = sessions?.length || 0;
        
        const totalDuration = sessions?.reduce((sum, s) => sum + (s.session_duration_minutes || 0), 0) || 0;
        const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

        // Today's sessions
        const todaySessions = sessions?.filter(s => 
          new Date(s.login_at) >= today
        ).length || 0;

        // Peak hour calculation
        const hourCounts: Record<number, number> = {};
        sessions?.forEach(s => {
          const hour = new Date(s.login_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        let peakHour = 'N/A';
        let maxCount = 0;
        Object.entries(hourCounts).forEach(([hour, count]) => {
          if (count > maxCount) {
            maxCount = count;
            const h = parseInt(hour);
            peakHour = `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}-${(h + 1) % 12 || 12}${(h + 1) < 12 ? 'am' : 'pm'}`;
          }
        });

        setStats({
          totalSessions,
          avgDuration,
          todaySessions,
          peakHour,
        });
      } catch (error) {
        console.error('Error fetching session stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex justify-center py-8 h-full items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart className="h-4 w-4" />
          Session Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] flex items-center">
          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs">Total Sessions</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Avg Duration</span>
              </div>
              <p className="text-2xl font-bold">{stats.avgDuration}m</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-xs">Today</span>
              </div>
              <p className="text-2xl font-bold">{stats.todaySessions}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart className="h-3.5 w-3.5" />
                <span className="text-xs">Peak Hours</span>
              </div>
              <p className="text-lg font-bold">{stats.peakHour}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
