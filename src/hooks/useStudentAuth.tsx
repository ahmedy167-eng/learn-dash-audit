import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  signIn: (name: string, studentId: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if student is already logged in (stored in sessionStorage)
    const storedStudent = sessionStorage.getItem('studentAuth');
    if (storedStudent) {
      try {
        setStudent(JSON.parse(storedStudent));
      } catch {
        sessionStorage.removeItem('studentAuth');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (name: string, studentId: string): Promise<{ error: Error | null }> => {
    try {
      // Query the students table to verify credentials
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, student_id, section_id, section_number, course')
        .ilike('full_name', name.trim())
        .eq('student_id', studentId.trim())
        .maybeSingle();

      if (error) {
        return { error: new Error('Failed to verify credentials. Please try again.') };
      }

      if (!data) {
        return { error: new Error('Invalid name or student ID. Please check your credentials.') };
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

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
    }
  };

  const signOut = () => {
    sessionStorage.removeItem('studentAuth');
    setStudent(null);
  };

  return (
    <StudentAuthContext.Provider value={{ student, loading, signIn, signOut }}>
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
