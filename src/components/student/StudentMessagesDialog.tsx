import { useState } from 'react';
import { format } from 'date-fns';
import { Mail, MailOpen, CheckCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  subject: string | null;
  content: string;
  sender_type: string;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string;
}

interface StudentMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
}

export function StudentMessagesDialog({
  open,
  onOpenChange,
  messages,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
}: StudentMessagesDialogProps) {
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  const handleMessageClick = async (message: Message) => {
    if (expandedMessageId === message.id) {
      setExpandedMessageId(null);
    } else {
      setExpandedMessageId(message.id);
      if (!message.is_read) {
        await onMarkAsRead(message.id);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Your Messages
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </DialogTitle>
          </div>
          <DialogDescription>
            Messages from your teachers and administrators
          </DialogDescription>
        </DialogHeader>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            className="w-full"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MailOpen className="h-10 w-10 mb-2" />
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'p-4 rounded-lg border cursor-pointer transition-colors',
                    !message.is_read
                      ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                      : 'bg-card hover:bg-accent/50'
                  )}
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!message.is_read ? (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-muted flex-shrink-0" />
                      )}
                      <div>
                        <h4
                          className={cn(
                            'text-sm',
                            !message.is_read ? 'font-semibold' : 'font-medium'
                          )}
                        >
                          {message.subject || 'No Subject'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          From: {message.sender_type === 'admin' ? 'Admin' : 'Teacher'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), 'MMM d, yyyy')}
                      </span>
                      {!message.is_read && (
                        <Badge variant="default" className="text-xs">
                          NEW
                        </Badge>
                      )}
                    </div>
                  </div>

                  {expandedMessageId === message.id && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(message.created_at), 'MMMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
