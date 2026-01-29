import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
}

interface Permission {
  feature: string;
  enabled: boolean;
}

interface UserPermissionsDialogProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const FEATURES = [
  { key: 'students', label: 'Students', description: 'Manage student records' },
  { key: 'sections', label: 'Sections', description: 'Create and edit class sections' },
  { key: 'register', label: 'Register', description: 'Take student attendance' },
  { key: 'virtual_audit', label: 'Virtual Audit', description: 'Submit teaching audits' },
  { key: 'schedule', label: 'Schedule', description: 'Manage class schedules' },
  { key: 'lesson_plan', label: 'Lesson Plan', description: 'Create lesson plans' },
  { key: 'tasks', label: 'Tasks', description: 'Personal task management' },
  { key: 'off_days', label: 'Off Days', description: 'Request time off' },
];

export function UserPermissionsDialog({ user, open, onOpenChange, onUpdate }: UserPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchUserPermissions();
    }
  }, [user, open]);

  const fetchUserPermissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('feature, enabled')
        .eq('user_id', user.id);

      if (error) throw error;
      setPermissions(data || []);
      setIsAdmin(user.role === 'admin');
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (feature: string) => {
    setPermissions(prev => 
      prev.map(p => 
        p.feature === feature ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update permissions
      for (const perm of permissions) {
        const { error } = await supabase
          .from('user_permissions')
          .update({ enabled: perm.enabled })
          .eq('user_id', user.id)
          .eq('feature', perm.feature);
        
        if (error) throw error;
      }

      // Update role if changed
      if (isAdmin !== (user.role === 'admin')) {
        const newRole = isAdmin ? 'admin' : 'user';
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', user.id);
        
        if (error) throw error;
      }

      toast.success('Permissions updated successfully');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionEnabled = (feature: string): boolean => {
    const perm = permissions.find(p => p.feature === feature);
    return perm?.enabled ?? false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Permissions for {user?.full_name || user?.email}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {FEATURES.map((feature) => (
                <div key={feature.key} className="flex items-center justify-between py-2">
                  <div>
                    <Label className="font-medium">{feature.label}</Label>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                  <Switch
                    checked={getPermissionEnabled(feature.key)}
                    onCheckedChange={() => togglePermission(feature.key)}
                  />
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="admin-role"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked === true)}
                />
                <div>
                  <Label htmlFor="admin-role" className="font-medium">Administrator Role</Label>
                  <p className="text-xs text-muted-foreground">
                    Grant full access and user management rights
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
