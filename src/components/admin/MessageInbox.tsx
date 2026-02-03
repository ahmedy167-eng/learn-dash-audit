import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Mail, Reply, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_type: string;
  sender_student_id: string | null;
  sender_user_id: string | null;
  subject: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  students?: { full_name: string; student_id: string } | null;
}

export function MessageInbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_type, sender_student_id, sender_user_id, subject, content, is_read, created_at')
        .eq('recipient_type', 'admin')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch student names
      const studentIds = data?.filter(m => m.sender_student_id).map(m => m.sender_student_id) || [];
      
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, full_name, student_id')
          .in('id', studentIds);

        const studentMap = new Map((students || []).map(s => [s.id, s]));
        
        const enrichedMessages = (data || []).map(msg => ({
          ...msg,
          students: msg.sender_student_id ? studentMap.get(msg.sender_student_id) : null,
        }));
        
        setMessages(enrichedMessages);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, is_read: true } : m
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_type: 'admin',
        sender_user_id: user.id,
        recipient_type: 'student',
        recipient_student_id: selectedMessage.sender_student_id,
        subject: `Re: ${selectedMessage.subject || 'No Subject'}`,
        content: replyContent.trim(),
      });

      if (error) throw error;

      toast.success('Reply sent successfully');
      setReplyContent('');
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const openMessage = (message: Message) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      markAsRead(message.id);
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => openMessage(message)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      message.is_read 
                        ? 'bg-muted/30 hover:bg-muted/50' 
                        : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm truncate ${!message.is_read ? 'font-semibold' : 'font-medium'}`}>
                          {message.students?.full_name || 'Unknown Student'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {message.subject || 'No Subject'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {selectedMessage?.subject || 'No Subject'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">From: </span>
                  <span className="font-medium">{selectedMessage.students?.full_name}</span>
                  <span className="text-muted-foreground ml-2">
                    (ID: {selectedMessage.students?.student_id})
                  </span>
                </div>
                <Badge variant="outline">
                  {formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true })}
                </Badge>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>

              <div className="space-y-2">
                <Label>Reply</Label>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMessage(null)}>
              Close
            </Button>
            <Button onClick={handleReply} disabled={!replyContent.trim() || sending}>
              <Reply className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
