import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  subject: string | null;
  content: string;
  sender_type: string;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string;
}

interface UseStudentMessagesReturn {
  messages: Message[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (messageId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useStudentMessages(
  studentId: string | undefined,
  onNewMessage?: () => void
): UseStudentMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!studentId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, subject, content, sender_type, is_read, read_at, created_at')
        .eq('recipient_student_id', studentId)
        .eq('recipient_type', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
      setUnreadCount((data || []).filter(m => !m.is_read).length);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!studentId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_student_id', studentId)
        .eq('is_read', false);

      if (error) throw error;

      setMessages(prev =>
        prev.map(m => ({ ...m, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  };

  // Subscribe to realtime updates for new messages
  useEffect(() => {
    if (!studentId) return;

    fetchMessages();

    const channel = supabase
      .channel(`student-messages-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_student_id=eq.${studentId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Show toast notification
          toast.info('📬 New Message!', {
            description: newMessage.subject || 'You have received a new message',
            action: {
              label: 'View',
              onClick: () => onNewMessage?.(),
            },
            duration: 5000,
          });

          // Update messages list and unread count
          setMessages(prev => [newMessage, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, fetchMessages, onNewMessage]);

  return {
    messages,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchMessages,
  };
}
