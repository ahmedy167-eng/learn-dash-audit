import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useStudentApi } from '@/hooks/useStudentApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, BookOpen, FolderOpen, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ContentUpdate {
  id: string;
  update_type: 'quiz' | 'lms' | 'ca_project';
  title: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

const updateIcons: Record<string, typeof ClipboardList> = {
  quiz: ClipboardList,
  lms: BookOpen,
  ca_project: FolderOpen,
};

const updateColors: Record<string, string> = {
  quiz: 'bg-blue-500/10 text-blue-600 border-blue-200',
  lms: 'bg-green-500/10 text-green-600 border-green-200',
  ca_project: 'bg-purple-500/10 text-purple-600 border-purple-200',
};

const updateRoutes: Record<string, string> = {
  quiz: '/student-portal/quizzes',
  lms: '/student-portal/lms',
  ca_project: '/student-portal/ca-projects',
};

export function StudentUpdatesPanel() {
  const { student } = useStudentAuth();
  const { getData, performAction, getSessionToken } = useStudentApi();
  const [updates, setUpdates] = useState<ContentUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUpdates = useCallback(async () => {
    if (!student || !getSessionToken()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await getData<ContentUpdate[]>('content_updates');
      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching content updates:', error);
    } finally {
      setLoading(false);
    }
  }, [student, getData, getSessionToken]);

  useEffect(() => {
    if (!student || !getSessionToken()) {
      setLoading(false);
      return;
    }

    fetchUpdates();
    const interval = setInterval(fetchUpdates, 30000);
    return () => clearInterval(interval);
  }, [fetchUpdates, getSessionToken, student]);

  const handleClick = async (update: ContentUpdate) => {
    if (!update.is_read) {
      try {
        await performAction('mark_update_read', { updateId: update.id });
        setUpdates(prev => prev.map(u =>
          u.id === update.id ? { ...u, is_read: true } : u
        ));
      } catch (error) {
        console.error('Error marking update as read:', error);
      }
    }
    navigate(updateRoutes[update.update_type] || '/student-portal');
  };

  const unreadCount = updates.filter(u => !u.is_read).length;

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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Recent Updates
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {updates.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No updates yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-3">
              {updates.map((update) => {
                const IconComponent = updateIcons[update.update_type] || RefreshCw;
                const colorClass = updateColors[update.update_type] || 'bg-muted text-muted-foreground';

                return (
                  <div
                    key={update.id}
                    onClick={() => handleClick(update)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${colorClass} ${
                      !update.is_read ? 'ring-2 ring-primary/20' : 'opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{update.title}</p>
                          {!update.is_read && (
                            <Badge variant="secondary" className="text-xs">NEW</Badge>
                          )}
                        </div>
                        <p className="text-xs opacity-60 mt-1">
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
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
