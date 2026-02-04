import { useState, useEffect } from 'react';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useStudentApi } from '@/hooks/useStudentApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

interface MessageAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Recipient {
  user_id: string | null;
  full_name: string | null;
  type: 'general_admin' | 'admin' | 'teacher';
  label: string;
}

export function MessageAdminDialog({ open, onOpenChange }: MessageAdminDialogProps) {
  const { student } = useStudentAuth();
  const { getRecipients, performAction } = useStudentApi();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Fetch recipients securely via Edge Function when dialog opens
  useEffect(() => {
    const fetchRecipients = async () => {
      if (!open || !student) return;

      setLoadingRecipients(true);
      try {
        const { data, error } = await getRecipients();

        if (error) {
          console.error('Error fetching recipients:', error);
          // Fallback to general admin only
          setRecipients([
            {
              user_id: null,
              full_name: null,
              type: 'general_admin',
              label: 'Administrator (General Inquiries)',
            },
          ]);
          setSelectedRecipientId('general');
          return;
        }

        if (data && data.length > 0) {
          setRecipients(data);
          // Set default to teacher if available, otherwise general admin
          const teacherRecipient = data.find(r => r.type === 'teacher');
          const defaultRecipient = teacherRecipient || data[0];
          setSelectedRecipientId(defaultRecipient.user_id ?? 'general');
        }
      } catch (error) {
        console.error('Error fetching recipients:', error);
        setRecipients([
          {
            user_id: null,
            full_name: null,
            type: 'general_admin',
            label: 'Administrator (General Inquiries)',
          },
        ]);
        setSelectedRecipientId('general');
      } finally {
        setLoadingRecipients(false);
      }
    };

    fetchRecipients();
  }, [open, student, getRecipients]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSubject('');
      setContent('');
      setSelectedRecipientId('');
    }
  }, [open]);

  const handleSend = async () => {
    if (!student || !content.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!selectedRecipientId) {
      toast.error('Please select a recipient');
      return;
    }

    const selectedRecipient = recipients.find(
      r => (r.user_id ?? 'general') === selectedRecipientId
    );
    if (!selectedRecipient) {
      toast.error('Invalid recipient selected');
      return;
    }

    setSending(true);
    try {
      const { error } = await performAction('send_message', {
        recipientType: selectedRecipient.type === 'teacher' ? 'teacher' : 'admin',
        recipientUserId: selectedRecipient.user_id,
        subject: subject.trim() || null,
        content: content.trim(),
      });

      if (error) throw error;

      toast.success(`Message sent to ${selectedRecipient.label}`);
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

  const teacherRecipients = recipients.filter(r => r.type === 'teacher');
  const adminRecipients = recipients.filter(r => r.type === 'admin' || r.type === 'general_admin');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Message
          </DialogTitle>
          <DialogDescription>
            Send a message to your teacher or an administrator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Selection Dropdown */}
          <div className="space-y-2">
            <Label>Select Recipient</Label>
            <Select
              value={selectedRecipientId}
              onValueChange={setSelectedRecipientId}
              disabled={loadingRecipients}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingRecipients ? 'Loading...' : 'Select a recipient...'} />
              </SelectTrigger>
              <SelectContent>
                {/* Teachers */}
                {teacherRecipients.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Teachers</SelectLabel>
                    {teacherRecipients.map(r => (
                      <SelectItem key={r.user_id ?? 'teacher'} value={r.user_id ?? 'general'}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {/* Administrators */}
                {adminRecipients.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Administrators</SelectLabel>
                    {adminRecipients.map(r => (
                      <SelectItem key={r.user_id ?? 'general'} value={r.user_id ?? 'general'}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

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
          <Button onClick={handleSend} disabled={!content.trim() || !selectedRecipientId || sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
