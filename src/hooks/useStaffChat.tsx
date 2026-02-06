import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StaffMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'user';
  messageRole: 'admin' | 'teacher'; // mapped role for messages table
}

export interface StaffMessage {
  id: string;
  content: string;
  sender_user_id: string | null;
  recipient_user_id: string | null;
  created_at: string;
  is_read: boolean | null;
}

export interface ConversationPreview {
  contact: StaffMember;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

/** Map user_roles.role → messages sender_type/recipient_type */
function mapRoleToMessageType(role: 'admin' | 'user'): 'admin' | 'teacher' {
  return role === 'admin' ? 'admin' : 'teacher';
}

export function useStaffChat() {
  const { user } = useAuth();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [currentUserMessageRole, setCurrentUserMessageRole] = useState<'admin' | 'teacher'>('teacher');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch current user's role for message type mapping
  const fetchCurrentUserRole = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current user role:', error);
      return;
    }

    const role = (data?.role || 'user') as 'admin' | 'user';
    setCurrentUserMessageRole(mapRoleToMessageType(role));
  }, [user]);

  // Fetch all staff members with their roles
  const fetchStaffMembers = useCallback(async () => {
    if (!user) return;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return;
    }

    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    const members: StaffMember[] = (profiles || [])
      .filter(p => p.user_id !== user.id)
      .map(p => {
        const role = (roleMap.get(p.user_id) || 'user') as 'admin' | 'user';
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          role,
          messageRole: mapRoleToMessageType(role),
        };
      });

    setStaffMembers(members);
    return members;
  }, [user]);

  // Fetch conversation previews (latest message + unread count per contact)
  const fetchConversations = useCallback(async (members?: StaffMember[]) => {
    if (!user) return;

    const staffList = members || staffMembers;

    const { data: allMessages, error } = await supabase
      .from('messages')
      .select('*')
      .in('sender_type', ['admin', 'teacher'])
      .in('recipient_type', ['admin', 'teacher'])
      .or(`sender_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    // Group by contact
    const contactMap = new Map<string, { messages: typeof allMessages }>();
    
    for (const msg of allMessages || []) {
      const contactId = msg.sender_user_id === user.id 
        ? msg.recipient_user_id 
        : msg.sender_user_id;
      
      if (!contactId) continue;

      if (!contactMap.has(contactId)) {
        contactMap.set(contactId, { messages: [] });
      }
      contactMap.get(contactId)!.messages.push(msg);
    }

    const previews: ConversationPreview[] = [];
    let unreadTotal = 0;

    for (const [contactId, data] of contactMap) {
      const contact = staffList.find(s => s.user_id === contactId);
      if (!contact) continue;

      const latest = data.messages[0];
      const unreadCount = data.messages.filter(
        m => m.recipient_user_id === user.id && !m.is_read
      ).length;

      unreadTotal += unreadCount;

      previews.push({
        contact,
        lastMessage: latest.content,
        lastMessageTime: latest.created_at,
        unreadCount,
      });
    }

    // Sort by latest message time
    previews.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    setConversations(previews);
    setTotalUnread(unreadTotal);
  }, [user, staffMembers]);

  // Fetch messages for a specific conversation thread
  const fetchThread = useCallback(async (contactId: string) => {
    if (!user) return;
    setMessagesLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('sender_type', ['admin', 'teacher'])
      .in('recipient_type', ['admin', 'teacher'])
      .or(
        `and(sender_user_id.eq.${user.id},recipient_user_id.eq.${contactId}),and(sender_user_id.eq.${contactId},recipient_user_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching thread:', error);
      setMessagesLoading(false);
      return;
    }

    setMessages(data || []);
    setMessagesLoading(false);

    // Mark unread messages as read
    const unreadIds = (data || [])
      .filter(m => m.recipient_user_id === user.id && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      // Refresh conversations to update unread counts
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !selectedContact || !content.trim()) return;

    const { error } = await supabase.from('messages').insert({
      content: content.trim(),
      sender_user_id: user.id,
      recipient_user_id: selectedContact.user_id,
      sender_type: currentUserMessageRole,
      recipient_type: selectedContact.messageRole,
    });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Message failed',
        description: 'Could not send your message. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }, [user, selectedContact, currentUserMessageRole]);

  // Select a contact and load thread
  const selectContact = useCallback((contact: StaffMember) => {
    setSelectedContact(contact);
    fetchThread(contact.user_id);
  }, [fetchThread]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    channelRef.current = supabase
      .channel('staff-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as StaffMessage & { sender_type: string; recipient_type: string };

          // Only handle staff-to-staff messages
          const staffTypes = ['admin', 'teacher'];
          if (!staffTypes.includes(newMsg.sender_type) || !staffTypes.includes(newMsg.recipient_type)) {
            return;
          }

          // If this message is part of the active conversation, add it
          if (
            selectedContact &&
            newMsg.sender_user_id === selectedContact.user_id &&
            newMsg.recipient_user_id === user.id
          ) {
            setMessages(prev => [...prev, newMsg]);
            
            // Auto-mark as read
            supabase
              .from('messages')
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then(() => fetchConversations());
          }

          // Always refresh conversation previews
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as StaffMessage & { sender_type: string; recipient_type: string };

          const staffTypes = ['admin', 'teacher'];
          if (!staffTypes.includes(newMsg.sender_type) || !staffTypes.includes(newMsg.recipient_type)) {
            return;
          }

          // If this is our own sent message in the active conversation, add it
          if (
            selectedContact &&
            newMsg.sender_user_id === user.id &&
            newMsg.recipient_user_id === selectedContact.user_id
          ) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, selectedContact, fetchConversations]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchCurrentUserRole();
      const members = await fetchStaffMembers();
      if (members) {
        await fetchConversations(members);
      }
      setLoading(false);
    };
    init();
  }, [fetchStaffMembers, fetchCurrentUserRole]);

  return {
    staffMembers,
    conversations,
    messages,
    selectedContact,
    loading,
    messagesLoading,
    totalUnread,
    selectContact,
    sendMessage,
    setSelectedContact,
  };
}
