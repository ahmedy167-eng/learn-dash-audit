import { useStudentAuth } from '@/hooks/useStudentAuth';
import { ChatPage } from '@/components/chat';

const StudentChat = () => {
  const { student } = useStudentAuth();

  if (!student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access chat</p>
      </div>
    );
  }

  return <ChatPage userId={null} studentId={student.id} userType="student" />;
};

export default StudentChat;
