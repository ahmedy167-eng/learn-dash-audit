import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, Info, Trophy, ClipboardCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notice {
  id: string;
  notice_type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const noticeIcons: Record<string, typeof Bell> = {
  info: Info,
  warning: AlertTriangle,
  attendance: ClipboardCheck,
  achievement: Trophy,
};

const noticeColors: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-600 border-blue-200',
  warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  attendance: 'bg-orange-500/10 text-orange-600 border-orange-200',
  achievement: 'bg-green-500/10 text-green-600 border-green-200',
};

export function NoticesPanel() {
  const { student } = useStudentAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    if (!student) return;

    try {
      const { data, error } = await supabase
        .from('student_notices')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [student]);

  const markAsRead = async (noticeId: string) => {
    try {
      await supabase
        .from('student_notices')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', noticeId);

      setNotices(prev => prev.map(n => 
        n.id === noticeId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notice as read:', error);
    }
  };

  const unreadCount = notices.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notices
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notices.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notices yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {notices.map((notice) => {
                const IconComponent = noticeIcons[notice.notice_type] || Bell;
                const colorClass = noticeColors[notice.notice_type] || 'bg-muted text-muted-foreground';

                return (
                  <div
                    key={notice.id}
                    onClick={() => !notice.is_read && markAsRead(notice.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${colorClass} ${
                      !notice.is_read ? 'ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{notice.title}</p>
                          {!notice.is_read && (
                            <Badge variant="secondary" className="text-xs">NEW</Badge>
                          )}
                        </div>
                        <p className="text-sm opacity-80">{notice.content}</p>
                        <p className="text-xs opacity-60 mt-2">
                          {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
