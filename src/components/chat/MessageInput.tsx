import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<boolean>;
  onTyping?: (isTyping: boolean) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Send typing indicator
    if (e.target.value && !isTyping) {
      setIsTyping(true);
      await onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    if (e.target.value) {
      typingTimeoutRef.current = setTimeout(async () => {
        setIsTyping(false);
        await onTyping?.(false);
      }, 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setIsTyping(false);

    try {
      const success = await onSendMessage(content);
      if (success) {
        setContent('');
        await onTyping?.(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1 relative">
        <Input
          value={content}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="resize-none rounded-lg border border-input bg-background px-3 py-2"
        />
      </div>
      <Button
        type="submit"
        disabled={disabled || isLoading || !content.trim()}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </form>
  );
}
