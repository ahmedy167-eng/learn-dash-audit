import { Conversation } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading = false,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;

    return conversations.filter(conv => {
      const title = conv.title || 'Untitled';
      const lastMessageContent = conv.last_message?.content || '';
      return (
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lastMessageContent.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [conversations, searchQuery]);

  const getConversationTitle = (conv: Conversation) => {
    if (conv.type === 'group') {
      return conv.title || 'Group Chat';
    }

    // For direct messages, find the other participant's name
    if (conv.participants && conv.participants.length > 1) {
      const other = conv.participants.find(p => p.user_id || p.student_id);
      return other?.user_name || other?.student_name || 'Unknown';
    }

    return 'Direct Message';
  };

  const getConversationPreview = (conv: Conversation) => {
    if (!conv.last_message) return 'No messages yet';
    return conv.last_message.content.substring(0, 50) + (conv.last_message.content.length > 50 ? '...' : '');
  };

  return (
    <div className="h-full flex flex-col border-r bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg mb-4">Messages</h2>
        <Button onClick={onNewConversation} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              Loading...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
              No conversations yet
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg hover:bg-accent transition-colors',
                  selectedConversationId === conv.id && 'bg-accent'
                )}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium truncate flex-1">
                    {getConversationTitle(conv)}
                  </h3>
                  {conv.unread_count && conv.unread_count > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 ml-2">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {getConversationPreview(conv)}
                </p>
                {conv.updated_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
