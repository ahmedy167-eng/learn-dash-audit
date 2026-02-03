import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  full_name: string;
  student_id: string;
}

interface PostNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function PostNoticeDialog({ open, onOpenChange, student }: PostNoticeDialogProps) {
  const { user } = useAuth();
  const [noticeType, setNoticeType] = useState('info');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!student || !title.trim() || !content.trim() || !user) {
      toast.error('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('student_notices').insert([{
        student_id: student.id,
        posted_by: user.id,
        notice_type: noticeType,
        title: title.trim(),
        content: content.trim(),
      }]);

      if (error) throw error;

      toast.success('Notice sent to student');
      setTitle('');
      setContent('');
      setNoticeType('info');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending notice:', error);
      toast.error('Failed to send notice');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setNoticeType('info');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Post Notice to {student?.full_name}
          </DialogTitle>
          <DialogDescription>
            This notice will appear on the student's dashboard. (ID: {student?.student_id})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Notice Type</Label>
            <Select value={noticeType} onValueChange={setNoticeType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">ℹ️ Information</SelectItem>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="attendance">📋 Attendance</SelectItem>
                <SelectItem value="achievement">🏆 Achievement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notice title..."
            />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message to the student..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!title.trim() || !content.trim() || sending}>
            {sending ? 'Sending...' : 'Post Notice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
