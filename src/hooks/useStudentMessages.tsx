import { useState, useEffect, useCallback } from 'react';
import { useStudentApi } from './useStudentApi';
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
  const { getData, performAction, getSessionToken } = useStudentApi();

  const fetchMessages = useCallback(async () => {
    if (!studentId || !getSessionToken()) return;

    try {
      const { data, error } = await getData<Message[]>('messages');

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
      setUnreadCount((data || []).filter(m => !m.is_read).length);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId, getData, getSessionToken]);

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await performAction('mark_message_read', { messageId });

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
      const { error } = await performAction('mark_all_messages_read', {});

      if (error) throw error;

      setMessages(prev =>
        prev.map(m => ({ ...m, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  };

  // Fetch messages on mount and when studentId changes
  useEffect(() => {
    if (!studentId) return;

    fetchMessages();

    // Poll for new messages every 30 seconds since we can't use realtime without auth
    const interval = setInterval(() => {
      fetchMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, [studentId, fetchMessages]);

  return {
    messages,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchMessages,
  };
}
