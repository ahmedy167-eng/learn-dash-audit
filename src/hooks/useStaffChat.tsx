import { useState, useEffect, useCallback, useRef } from 'react';
<<<<<<< HEAD
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StaffMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'user';
  messageRole: 'admin' | 'teacher';
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
  const isMountedRef = useRef(true);

  // Refs for mutable state used inside realtime callbacks & effects
  const userIdRef = useRef<string | null>(null);
  const staffMembersRef = useRef<StaffMember[]>([]);
  const selectedContactRef = useRef<StaffMember | null>(null);
  const currentUserMessageRoleRef = useRef<'admin' | 'teacher'>('teacher');

  // Keep refs in sync
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);
  useEffect(() => { staffMembersRef.current = staffMembers; }, [staffMembers]);
  useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
  useEffect(() => { currentUserMessageRoleRef.current = currentUserMessageRole; }, [currentUserMessageRole]);

  // Cleanup mounted flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Fetch current user's role for message type mapping
  const fetchCurrentUserRole = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current user role:', error);
      return;
    }

    if (!isMountedRef.current) return;
    const role = (data?.role || 'user') as 'admin' | 'user';
    setCurrentUserMessageRole(mapRoleToMessageType(role));
  }, []);

  // Fetch all staff members with their roles
  const fetchStaffMembers = useCallback(async (): Promise<StaffMember[] | undefined> => {
    const uid = userIdRef.current;
    if (!uid) return;

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

    if (!isMountedRef.current) return;

    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    const members: StaffMember[] = (profiles || [])
      .filter(p => p.user_id !== uid)
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
  }, []);

  // Fetch conversation previews (latest message + unread count per contact)
  const fetchConversations = useCallback(async (members?: StaffMember[]) => {
    const uid = userIdRef.current;
    if (!uid) return;

    const staffList = members || staffMembersRef.current;

    const { data: allMessages, error } = await supabase
      .from('messages')
      .select('*')
      .in('sender_type', ['admin', 'teacher'])
      .in('recipient_type', ['admin', 'teacher'])
      .or(`sender_user_id.eq.${uid},recipient_user_id.eq.${uid}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    if (!isMountedRef.current) return;

    // Group by contact
    const contactMap = new Map<string, { messages: typeof allMessages }>();
    
    for (const msg of allMessages || []) {
      const contactId = msg.sender_user_id === uid 
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
        m => m.recipient_user_id === uid && !m.is_read
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
  }, []);

  // Fetch messages for a specific conversation thread
  const fetchThread = useCallback(async (contactId: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    setMessagesLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('sender_type', ['admin', 'teacher'])
      .in('recipient_type', ['admin', 'teacher'])
      .or(
        `and(sender_user_id.eq.${uid},recipient_user_id.eq.${contactId}),and(sender_user_id.eq.${contactId},recipient_user_id.eq.${uid})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching thread:', error);
      if (isMountedRef.current) setMessagesLoading(false);
      return;
    }

    if (!isMountedRef.current) return;

    setMessages(data || []);
    setMessagesLoading(false);

    // Mark unread messages as read
    const unreadIds = (data || [])
      .filter(m => m.recipient_user_id === uid && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      // Refresh conversations to update unread counts
      fetchConversations();
    }
  }, [fetchConversations]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    const uid = userIdRef.current;
    const contact = selectedContactRef.current;
    const msgRole = currentUserMessageRoleRef.current;
    if (!uid || !contact || !content.trim()) return;

    const { error } = await supabase.from('messages').insert({
      content: content.trim(),
      sender_user_id: uid,
      recipient_user_id: contact.user_id,
      sender_type: msgRole,
      recipient_type: contact.messageRole,
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
  }, []);

  // Select a contact and load thread
  const selectContact = useCallback((contact: StaffMember) => {
    setSelectedContact(contact);
    fetchThread(contact.user_id);
  }, [fetchThread]);

  // Set up realtime subscription — depends only on user?.id
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;

    channelRef.current = supabase
      .channel('staff-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_user_id=eq.${uid}`,
        },
        (payload) => {
          const newMsg = payload.new as StaffMessage & { sender_type: string; recipient_type: string };

          // Only handle staff-to-staff messages
          const staffTypes = ['admin', 'teacher'];
          if (!staffTypes.includes(newMsg.sender_type) || !staffTypes.includes(newMsg.recipient_type)) {
            return;
          }

          const currentContact = selectedContactRef.current;

          // If this message is part of the active conversation, add it
          if (
            currentContact &&
            newMsg.sender_user_id === currentContact.user_id &&
            newMsg.recipient_user_id === uid
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
          filter: `sender_user_id=eq.${uid}`,
        },
        (payload) => {
          const newMsg = payload.new as StaffMessage & { sender_type: string; recipient_type: string };

          const staffTypes = ['admin', 'teacher'];
          if (!staffTypes.includes(newMsg.sender_type) || !staffTypes.includes(newMsg.recipient_type)) {
            return;
          }

          const currentContact = selectedContactRef.current;

          // If this is our own sent message in the active conversation, add it
          if (
            currentContact &&
            newMsg.sender_user_id === uid &&
            newMsg.recipient_user_id === currentContact.user_id
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
=======
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StaffMessage {
  id: string;
  sender_user_id: string | null;
  recipient_user_id: string | null;
  sender_type: string | null;
  recipient_type: string | null;
  content: string;
  created_at: string;
}

export interface StaffProfile {
  id: string;
  full_name: string;
  role?: string;
}

export function useStaffList(currentUserId: string | null) {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .neq('user_id', currentUserId)
        .limit(200);

      if (error) throw error;

      setStaff((data || []).map((p: any) => ({ id: p.user_id, full_name: p.full_name || 'Unknown', role: p.role })));
    } catch (err) {
      console.error('Failed to fetch staff list', err);
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return { staff, loading, refetch: fetchStaff };
}

export function useStaffConversations(currentUserId: string | null) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // Try RPC for optimized fetch first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_staff_conversations', { p_user_id: currentUserId });

      // Regardless of source, we'll normalize entries to include contactId, lastMessage and lastMessageTime
      let convEntries: Array<any> = [];

      if (!rpcError && rpcData) {
        convEntries = rpcData;
      } else {
        // Fallback: fetch last messages involving current user
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_user_id.eq.${currentUserId},recipient_user_id.eq.${currentUserId}`)
          .eq('sender_type', 'staff')
          .eq('recipient_type', 'staff')
          .order('created_at', { ascending: false })
          .limit(1000);

        const grouped: Record<string, any> = {};
        (msgs || []).forEach((m: any) => {
          const contactId = m.sender_user_id === currentUserId ? m.recipient_user_id : m.sender_user_id;
          if (!contactId) return;
          if (!grouped[contactId]) grouped[contactId] = m;
        });

        convEntries = Object.entries(grouped).map(([contactId, msg]) => ({ contact_id: contactId, last_message: msg.content, last_message_time: msg.created_at, last_message_obj: msg }));
      }

      // Fetch read receipts for current user to compute unread counts
      const { data: receipts } = await supabase
        .from('message_read_receipts')
        .select('message_id')
        .eq('user_id', currentUserId);

      const readIds = new Set((receipts || []).map((r: any) => r.message_id));

      // For each conversation entry compute unread count
      const enhanced: any[] = [];
      for (const entry of convEntries) {
        const contactId = entry.contact_id || entry.contactId || entry.contactid || entry.contact;
        if (!contactId) continue;

        // last message preview + time
        const lastMessage = entry.last_message || entry.lastMessage || entry.last_message_obj?.content || null;
        const lastMessageTime = entry.last_message_time || entry.lastMessage?.created_at || entry.last_message_obj?.created_at || null;

        // Count unread messages from contact to current user
        // First get messages where recipient_user_id = currentUserId and sender_user_id = contactId
        let unreadCount = 0;
        try {
          let q = supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_user_id', currentUserId)
            .eq('sender_user_id', contactId)
            .eq('sender_type', 'staff')
            .eq('recipient_type', 'staff');

          // exclude read ids if any
          const readArray = Array.from(readIds);
          if (readArray.length > 0) {
            // Use .not('id', 'in', (...)) format correctly
            const idList = readArray.map((id: string) => `"${id}"`).join(',');
            q = q.not('id', 'in', `(${idList})`);
          }

          const { count, error: countErr } = await q;
          if (!countErr) unreadCount = count || 0;
        } catch (e) {
          // ignore per-contact failures
          unreadCount = 0;
        }

        enhanced.push({ contactId, lastMessage, lastMessageTime, unreadCount });
      }

      setConversations(enhanced);
    } catch (err) {
      console.error('Failed to fetch staff conversations', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useStaffThread(currentUserId: string | null, otherUserId: string | null) {
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  const fetchThread = useCallback(async () => {
    if (!currentUserId || !otherUserId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_type', 'staff')
        .eq('recipient_type', 'staff')
        .or(`(sender_user_id.eq.${currentUserId},recipient_user_id.eq.${otherUserId}),(sender_user_id.eq.${otherUserId},recipient_user_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark as read using message_read_receipts if available
      try {
        await supabase
          .from('message_read_receipts')
          .insert((data || []).filter((m: any) => m.recipient_user_id === currentUserId).map((m: any) => ({ message_id: m.id, user_id: currentUserId })));
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('Failed to fetch thread', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    fetchThread();

    // subscribe to staff messages and update thread
    if (channelRef.current) {
      try { channelRef.current.unsubscribe(); } catch (e) {}
    }

    channelRef.current = supabase
      .channel('staff-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_type=eq.staff` }, payload => {
        const m = payload.new as any;
        if (!m) return;
        const involves = (m.sender_user_id === currentUserId && m.recipient_user_id === otherUserId) || (m.sender_user_id === otherUserId && m.recipient_user_id === currentUserId);
        if (involves) {
          setMessages(prev => [...prev, m]);
        }
      })
>>>>>>> 15607fb (latest clock code)
      .subscribe();

    return () => {
      if (channelRef.current) {
<<<<<<< HEAD
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, fetchConversations]);

  // Initial load — depends only on user?.id
  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true);
      await fetchCurrentUserRole();
      const members = await fetchStaffMembers();
      if (members && isMountedRef.current) {
        await fetchConversations(members);
      }
      if (isMountedRef.current) setLoading(false);
    };
    init();
  }, [user?.id, fetchStaffMembers, fetchCurrentUserRole, fetchConversations]);

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
=======
        try { channelRef.current.unsubscribe(); } catch (e) {}
      }
    };
  }, [fetchThread]);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentUserId || !otherUserId) return false;
    try {
      const { error } = await supabase.from('messages').insert({
        sender_user_id: currentUserId,
        recipient_user_id: otherUserId,
        sender_type: 'staff',
        recipient_type: 'staff',
        content: content,
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to send staff message', err);
      toast.error('Failed to send message');
      return false;
    }
  }, [currentUserId, otherUserId]);

  return { messages, loading, fetchThread, sendMessage };
>>>>>>> 15607fb (latest clock code)
}
