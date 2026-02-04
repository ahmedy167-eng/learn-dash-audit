import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
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
  user_id: string;
  full_name: string | null;
  type: 'general_admin' | 'admin' | 'teacher';
  label: string;
}

export function MessageAdminDialog({ open, onOpenChange }: MessageAdminDialogProps) {
  const { student } = useStudentAuth();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Fetch only the student's assigned teacher when dialog opens
  useEffect(() => {
    const fetchRecipients = async () => {
      if (!open || !student) return;

      setLoadingRecipients(true);
      try {
        // Build recipient list - always start with general admin option
        const recipientList: Recipient[] = [
          {
            user_id: 'general',
            full_name: null,
            type: 'general_admin',
            label: 'Administrator (General Inquiries)',
          },
        ];

        // Only fetch the student's assigned teacher if they have a section
        if (student.section_id) {
          const { data: section } = await supabase
            .from('sections')
            .select('user_id')
            .eq('id', student.section_id)
            .single();

          if (section?.user_id) {
            const { data: teacherProfile } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .eq('user_id', section.user_id)
              .single();

            if (teacherProfile) {
              recipientList.push({
                user_id: teacherProfile.user_id,
                full_name: teacherProfile.full_name,
                type: 'teacher',
                label: teacherProfile.full_name || 'My Teacher',
              });
            }
          }
        }

        setRecipients(recipientList);
        // Set default to teacher if available, otherwise general admin
        const teacherRecipient = recipientList.find(r => r.type === 'teacher');
        setSelectedRecipientId(teacherRecipient?.user_id || 'general');
      } catch (error) {
        console.error('Error fetching recipients:', error);
        // Fallback to general admin only
        setRecipients([
          {
            user_id: 'general',
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
  }, [open, student]);

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

    const selectedRecipient = recipients.find(r => r.user_id === selectedRecipientId);
    if (!selectedRecipient) {
      toast.error('Invalid recipient selected');
      return;
    }

    setSending(true);
    try {
      let messageData;

      if (selectedRecipient.type === 'general_admin') {
        // Send to any admin (recipient_user_id = null)
        messageData = {
          sender_type: 'student',
          sender_student_id: student.id,
          recipient_type: 'admin',
          recipient_user_id: null,
          subject: subject.trim() || null,
          content: content.trim(),
        };
      } else {
        // Send to specific user (teacher or specific admin)
        messageData = {
          sender_type: 'student',
          sender_student_id: student.id,
          recipient_type: selectedRecipient.type,
          recipient_user_id: selectedRecipient.user_id,
          subject: subject.trim() || null,
          content: content.trim(),
        };
      }

      const { error } = await supabase.from('messages').insert([messageData]);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert([{
        student_id: student.id,
        user_type: 'student',
        action: 'send_message',
      }]);

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
            Send a message to a teacher or administrator
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
                {/* General Admin Option */}
                <SelectGroup>
                  <SelectLabel>General</SelectLabel>
                  {adminRecipients.filter(r => r.type === 'general_admin').map(r => (
                    <SelectItem key={r.user_id} value={r.user_id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>

                {/* Teachers */}
                {teacherRecipients.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Teachers</SelectLabel>
                    {teacherRecipients.map(r => (
                      <SelectItem key={r.user_id} value={r.user_id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {/* Specific Admins */}
                {adminRecipients.filter(r => r.type === 'admin').length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Administrators</SelectLabel>
                    {adminRecipients.filter(r => r.type === 'admin').map(r => (
                      <SelectItem key={r.user_id} value={r.user_id}>
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
