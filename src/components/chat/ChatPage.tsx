import { useState } from 'react';
import { useConversations } from '@/hooks/useChat';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { NewConversationDialog } from './NewConversationDialog';

interface ChatPageProps {
  userId: string | null;
  studentId: string | null;
  userType?: 'admin' | 'teacher' | 'student';
}

export function ChatPage({ userId, studentId, userType }: ChatPageProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newConversationDialogOpen, setNewConversationDialogOpen] = useState(false);
  const { conversations, loading } = useConversations(userId, studentId);

  const handleNewConversation = () => {
    setNewConversationDialogOpen(true);
  };

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setNewConversationDialogOpen(false);
  };

  return (
    <div className="h-screen flex gap-0 bg-background">
      {/* Conversation List */}
      <div className="w-80 border-r flex flex-col">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onNewConversation={handleNewConversation}
          isLoading={loading}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        <ChatWindow
          conversationId={selectedConversationId}
          userId={userId}
          studentId={studentId}
          showBackButton={false}
        />
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={newConversationDialogOpen}
        onOpenChange={setNewConversationDialogOpen}
        onConversationCreated={handleConversationCreated}
        userId={userId}
        studentId={studentId}
      />
    </div>
  );
}
