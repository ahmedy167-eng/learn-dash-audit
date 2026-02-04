import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageSquare, Send, User, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MessageAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TeacherInfo {
  user_id: string;
  full_name: string | null;
}

export function MessageAdminDialog({ open, onOpenChange }: MessageAdminDialogProps) {
  const { student } = useStudentAuth();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientType, setRecipientType] = useState<'teacher' | 'admin'>('admin');
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [loadingTeacher, setLoadingTeacher] = useState(false);

  // Fetch teacher info when dialog opens
  useEffect(() => {
    const fetchTeacher = async () => {
      if (!open || !student?.section_id) {
        setTeacher(null);
        return;
      }

      setLoadingTeacher(true);
      try {
        // Get section to find user_id (teacher)
        const { data: section, error: sectionError } = await supabase
          .from('sections')
          .select('user_id')
          .eq('id', student.section_id)
          .single();

        if (sectionError || !section?.user_id) {
          setTeacher(null);
          return;
        }

        // Get teacher's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('user_id', section.user_id)
          .single();

        if (profileError) {
          setTeacher(null);
          return;
        }

        setTeacher(profile);
      } catch (error) {
        console.error('Error fetching teacher:', error);
        setTeacher(null);
      } finally {
        setLoadingTeacher(false);
      }
    };

    fetchTeacher();
  }, [open, student?.section_id]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSubject('');
      setContent('');
      setRecipientType(teacher ? 'teacher' : 'admin');
    }
  }, [open, teacher]);

  // Set default recipient when teacher info loads
  useEffect(() => {
    if (teacher) {
      setRecipientType('teacher');
    } else {
      setRecipientType('admin');
    }
  }, [teacher]);

  const handleSend = async () => {
    if (!student || !content.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (recipientType === 'teacher' && !teacher) {
      toast.error('No teacher assigned to your section');
      return;
    }

    setSending(true);
    try {
      const messageData = {
        sender_type: 'student',
        sender_student_id: student.id,
        recipient_type: recipientType,
        recipient_user_id: recipientType === 'teacher' ? teacher?.user_id : null,
        subject: subject.trim() || null,
        content: content.trim(),
      };

      const { error } = await supabase.from('messages').insert([messageData]);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert([{
        student_id: student.id,
        user_type: 'student',
        action: 'send_message',
      }]);

      toast.success(`Message sent to ${recipientType === 'teacher' ? 'your teacher' : 'admin'}`);
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

  const hasTeacher = !!teacher;

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
          {/* Recipient Selection */}
          <div className="space-y-3">
            <Label>Send to</Label>
            <RadioGroup
              value={recipientType}
              onValueChange={(value) => setRecipientType(value as 'teacher' | 'admin')}
              className="space-y-2"
            >
              {/* Teacher Option */}
              <label
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  recipientType === 'teacher' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50',
                  !hasTeacher && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RadioGroupItem 
                  value="teacher" 
                  disabled={!hasTeacher || loadingTeacher}
                  className="shrink-0"
                />
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">My Teacher</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {loadingTeacher 
                        ? 'Loading...' 
                        : hasTeacher 
                          ? teacher.full_name || 'Unknown Teacher'
                          : 'No teacher assigned'
                      }
                    </p>
                  </div>
                </div>
              </label>

              {/* Admin Option */}
              <label
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  recipientType === 'admin' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value="admin" className="shrink-0" />
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Administrator</p>
                    <p className="text-xs text-muted-foreground">General inquiries</p>
                  </div>
                </div>
              </label>
            </RadioGroup>
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
          <Button onClick={handleSend} disabled={!content.trim() || sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
