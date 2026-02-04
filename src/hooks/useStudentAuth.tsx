import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useStudentApi } from './useStudentApi';
import { toast } from 'sonner';

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  section_id: string | null;
  section_number: string | null;
  course: string | null;
}

interface StudentAuthContextType {
  student: Student | null;
  loading: boolean;
  sessionId: string | null;
  signIn: (name: string, studentId: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { login, logout, isSessionValid } = useStudentApi();

  useEffect(() => {
    const onSessionExpired = () => {
      setStudent(null);
      setSessionId(null);
      toast.error('Session expired. Please sign in again.');
    };

    window.addEventListener('student-auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('student-auth:session-expired', onSessionExpired);
  }, []);

  useEffect(() => {
    // Check if student is already logged in (stored in sessionStorage)
    const storedStudent = sessionStorage.getItem('studentAuth');
    const storedSessionId = sessionStorage.getItem('sessionId');
    
    if (storedStudent && isSessionValid()) {
      try {
        setStudent(JSON.parse(storedStudent));
        if (storedSessionId) {
          setSessionId(storedSessionId);
        }
      } catch {
        // Clear invalid session data
        sessionStorage.removeItem('studentAuth');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('studentSessionToken');
        sessionStorage.removeItem('sessionExpiresAt');
      }
    } else if (storedStudent) {
      // Session expired, clear storage
      sessionStorage.removeItem('studentAuth');
      sessionStorage.removeItem('sessionId');
      sessionStorage.removeItem('studentSessionToken');
      sessionStorage.removeItem('sessionExpiresAt');
    }
    setLoading(false);
  }, [isSessionValid]);

  const signIn = useCallback(async (name: string, studentId: string): Promise<{ error: Error | null }> => {
    const { data, error } = await login(name, studentId);

    if (error) {
      return { error };
    }

    if (data) {
      setStudent(data.student);
      setSessionId(data.sessionId);
    }

    return { error: null };
  }, [login]);

  const signOut = useCallback(async () => {
    await logout();
    setStudent(null);
    setSessionId(null);
  }, [logout]);

  return (
    <StudentAuthContext.Provider value={{ student, loading, sessionId, signIn, signOut }}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
}
