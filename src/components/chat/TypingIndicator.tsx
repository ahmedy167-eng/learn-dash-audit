import { ConversationParticipant } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  typingUsers: ConversationParticipant[];
  className?: string;
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getDisplayName = (user: ConversationParticipant) => {
    return user.user_name || user.student_name || 'Someone';
  };

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
      </div>
      <span>
        {typingUsers.length === 1
          ? `${getDisplayName(typingUsers[0])} is typing...`
          : `${typingUsers.length} people are typing...`}
      </span>
    </div>
  );
}
