import { useCallback } from 'react';

const STUDENT_AUTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-auth`;

interface StudentProfile {
  id: string;
  full_name: string;
  student_id: string;
  section_id: string | null;
  section_number: string | null;
  course: string | null;
}

interface LoginResponse {
  student: StudentProfile;
  sessionToken: string;
  sessionId: string;
  expiresAt: string;
}

interface TeacherInfo {
  user_id: string;
  full_name: string;
}

interface Recipient {
  user_id: string | null;
  full_name: string | null;
  type: 'general_admin' | 'admin' | 'teacher';
  label: string;
}

type DataType = 'profile' | 'messages' | 'notices' | 'quizzes' | 'quiz_questions' | 'quiz_submissions' | 'lms_progress' | 'ca_projects' | 'ca_submissions' | 'sections';

type ActionType = 'submit_quiz' | 'submit_ca' | 'update_ca' | 'send_message' | 'mark_message_read' | 'mark_notice_read' | 'mark_all_messages_read';

export function useStudentApi() {
  const getSessionToken = useCallback(() => {
    return sessionStorage.getItem('studentSessionToken');
  }, []);

  const login = useCallback(async (name: string, studentId: string): Promise<{ data: LoginResponse | null; error: Error | null }> => {
    try {
      const response = await fetch(`${STUDENT_AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, studentId }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: new Error(result.error || 'Login failed') };
      }

      // Store session data
      sessionStorage.setItem('studentSessionToken', result.sessionToken);
      sessionStorage.setItem('studentAuth', JSON.stringify(result.student));
      sessionStorage.setItem('sessionId', result.sessionId);
      sessionStorage.setItem('sessionExpiresAt', result.expiresAt);

      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Network error') };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const sessionToken = getSessionToken();
    
    if (sessionToken) {
      try {
        await fetch(`${STUDENT_AUTH_URL}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken }),
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }

    sessionStorage.removeItem('studentSessionToken');
    sessionStorage.removeItem('studentAuth');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('sessionExpiresAt');
  }, [getSessionToken]);

  const getData = useCallback(async <T,>(
    dataType: DataType, 
    filters?: Record<string, unknown>
  ): Promise<{ data: T | null; error: Error | null }> => {
    const sessionToken = getSessionToken();
    
    if (!sessionToken) {
      return { data: null, error: new Error('Not authenticated') };
    }

    try {
      const response = await fetch(`${STUDENT_AUTH_URL}/get-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, dataType, filters }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, clear storage
          sessionStorage.removeItem('studentSessionToken');
          sessionStorage.removeItem('studentAuth');
          sessionStorage.removeItem('sessionId');
        }
        return { data: null, error: new Error(result.error || 'Failed to fetch data') };
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Network error') };
    }
  }, [getSessionToken]);

  const performAction = useCallback(async <T,>(
    action: ActionType,
    data: Record<string, unknown>
  ): Promise<{ data: T | null; error: Error | null }> => {
    const sessionToken = getSessionToken();
    
    if (!sessionToken) {
      return { data: null, error: new Error('Not authenticated') };
    }

    try {
      const response = await fetch(`${STUDENT_AUTH_URL}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, action, data }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('studentSessionToken');
          sessionStorage.removeItem('studentAuth');
          sessionStorage.removeItem('sessionId');
        }
        return { data: null, error: new Error(result.error || 'Action failed') };
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Network error') };
    }
  }, [getSessionToken]);

  const getTeacher = useCallback(async (): Promise<{ data: TeacherInfo | null; error: Error | null }> => {
    const sessionToken = getSessionToken();
    
    if (!sessionToken) {
      return { data: null, error: new Error('Not authenticated') };
    }

    try {
      const response = await fetch(`${STUDENT_AUTH_URL}/get-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: new Error(result.error || 'Failed to fetch teacher') };
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Network error') };
    }
  }, [getSessionToken]);

  const getRecipients = useCallback(async (): Promise<{ data: Recipient[] | null; error: Error | null }> => {
    const sessionToken = getSessionToken();
    
    if (!sessionToken) {
      return { data: null, error: new Error('Not authenticated') };
    }

    try {
      const response = await fetch(`${STUDENT_AUTH_URL}/get-recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: new Error(result.error || 'Failed to fetch recipients') };
      }

      return { data: result.data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Network error') };
    }
  }, [getSessionToken]);

  const isSessionValid = useCallback(() => {
    const token = getSessionToken();
    const expiresAt = sessionStorage.getItem('sessionExpiresAt');
    
    if (!token || !expiresAt) return false;
    
    return new Date(expiresAt) > new Date();
  }, [getSessionToken]);

  return {
    login,
    logout,
    getData,
    performAction,
    getTeacher,
    getRecipients,
    getSessionToken,
    isSessionValid,
  };
}
