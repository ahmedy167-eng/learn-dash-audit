export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          student_id: string | null
          user_id: string | null
          user_type: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          student_id?: string | null
          user_id?: string | null
          user_type: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          student_id?: string | null
          user_id?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_projects: {
        Row: {
          created_at: string
          deadline_final_draft: string | null
          deadline_first_draft: string | null
          deadline_ideas: string | null
          deadline_second_draft: string | null
          description: string | null
          id: string
          pdf_url: string | null
          section_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline_final_draft?: string | null
          deadline_first_draft?: string | null
          deadline_ideas?: string | null
          deadline_second_draft?: string | null
          description?: string | null
          id?: string
          pdf_url?: string | null
          section_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline_final_draft?: string | null
          deadline_first_draft?: string | null
          deadline_ideas?: string | null
          deadline_second_draft?: string | null
          description?: string | null
          id?: string
          pdf_url?: string | null
          section_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_projects_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_submissions: {
        Row: {
          content: string | null
          feedback: string | null
          id: string
          project_id: string
          stage: string
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          feedback?: string | null
          id?: string
          project_id: string
          stage: string
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          feedback?: string | null
          id?: string
          project_id?: string
          stage?: string
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ca_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_class_audits: {
        Row: {
          book: string
          campus: string
          comments: string | null
          course: string
          created_at: string
          date_of_teaching: string
          elsd_id: string
          id: string
          number_of_students: number | null
          original_teacher_name: string
          page: string | null
          section_number: string
          teacher_name: string
          teaching_mode: string
          unit: string
          updated_at: string
          user_id: string
          week: string
        }
        Insert: {
          book: string
          campus: string
          comments?: string | null
          course: string
          created_at?: string
          date_of_teaching: string
          elsd_id: string
          id?: string
          number_of_students?: number | null
          original_teacher_name: string
          page?: string | null
          section_number: string
          teacher_name: string
          teaching_mode: string
          unit: string
          updated_at?: string
          user_id: string
          week: string
        }
        Update: {
          book?: string
          campus?: string
          comments?: string | null
          course?: string
          created_at?: string
          date_of_teaching?: string
          elsd_id?: string
          id?: string
          number_of_students?: number | null
          original_teacher_name?: string
          page?: string | null
          section_number?: string
          teacher_name?: string
          teaching_mode?: string
          unit?: string
          updated_at?: string
          user_id?: string
          week?: string
        }
        Relationships: []
      }
      lesson_plans: {
        Row: {
          aim_main: string | null
          aim_subsidiary: string | null
          building: string | null
          content: string | null
          course: string | null
          created_at: string
          day: string | null
          id: string
          lead_in_presentation: string | null
          lesson_date: string | null
          lesson_skill: string | null
          objectives: string | null
          practice_exercises: string | null
          productive_activities: string | null
          reflection: string | null
          room: string | null
          schedule_id: string | null
          section_number: string | null
          title: string
          updated_at: string
          user_id: string
          week: string | null
        }
        Insert: {
          aim_main?: string | null
          aim_subsidiary?: string | null
          building?: string | null
          content?: string | null
          course?: string | null
          created_at?: string
          day?: string | null
          id?: string
          lead_in_presentation?: string | null
          lesson_date?: string | null
          lesson_skill?: string | null
          objectives?: string | null
          practice_exercises?: string | null
          productive_activities?: string | null
          reflection?: string | null
          room?: string | null
          schedule_id?: string | null
          section_number?: string | null
          title: string
          updated_at?: string
          user_id: string
          week?: string | null
        }
        Update: {
          aim_main?: string | null
          aim_subsidiary?: string | null
          building?: string | null
          content?: string | null
          course?: string | null
          created_at?: string
          day?: string | null
          id?: string
          lead_in_presentation?: string | null
          lesson_date?: string | null
          lesson_skill?: string | null
          objectives?: string | null
          practice_exercises?: string | null
          productive_activities?: string | null
          reflection?: string | null
          room?: string | null
          schedule_id?: string | null
          section_number?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          week?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_progress: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          points: number
          student_id: string
          unit_name: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          points?: number
          student_id: string
          unit_name: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          points?: number
          student_id?: string
          unit_name?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          read_at: string | null
          recipient_student_id: string | null
          recipient_type: string
          recipient_user_id: string | null
          sender_student_id: string | null
          sender_type: string
          sender_user_id: string | null
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_student_id?: string | null
          recipient_type: string
          recipient_user_id?: string | null
          sender_student_id?: string | null
          sender_type: string
          sender_user_id?: string | null
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_student_id?: string | null
          recipient_type?: string
          recipient_user_id?: string | null
          sender_student_id?: string | null
          sender_type?: string
          sender_user_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_student_id_fkey"
            columns: ["recipient_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_student_id_fkey"
            columns: ["sender_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      off_days: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          quiz_id: string
          reading_passage: string | null
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          quiz_id: string
          reading_passage?: string | null
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          quiz_id?: string
          reading_passage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          id?: string
          is_correct: boolean
          question_id: string
          selected_answer: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          section_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          section_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          section_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          course: string | null
          created_at: string
          end_time: string
          id: string
          is_recurring: boolean
          recurrence_pattern: string | null
          room: string | null
          start_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_recurring?: boolean
          recurrence_pattern?: string | null
          room?: string | null
          start_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_recurring?: boolean
          recurrence_pattern?: string | null
          room?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          building: string | null
          category: string | null
          course: string | null
          created_at: string
          finish_class_time: string | null
          id: string
          name: string
          notes: string | null
          off_days: string[] | null
          room: string | null
          section_number: string | null
          start_class_time: string | null
          teaching_days: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          building?: string | null
          category?: string | null
          course?: string | null
          created_at?: string
          finish_class_time?: string | null
          id?: string
          name: string
          notes?: string | null
          off_days?: string[] | null
          room?: string | null
          section_number?: string | null
          start_class_time?: string | null
          teaching_days?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          building?: string | null
          category?: string | null
          course?: string | null
          created_at?: string
          finish_class_time?: string | null
          id?: string
          name?: string
          notes?: string | null
          off_days?: string[] | null
          room?: string | null
          section_number?: string | null
          start_class_time?: string | null
          teaching_days?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_notices: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          notice_type: string
          posted_by: string
          read_at: string | null
          student_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          notice_type: string
          posted_by: string
          read_at?: string | null
          student_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          notice_type?: string
          posted_by?: string
          read_at?: string | null
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          absent_count: number | null
          building: string | null
          category: string | null
          class: string | null
          course: string | null
          created_at: string
          finish_class_time: string | null
          full_name: string
          id: string
          is_active: boolean | null
          late_count: number | null
          notes: string | null
          off_days: string[] | null
          present_count: number | null
          room: string | null
          section_id: string | null
          section_number: string | null
          start_class_time: string | null
          student_id: string
          teaching_days: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          absent_count?: number | null
          building?: string | null
          category?: string | null
          class?: string | null
          course?: string | null
          created_at?: string
          finish_class_time?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          late_count?: number | null
          notes?: string | null
          off_days?: string[] | null
          present_count?: number | null
          room?: string | null
          section_id?: string | null
          section_number?: string | null
          start_class_time?: string | null
          student_id: string
          teaching_days?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          absent_count?: number | null
          building?: string | null
          category?: string | null
          class?: string | null
          course?: string | null
          created_at?: string
          finish_class_time?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          late_count?: number | null
          notes?: string | null
          off_days?: string[] | null
          present_count?: number | null
          room?: string | null
          section_id?: string | null
          section_number?: string | null
          start_class_time?: string | null
          student_id?: string
          teaching_days?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          feature: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          login_at: string
          logout_at: string | null
          session_duration_minutes: number | null
          session_token: string | null
          student_id: string | null
          user_id: string | null
          user_type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          login_at?: string
          logout_at?: string | null
          session_duration_minutes?: number | null
          session_token?: string | null
          student_id?: string | null
          user_id?: string | null
          user_type: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          login_at?: string
          logout_at?: string | null
          session_duration_minutes?: number | null
          session_token?: string | null
          student_id?: string | null
          user_id?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_audits: {
        Row: {
          book: string
          campus: string
          comments: string | null
          course: string
          created_at: string
          date_of_teaching: string
          elsd_id: string
          id: string
          number_of_students: number | null
          page: string | null
          section_number: string
          teacher_name: string
          teaching_mode: string
          unit: string
          updated_at: string
          user_id: string
          week: string
        }
        Insert: {
          book: string
          campus: string
          comments?: string | null
          course: string
          created_at?: string
          date_of_teaching: string
          elsd_id: string
          id?: string
          number_of_students?: number | null
          page?: string | null
          section_number: string
          teacher_name: string
          teaching_mode: string
          unit: string
          updated_at?: string
          user_id: string
          week: string
        }
        Update: {
          book?: string
          campus?: string
          comments?: string | null
          course?: string
          created_at?: string
          date_of_teaching?: string
          elsd_id?: string
          id?: string
          number_of_students?: number | null
          page?: string | null
          section_number?: string
          teacher_name?: string
          teaching_mode?: string
          unit?: string
          updated_at?: string
          user_id?: string
          week?: string
        }
        Relationships: []
      }
    }
    Views: {
      teacher_public_info: {
        Row: {
          full_name: string | null
          user_id: string | null
        }
        Insert: {
          full_name?: string | null
          user_id?: string | null
        }
        Update: {
          full_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_teacher_public_info: {
        Args: never
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      has_permission: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
