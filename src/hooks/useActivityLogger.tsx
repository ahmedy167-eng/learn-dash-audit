import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LogActivityParams {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  studentId?: string;
}

export function useActivityLogger() {
  const { user } = useAuth();

  const logActivity = useCallback(async ({
    action,
    entityType,
    entityId,
    details,
    studentId,
  }: LogActivityParams) => {
    try {
      const userType = studentId ? 'student' : (user ? 'teacher' : 'admin');
      
      await supabase.from('activity_logs').insert([{
        user_id: user?.id || null,
        student_id: studentId || null,
        user_type: userType,
        action,
        entity_type: entityType || null,
        entity_id: entityId || null,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
      }]);
    } catch (error) {
      // Fire and forget - don't block UI for logging errors
      console.error('Failed to log activity:', error);
    }
  }, [user]);

  return { logActivity };
}
