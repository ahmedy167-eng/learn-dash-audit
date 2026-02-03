import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceUser {
  id: string;
  name: string;
  type: 'admin' | 'teacher' | 'student';
  online_at: string;
}

export function usePresence(userId?: string, userName?: string, userType?: 'admin' | 'teacher' | 'student') {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!userId || !userName || !userType) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        
        Object.values(state).forEach((presences) => {
          if (Array.isArray(presences)) {
            presences.forEach((presence: any) => {
              users.push({
                id: presence.id,
                name: presence.name,
                type: presence.type,
                online_at: presence.online_at,
              });
            });
          }
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: userId,
            name: userName,
            type: userType,
            online_at: new Date().toISOString(),
          });
          setIsTracking(true);
        }
      });

    return () => {
      channel.unsubscribe();
      setIsTracking(false);
    };
  }, [userId, userName, userType]);

  return { onlineUsers, isTracking };
}

// Separate hook for admin to view all online users without tracking
export function useOnlineUsersAdmin() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const channel = supabase.channel('online-users-view');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        
        Object.values(state).forEach((presences) => {
          if (Array.isArray(presences)) {
            presences.forEach((presence: any) => {
              users.push({
                id: presence.id,
                name: presence.name,
                type: presence.type,
                online_at: presence.online_at,
              });
            });
          }
        });
        
        setOnlineUsers(users);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { onlineUsers };
}
