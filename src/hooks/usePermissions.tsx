import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type FeatureKey = 
  | 'students' 
  | 'sections' 
  | 'register' 
  | 'virtual_audit' 
  | 'schedule' 
  | 'lesson_plan' 
  | 'tasks' 
  | 'off_days'
  | 'staff_chat';

interface Permission {
  feature: string;
  enabled: boolean;
}

interface PermissionsContextType {
  permissions: Permission[];
  isAdmin: boolean;
  loading: boolean;
  hasPermission: (feature: FeatureKey) => boolean;
  refetchPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!user) {
      setPermissions([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      } else {
        setIsAdmin(roleData?.role === 'admin');
      }

      // Fetch user permissions
      const { data: permData, error: permError } = await supabase
        .from('user_permissions')
        .select('feature, enabled')
        .eq('user_id', user.id);

      if (permError) {
        console.error('Error fetching permissions:', permError);
      } else {
        setPermissions(permData || []);
      }
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [user]);

  const hasPermission = (feature: FeatureKey): boolean => {
    // Admins have access to everything
    if (isAdmin) return true;
    
    const permission = permissions.find(p => p.feature === feature);
    return permission?.enabled ?? false;
  };

  const refetchPermissions = async () => {
    setLoading(true);
    await fetchPermissions();
  };

  return (
    <PermissionsContext.Provider value={{ permissions, isAdmin, loading, hasPermission, refetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
