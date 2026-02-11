import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_student_id: string | null;
  content: string;
  attachment_url: string | null;
  attachment_type: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
  is_read?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string | null;
  student_id: string | null;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string | null;
  is_active: boolean;
  user_name?: string;
  student_name?: string;
}

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: Error | null;
  createConversation: (
    participantIds: string[],
    type: 'direct' | 'group',
    title?: string
  ) => Promise<Conversation | null>;
  refetch: () => Promise<void>;
}

interface UseChatReturn {
  messages: ChatMessage[];
  conversation: Conversation | null;
  loading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  markAsRead: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
}

interface UseTypingIndicatorsReturn {
  typingUsers: ConversationParticipant[];
  setTyping: (isTyping: boolean) => Promise<void>;
}

export function useConversations(userId: string | null, studentId: string | null): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId && !studentId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, try to fetch simple conversation list
      let conversations = [];
      
      // Get conversations where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .or(`user_id.eq.${userId},student_id.eq.${studentId}`)
        .distinct();

      if (participantError) {
        console.warn('Error fetching user conversations:', participantError);
        // Fallback: try fetching all conversations
        const { data: allConvs, error: allConvsError } = await supabase
          .from('conversations')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(50);
        
        if (allConvsError) {
          throw allConvsError;
        }
        conversations = allConvs || [];
      } else {
        // If we got participant data, fetch the actual conversations
        const conversationIds = (participantData || []).map(p => p.conversation_id);
        
        if (conversationIds.length > 0) {
          const { data: convData, error: convError } = await supabase
            .from('conversations')
            .select(`
              *,
              participants:conversation_participants(
                id,
                user_id,
                student_id,
                role,
                joined_at,
                last_read_at,
                is_active
              )
            `)
            .in('id', conversationIds)
            .order('updated_at', { ascending: false });
          
          if (convError) {
            console.warn('Error fetching full conversations:', convError);
            // Fallback to simple conversation list
            const { data: simpleConvs, error: simpleError } = await supabase
              .from('conversations')
              .select('*')
              .in('id', conversationIds);
            
            if (simpleError) throw simpleError;
            conversations = simpleConvs || [];
          } else {
            conversations = convData || [];
          }
        }
      }

      setConversations(conversations as Conversation[]);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch conversations');
      setError(error);
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [userId, studentId]);

  const createConversation = useCallback(
    async (participantIds: string[], type: 'direct' | 'group', title?: string) => {
      try {
        // Create conversation
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .insert({
            type,
            title:
              type === 'direct'
                ? null
                : title || `Conversation-${new Date().getTime()}`,
            created_by: userId,
          })
          .select()
          .single();

        if (convError) {
          console.error('Conversation creation error:', convError);
          throw convError;
        }

        // Add current user as participant
        const currentUserParticipant = {
          conversation_id: convData.id,
          user_id: userId || null,
          student_id: studentId || null,
        };

        // Parse participant IDs with type prefix (e.g., "user-uuid" or "student-uuid")
        const otherParticipants = participantIds
          .map(id => {
            if (id && id.startsWith('user-')) {
              const userId = id.substring(5); // Remove "user-" prefix
              if (userId && userId !== 'null' && userId !== 'undefined') {
                return {
                  conversation_id: convData.id,
                  user_id: userId,
                  student_id: null,
                };
              }
            } else if (id && id.startsWith('student-')) {
              const studentId = id.substring(8); // Remove "student-" prefix
              if (studentId && studentId !== 'null' && studentId !== 'undefined') {
                return {
                  conversation_id: convData.id,
                  user_id: null,
                  student_id: studentId,
                };
              }
            }
            return null;
          })
          .filter((p): p is typeof otherParticipants[0] => p !== null);

        const participants = [currentUserParticipant, ...otherParticipants];

        console.log('Inserting participants:', participants);

        const { error: partError, data: partData } = await supabase
          .from('conversation_participants')
          .insert(participants);

        if (partError) {
          console.error('Participant insertion error:', partError);
          console.error('Participant data:', partData);
          throw partError;
        }

        // Refresh conversations list in the background
        // Don't wait for it as it may fail due to RLS policies
        fetchConversations().catch(err => {
          console.error('Background fetch conversations failed:', err);
        });

        return {
          ...convData,
          participants: participants as ConversationParticipant[],
        } as Conversation;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create conversation');
        console.error('Create conversation error:', {
          message: error.message,
          stack: error.stack,
          details: err
        });
        toast.error(error.message || 'Failed to create conversation');
        return null;
      }
    },
    [userId, studentId, fetchConversations]
  );

  // Set up real-time subscription
  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel(`conversations:user:${userId || studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        payload => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchConversations, userId, studentId]);

  return {
    conversations,
    loading,
    error,
    createConversation,
    refetch: fetchConversations,
  };
}

export function useChat(
  conversationId: string | null,
  userId: string | null,
  studentId: string | null
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Map<string, ChatMessage>>(new Map());

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      setConversation(convData as Conversation);

      // Fetch messages
      const { data: msgData, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(50);

      if (msgError) throw msgError;

      setMessages(msgData as ChatMessage[]);
      setError(null);

      // Update messagesRef
      msgData?.forEach(msg => messagesRef.current.set(msg.id, msg));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch messages');
      setError(error);
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return false;

      try {
        const { data, error: sendError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            sender_user_id: userId,
            sender_student_id: studentId,
            content: content.trim(),
          })
          .select()
          .single();

        if (sendError) throw sendError;

        setMessages(prev => [...prev, data as ChatMessage]);
        return true;
      } catch (err) {
        console.error('Error sending message:', err);
        toast.error('Failed to send message');
        return false;
      }
    },
    [conversationId, userId, studentId]
  );

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const { error: editError } = await supabase
        .from('chat_messages')
        .update({
          content,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (editError) throw editError;

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content, edited_at: new Date().toISOString() }
            : m
        )
      );
      return true;
    } catch (err) {
      console.error('Error editing message:', err);
      toast.error('Failed to edit message');
      return false;
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (deleteError) throw deleteError;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error('Failed to delete message');
      return false;
    }
  }, []);

  const markAsRead = useCallback(async () => {
    if (!conversationId || !userId) return;

    try {
      const { error: updateError } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .match({ conversation_id: conversationId, user_id: userId });

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, [conversationId, userId]);

  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;

    try {
      const { data, error: loadError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .lt('created_at', messages[0].created_at)
        .order('created_at', { ascending: false })
        .limit(50);

      if (loadError) throw loadError;

      setMessages(prev => [...(data || []).reverse(), ...prev]);
    } catch (err) {
      console.error('Error loading more messages:', err);
    }
  }, [conversationId, messages]);

  // Set up real-time subscription
  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const newMessage = payload.new as ChatMessage;
          if (!messagesRef.current.has(newMessage.id)) {
            setMessages(prev => [...prev, newMessage]);
            messagesRef.current.set(newMessage.id, newMessage);
            markAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev =>
            prev.map(m => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchMessages, conversationId, markAsRead]);

  return {
    messages,
    conversation,
    loading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    loadMoreMessages,
  };
}

export function useTypingIndicators(
  conversationId: string | null,
  userId: string | null,
  studentId: string | null
): UseTypingIndicatorsReturn {
  const [typingUsers, setTypingUsers] = useState<ConversationParticipant[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId || !userId) return;

      try {
        if (isTyping) {
          // Insert typing indicator
          await supabase.from('typing_indicators').insert({
            conversation_id: conversationId,
            user_id: userId,
            student_id: studentId || null,
          });

          // Auto-remove after 3 seconds
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
          }, 3000);
        } else {
          // Remove typing indicator
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          await supabase
            .from('typing_indicators')
            .delete()
            .match({ conversation_id: conversationId, user_id: userId });
        }
      } catch (err) {
        console.error('Error updating typing indicator:', err);
      }
    },
    [conversationId, userId, studentId]
  );

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async payload => {
          // Fetch current typing indicators
          const { data } = await supabase
            .from('typing_indicators')
            .select('*, user_id, student_id')
            .eq('conversation_id', conversationId)
            .gt('created_at', new Date(Date.now() - 5000).toISOString());

          setTypingUsers((data as unknown as ConversationParticipant[]) || []);
        }
      )
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      channel.unsubscribe();
    };
  }, [conversationId]);

  return {
    typingUsers,
    setTyping,
  };
}
