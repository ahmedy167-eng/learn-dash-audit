import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
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

  const fetchPermissions = useCallback(async () => {
    const uid = user?.id;
    if (!uid) {
      setPermissions([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch role and permissions in parallel
      const [roleResult, permResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', uid).single(),
        supabase.from('user_permissions').select('feature, enabled').eq('user_id', uid),
      ]);

      if (roleResult.error) {
        console.error('Error fetching role:', roleResult.error);
      } else {
        setIsAdmin(roleResult.data?.role === 'admin');
      }

      if (permResult.error) {
        console.error('Error fetching permissions:', permResult.error);
      } else {
        setPermissions(permResult.data || []);
      }
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = (feature: FeatureKey): boolean => {
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
