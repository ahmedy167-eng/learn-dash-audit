import { ChatMessage as ChatMessageType } from '@/hooks/useChat';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  senderName: string;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  showActions?: boolean;
}

export function ChatMessageComponent({
  message,
  isOwn,
  senderName,
  onEdit,
  onDelete,
  showActions = true,
}: MessageProps) {
  return (
    <div
      className={cn('flex gap-3 mb-4 animate-in fade-in-50', {
        'flex-row-reverse': isOwn,
      })}
    >
      {/* Avatar placeholder */}
      <div
        className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', {
          'bg-primary text-primary-foreground': isOwn,
          'bg-muted': !isOwn,
        })}
      >
        {senderName.charAt(0).toUpperCase()}
      </div>

      <div
        className={cn('flex flex-col gap-1 max-w-xs', {
          'items-end': isOwn,
        })}
      >
        {!isOwn && <span className="text-xs text-muted-foreground">{senderName}</span>}

        <div className="flex items-end gap-2">
          <div
            className={cn('px-3 py-2 rounded-lg break-words', {
              'bg-primary text-primary-foreground': isOwn,
              'bg-muted': !isOwn,
            })}
          >
            <p className="text-sm">{message.content}</p>
            {message.edited_at && (
              <p className="text-xs opacity-70 mt-1">(edited)</p>
            )}
          </div>

          {showActions && isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(message.id)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(message.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <span className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
