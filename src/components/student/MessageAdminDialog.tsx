import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

interface MessageAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessageAdminDialog({ open, onOpenChange }: MessageAdminDialogProps) {
  const { student } = useStudentAuth();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!student || !content.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert([{
        sender_type: 'student',
        sender_student_id: student.id,
        recipient_type: 'admin',
        subject: subject.trim() || null,
        content: content.trim(),
      }]);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert([{
        student_id: student.id,
        user_type: 'student',
        action: 'send_message',
      }]);

      toast.success('Message sent to admin');
      setSubject('');
      setContent('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Admin
          </DialogTitle>
          <DialogDescription>
            Send a message to your instructor or administrator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message here..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!content.trim() || sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
