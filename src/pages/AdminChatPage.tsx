import { useAuth } from '@/hooks/useAuth';
import { AdminChat } from '@/components/AdminChat';

export function AdminChatPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access admin chat</p>
      </div>
    );
  }

  return <AdminChat userId={user.id} />;
}
