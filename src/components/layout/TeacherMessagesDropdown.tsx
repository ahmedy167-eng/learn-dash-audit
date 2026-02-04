import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Mail, MailOpen, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  subject: string | null;
  content: string;
  created_at: string;
  is_read: boolean;
  sender_type: string;
  sender_student_id: string | null;
  sender_user_id: string | null;
  recipient_type: string;
  recipient_user_id: string | null;
  student?: {
    full_name: string;
    student_id: string;
  } | null;
}

export function TeacherMessagesDropdown() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      // Fetch messages where user is the recipient (direct messages) 
      // or messages sent to 'admin' type (if user is admin)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          student:students!messages_sender_student_id_fkey(full_name, student_id)
        `)
        .or(`recipient_user_id.eq.${user.id},and(recipient_type.eq.admin,recipient_user_id.is.null)`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setMessages(data || []);
      setUnreadCount(data?.filter(m => !m.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('teacher-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);
    setDialogOpen(true);
    setPopoverOpen(false);

    // Mark as read
    if (!message.is_read) {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', message.id);
      
      fetchMessages();
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert([{
        sender_type: 'admin',
        sender_user_id: user.id,
        recipient_type: 'student',
        recipient_student_id: selectedMessage.sender_student_id,
        subject: `Re: ${selectedMessage.subject || 'No Subject'}`,
        content: replyContent.trim(),
      }]);

      if (error) throw error;

      toast.success('Reply sent successfully');
      setReplyContent('');
      setDialogOpen(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b">
            <h4 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Messages
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {unreadCount} unread
                </Badge>
              )}
            </h4>
          </div>
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No messages yet
              </div>
            ) : (
              <div className="divide-y">
                {messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`w-full text-left p-3 hover:bg-accent transition-colors ${
                      !message.is_read ? 'bg-accent/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {message.is_read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {message.student?.full_name || 'Unknown Student'}
                          </span>
                          {!message.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {message.subject || 'No Subject'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(message.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Message Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedMessage?.student?.full_name || 'Unknown Student'}
            </DialogTitle>
            <DialogDescription>
              {selectedMessage?.subject || 'No Subject'} • {selectedMessage && format(new Date(selectedMessage.created_at), 'PPp')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{selectedMessage?.content}</p>
            </div>

            {selectedMessage?.sender_student_id && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reply</label>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            {selectedMessage?.sender_student_id && (
              <Button 
                onClick={handleReply} 
                disabled={!replyContent.trim() || sending}
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send Reply'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
