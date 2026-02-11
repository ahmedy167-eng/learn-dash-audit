import { useState, useEffect } from 'react';
import { useConversations } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
  userId: string | null;
  studentId: string | null;
}

interface User {
  id: string;
  full_name: string;
  type: 'admin' | 'teacher' | 'student';
  prefixedId: string; // ID with type prefix for backend
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
  userId,
  studentId,
}: NewConversationDialogProps) {
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { createConversation } = useConversations(userId, studentId);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch admin/teacher users from profiles
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .neq('user_id', userId)
        .not('user_id', 'is', null)
        .limit(50);

      if (adminError) throw adminError;

      // Fetch other students if user type is student
      let studentData = [];
      if (studentId) {
        const { data: sData, error: sError } = await supabase
          .from('students')
          .select('id, full_name')
          .neq('id', studentId)
          .not('id', 'is', null)
          .limit(50);

        if (sError) throw sError;

        studentData = (sData || []).map(s => ({
          id: s.id,
          full_name: s.full_name,
          type: 'student' as const,
        })) || [];
      }

      const formattedAdminData =
        (adminData || [])
          .filter(u => u.user_id) // Ensure user_id is not null
          .map(u => ({
            id: u.user_id,
            full_name: u.full_name || 'Unknown User',
            type: 'admin' as const,
            prefixedId: `user-${u.user_id}`,
          })) || [];

      const formattedStudentData = studentData
        .filter(s => s.id) // Ensure id is not null
        .map(s => ({
          ...s,
          prefixedId: `student-${s.id}`,
        })) || [];

      setUsers([...formattedAdminData, ...formattedStudentData]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    if (conversationType === 'direct' && selectedUsers.length !== 1) {
      toast.error('Please select exactly one person for a direct message');
      return;
    }

    if (conversationType === 'group' && selectedUsers.length < 2) {
      toast.error('Please select at least 2 people for a group chat');
      return;
    }

    if (conversationType === 'group' && !groupTitle.trim()) {
      toast.error('Please enter a group title');
      return;
    }

    try {
      setIsCreating(true);

      const selectedUserData = selectedUsers
        .map(userId => users.find(u => u.id === userId))
        .filter((u): u is User => u !== undefined)
        .map(u => u.prefixedId);

      const conversation = await createConversation(
        selectedUserData,
        conversationType,
        conversationType === 'group' ? groupTitle : undefined
      );

      if (conversation) {
        onConversationCreated(conversation.id);
        resetDialog();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = () => {
    setConversationType('direct');
    setSelectedUsers([]);
    setGroupTitle('');
    onOpenChange(false);
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
          <DialogDescription>
            Choose whether to start a direct message or create a group chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conversation Type */}
          <div className="space-y-2">
            <Label>Conversation Type</Label>
            <Select value={conversationType} onValueChange={(value: any) => setConversationType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Message</SelectItem>
                <SelectItem value="group">Group Chat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Group Title */}
          {conversationType === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="group-title">Group Title</Label>
              <Input
                id="group-title"
                placeholder="Enter group chat name"
                value={groupTitle}
                onChange={e => setGroupTitle(e.target.value)}
              />
            </div>
          )}

          {/* User Selection */}
          <div className="space-y-2">
            <Label>
              Select {conversationType === 'direct' ? 'a person' : 'people'}
              {conversationType === 'group' && ' (at least 2)'}
            </Label>
            <ScrollArea className="h-64 border rounded-lg p-4">
              <div className="space-y-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users available</p>
                ) : (
                  users.map(user => (
                    <div key={user.id} className="flex items-center gap-2">
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => {
                          if (conversationType === 'direct') {
                            setSelectedUsers(
                              selectedUsers.includes(user.id) ? [] : [user.id]
                            );
                          } else {
                            handleUserToggle(user.id);
                          }
                        }}
                      />
                      <label
                        htmlFor={user.id}
                        className="flex-1 text-sm cursor-pointer hover:bg-accent p-1 rounded"
                      >
                        {user.full_name}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({user.type})
                        </span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => resetDialog()}>
              Cancel
            </Button>
            <Button onClick={handleCreateConversation} disabled={isCreating || loading}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
