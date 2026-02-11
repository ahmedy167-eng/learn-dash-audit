import { useState, useRef, useEffect } from 'react';
import { useAdminConversations, useAdminMessages } from '@/hooks/useAdminChat';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

interface AdminChatProps {
  userId: string | null;
}

export function AdminChat({ userId }: AdminChatProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [allAdmins, setAllAdmins] = useState<Array<{ id: string; name: string }>>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { conversations, loading: convsLoading } = useAdminConversations(userId);
  const { messages, sendMessage } = useAdminMessages(selectedConversationId, userId);

  // Fetch all admins for new conversation dialog
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .neq('user_id', userId)
          .not('user_id', 'is', null)
          .limit(50);

        if (data) {
          setAllAdmins(
            data.map(admin => ({
              id: admin.user_id,
              name: admin.full_name || 'Unknown Admin',
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching admins:', err);
      }
    };

    if (userId) {
      fetchAdmins();
    }
  }, [userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversationId) return;

    const input = messageInput;
    setMessageInput('');

    const success = await sendMessage(input);
    if (!success) {
      setMessageInput(input); // Restore input if send failed
    }
  };

  const handleStartChat = async (adminId: string) => {
    if (!userId) return;

    const { getOrCreateConversation } = useAdminConversations(userId);
    const conv = await getOrCreateConversation(adminId);

    if (conv) {
      setSelectedConversationId(conv.id);
      setShowNewChat(false);
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversationId);

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please log in to access admin chat</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 p-4 bg-background">
      {/* Conversations List */}
      <Card className="w-80 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Admin Chat</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNewChat(!showNewChat)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showNewChat && (
          <div className="p-3 border-b space-y-2">
            <p className="text-sm font-medium">Start new chat</p>
            <ScrollArea className="h-40">
              <div className="space-y-1 pr-4">
                {allAdmins.map(admin => (
                  <Button
                    key={admin.id}
                    variant="ghost"
                    className="w-full justify-start text-sm h-8"
                    onClick={() => handleStartChat(admin.id)}
                  >
                    {admin.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-3">
            {convsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No conversations</p>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    selectedConversationId === conv.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm truncate">
                        {conv.other_admin_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message || 'No messages yet'}
                      </p>
                    </div>
                    {conv.unread_count && conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Window */}
      <Card className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b">
              <h3 className="font-semibold">{selectedConv.other_admin_name}</h3>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_id === userId ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        msg.sender_id === userId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" className="h-10 w-10">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              {conversations.length === 0
                ? 'Start a new chat with other admins'
                : 'Select a conversation to start chatting'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
