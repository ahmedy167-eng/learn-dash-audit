import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
}

export interface AdminConversation {
  id: string;
  admin_id_1: string;
  admin_id_2: string;
  created_at: string;
  updated_at: string;
  other_admin_id?: string;
  other_admin_name?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

interface UseAdminChatReturn {
  conversations: AdminConversation[];
  loading: boolean;
  error: Error | null;
  getOrCreateConversation: (otherAdminId: string) => Promise<AdminConversation | null>;
  refetch: () => Promise<void>;
}

interface UseAdminMessagesReturn {
  messages: AdminMessage[];
  loading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<boolean>;
  markAsRead: (conversationId: string) => Promise<void>;
}

export function useAdminConversations(currentUserId: string | null): UseAdminChatReturn {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get all conversations for current admin
      const { data: convData, error: convError } = await supabase
        .from('admin_conversations')
        .select('*')
        .or(`admin_id_1.eq.${currentUserId},admin_id_2.eq.${currentUserId}`)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // Get user info for other admins
      const conversations: AdminConversation[] = [];
      
      for (const conv of convData || []) {
        const otherAdminId = conv.admin_id_1 === currentUserId ? conv.admin_id_2 : conv.admin_id_1;
        
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', otherAdminId)
          .single();

        // Get last message
        const { data: msgData } = await supabase
          .from('admin_messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('admin_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', currentUserId);

        conversations.push({
          ...conv,
          other_admin_id: otherAdminId,
          other_admin_name: userData?.full_name || 'Unknown Admin',
          last_message: msgData?.content,
          last_message_time: msgData?.created_at,
          unread_count: unreadCount || 0,
        });
      }

      setConversations(conversations);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch conversations');
      setError(error);
      console.error('Error fetching admin conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const getOrCreateConversation = useCallback(
    async (otherAdminId: string): Promise<AdminConversation | null> => {
      if (!currentUserId) return null;

      try {
        // Ensure consistent ordering (lower ID first)
        const admin1 = currentUserId < otherAdminId ? currentUserId : otherAdminId;
        const admin2 = currentUserId < otherAdminId ? otherAdminId : currentUserId;

        // Check if conversation exists
        const { data: existing } = await supabase
          .from('admin_conversations')
          .select('*')
          .eq('admin_id_1', admin1)
          .eq('admin_id_2', admin2)
          .single();

        if (existing) return existing as AdminConversation;

        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('admin_conversations')
          .insert({
            admin_id_1: admin1,
            admin_id_2: admin2,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Fetch updated list
        await fetchConversations();

        return newConv as AdminConversation;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create conversation');
        console.error('Error creating conversation:', error);
        toast.error('Failed to start conversation');
        return null;
      }
    },
    [currentUserId, fetchConversations]
  );

  useEffect(() => {
    fetchConversations();

    // Subscribe to changes
    const channel = supabase
      .channel(`admin_conversations:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchConversations, currentUserId]);

  return {
    conversations,
    loading,
    error,
    getOrCreateConversation,
    refetch: fetchConversations,
  };
}

export function useAdminMessages(
  conversationId: string | null,
  currentUserId: string | null
): UseAdminMessagesReturn {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: msgData, error: msgError } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      setMessages(msgData as AdminMessage[]);
      setError(null);

      // Mark as read
      if (currentUserId && msgData) {
        await supabase
          .from('admin_messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', currentUserId)
          .is('is_read', false);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch messages');
      setError(error);
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUserId]);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!conversationId || !currentUserId || !content.trim()) return false;

      try {
        const { error } = await supabase.from('admin_messages').insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: content.trim(),
        });

        if (error) throw error;

        await fetchMessages();
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message');
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return false;
      }
    },
    [conversationId, currentUserId, fetchMessages]
  );

  const markAsRead = useCallback(
    async (convId: string) => {
      if (!currentUserId) return;

      try {
        await supabase
          .from('admin_messages')
          .update({ is_read: true })
          .eq('conversation_id', convId)
          .neq('sender_id', currentUserId);
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`admin_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchMessages, conversationId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
  };
}
