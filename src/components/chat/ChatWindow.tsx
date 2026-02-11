import { useRef, useEffect, useState } from 'react';
import { useChat, useTypingIndicators, ChatMessage as ChatMessageType, Conversation } from '@/hooks/useChat';
import { ChatMessageComponent } from './ChatMessage';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  conversationId: string | null;
  userId: string | null;
  studentId: string | null;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChatWindow({
  conversationId,
  userId,
  studentId,
  onBack,
  showBackButton = true,
}: ChatWindowProps) {
  const { messages, conversation, loading, error, sendMessage, markAsRead } = useChat(
    conversationId,
    userId,
    studentId
  );
  const { typingUsers, setTyping } = useTypingIndicators(conversationId, userId, studentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when viewing conversation
  useEffect(() => {
    if (conversationId) {
      markAsRead();
    }
  }, [conversationId, markAsRead]);

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No conversation selected</p>
          <p className="text-sm">Choose a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Loading conversation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium">Failed to load conversation</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getConversationTitle = () => {
    if (!conversation) return 'Chat';

    if (conversation.type === 'group') {
      return conversation.title || 'Group Chat';
    }

    // For direct messages, find the other participant
    if (conversation.participants && conversation.participants.length > 1) {
      const other = conversation.participants.find(p => p.user_id || p.student_id);
      return other?.user_name || other?.student_name || 'Unknown';
    }

    return 'Chat';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h2 className="font-semibold text-lg">{getConversationTitle()}</h2>
            <p className="text-xs text-muted-foreground">
              {conversation?.type === 'group'
                ? `${conversation.participants?.length || 0} members`
                : 'Direct message'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(message => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                isOwn={message.sender_user_id === userId || message.sender_student_id === studentId}
                senderName={message.sender_name || 'Unknown'}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && <div className="px-6 py-2">
        <TypingIndicator typingUsers={typingUsers} />
      </div>}

      {/* Message Input */}
      <div className="border-t px-6 py-4">
        <MessageInput
          onSendMessage={sendMessage}
          onTyping={setTyping}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}
