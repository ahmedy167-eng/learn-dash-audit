import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  // Create session on login
  const createSession = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert([{
          student_id: studentId,
          user_type: 'student',
          login_at: new Date().toISOString(),
          is_active: true,
        }])
        .select('id')
        .single();

      if (!error && data) {
        setSessionId(data.id);
        sessionStorage.setItem('sessionId', data.id);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, []);

  // End session on logout
  const endSession = useCallback(async () => {
    const storedSessionId = sessionId || sessionStorage.getItem('sessionId');
    if (!storedSessionId) return;

    try {
      // Get login time to calculate duration
      const { data: session } = await supabase
        .from('user_sessions')
        .select('login_at')
        .eq('id', storedSessionId)
        .single();

      if (session) {
        const loginTime = new Date(session.login_at).getTime();
        const duration = Math.floor((Date.now() - loginTime) / 60000);

        await supabase
          .from('user_sessions')
          .update({
            logout_at: new Date().toISOString(),
            session_duration_minutes: duration,
            is_active: false,
          })
          .eq('id', storedSessionId);
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    // Check if student is already logged in (stored in sessionStorage)
    const storedStudent = sessionStorage.getItem('studentAuth');
    const storedSessionId = sessionStorage.getItem('sessionId');
    
    if (storedStudent) {
      try {
        setStudent(JSON.parse(storedStudent));
        if (storedSessionId) {
          setSessionId(storedSessionId);
        }
      } catch {
        sessionStorage.removeItem('studentAuth');
        sessionStorage.removeItem('sessionId');
      }
    }
    setLoading(false);

    // Handle page unload to end session
    const handleUnload = () => {
      if (storedSessionId) {
        // Use sendBeacon for reliability during unload
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${storedSessionId}`;
        navigator.sendBeacon(url);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const signIn = async (name: string, studentId: string): Promise<{ error: Error | null }> => {
    try {
      // Query the students table to verify credentials
      // Use limit(1) instead of maybeSingle() to handle duplicate students gracefully
      const { data: students, error } = await supabase
        .from('students')
        .select('id, full_name, student_id, section_id, section_number, course, is_active')
        .ilike('full_name', name.trim())
        .eq('student_id', studentId.trim())
        .eq('is_active', true)
        .limit(1);

      // Get first matching active student
      const data = students?.[0] || null;

      if (error) {
        return { error: new Error('Failed to verify credentials. Please try again.') };
      }

      if (!data) {
        return { error: new Error('Invalid name or student ID. Please check your credentials.') };
      }

      // Check if student account is active
      if (data.is_active === false) {
        return { error: new Error('Your account has been deactivated. Please contact your administrator.') };
      }

      // Store student data in session
      const studentData: Student = {
        id: data.id,
        full_name: data.full_name,
        student_id: data.student_id,
        section_id: data.section_id,
        section_number: data.section_number,
        course: data.course,
      };

      sessionStorage.setItem('studentAuth', JSON.stringify(studentData));
      setStudent(studentData);

      // Create session record
      await createSession(data.id);

      // Log activity
      await supabase.from('activity_logs').insert([{
        student_id: data.id,
        user_type: 'student',
        action: 'login',
      }]);

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  };

  const signOut = async () => {
    // End the session before clearing data
    await endSession();

    // Log activity
    if (student) {
      await supabase.from('activity_logs').insert([{
        student_id: student.id,
        user_type: 'student',
        action: 'logout',
      }]);
    }

    sessionStorage.removeItem('studentAuth');
    sessionStorage.removeItem('sessionId');
    setStudent(null);
    setSessionId(null);
  };

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
