import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ============================================================
// INPUT VALIDATION UTILITIES
// ============================================================

// UUID v4 format regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Extended session token format (two UUIDs joined by hyphen)
const SESSION_TOKEN_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Validation result type
interface ValidationResult {
  valid: boolean
  error?: string
}

// Validators for different input types
const validators = {
  // Name: 2-100 chars, allows letters, spaces, hyphens, apostrophes, and common international characters
  name: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Name must be a string' }
    const trimmed = val.trim()
    if (trimmed.length < 2) return { valid: false, error: 'Name must be at least 2 characters' }
    if (trimmed.length > 100) return { valid: false, error: 'Name must be less than 100 characters' }
    // Allow letters, spaces, hyphens, apostrophes, and common accented characters
    if (!/^[\p{L}\s\-']+$/u.test(trimmed)) {
      return { valid: false, error: 'Name contains invalid characters' }
    }
    return { valid: true }
  },

  // Student ID: 1-50 chars, alphanumeric with hyphens/underscores
  studentId: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Student ID must be a string' }
    const trimmed = val.trim()
    if (trimmed.length < 1) return { valid: false, error: 'Student ID is required' }
    if (trimmed.length > 50) return { valid: false, error: 'Student ID must be less than 50 characters' }
    if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
      return { valid: false, error: 'Student ID can only contain letters, numbers, hyphens, and underscores' }
    }
    return { valid: true }
  },

  // Session token: must match expected format
  sessionToken: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Session token must be a string' }
    if (!SESSION_TOKEN_REGEX.test(val)) {
      return { valid: false, error: 'Invalid session token format' }
    }
    return { valid: true }
  },

  // UUID: standard UUID v4 format
  uuid: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'ID must be a string' }
    if (!UUID_REGEX.test(val)) {
      return { valid: false, error: 'Invalid ID format' }
    }
    return { valid: true }
  },

  // Subject: optional, max 200 chars
  subject: (val: unknown): ValidationResult => {
    if (val === null || val === undefined || val === '') return { valid: true }
    if (typeof val !== 'string') return { valid: false, error: 'Subject must be a string' }
    if (val.length > 200) return { valid: false, error: 'Subject must be less than 200 characters' }
    return { valid: true }
  },

  // Message content: 1-10000 chars
  messageContent: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Message content must be a string' }
    const trimmed = val.trim()
    if (trimmed.length < 1) return { valid: false, error: 'Message content is required' }
    if (trimmed.length > 10000) return { valid: false, error: 'Message must be less than 10,000 characters' }
    return { valid: true }
  },

  // CA submission content: 1-50000 chars (allows for longer essays)
  caContent: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Content must be a string' }
    const trimmed = val.trim()
    if (trimmed.length < 1) return { valid: false, error: 'Content is required' }
    if (trimmed.length > 50000) return { valid: false, error: 'Content must be less than 50,000 characters' }
    return { valid: true }
  },

  // Quiz answer: single letter A-D
  quizAnswer: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Answer must be a string' }
    if (!/^[A-Da-d]$/.test(val)) {
      return { valid: false, error: 'Answer must be A, B, C, or D' }
    }
    return { valid: true }
  },

  // CA stage: valid stage names
  caStage: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Stage must be a string' }
    const validStages = ['ideas', 'first_draft', 'second_draft', 'final_draft']
    if (!validStages.includes(val)) {
      return { valid: false, error: 'Invalid submission stage' }
    }
    return { valid: true }
  },

  // Recipient type: admin or teacher
  recipientType: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Recipient type must be a string' }
    if (val !== 'admin' && val !== 'teacher') {
      return { valid: false, error: 'Recipient type must be admin or teacher' }
    }
    return { valid: true }
  },

  // Data type for get-data endpoint
  dataType: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Data type must be a string' }
    const validTypes = ['profile', 'messages', 'notices', 'quizzes', 'quiz_questions', 'quiz_submissions', 'lms_progress', 'ca_projects', 'ca_submissions', 'sections']
    if (!validTypes.includes(val)) {
      return { valid: false, error: 'Invalid data type' }
    }
    return { valid: true }
  },

  // Action type for action endpoint
  actionType: (val: unknown): ValidationResult => {
    if (typeof val !== 'string') return { valid: false, error: 'Action must be a string' }
    const validActions = ['submit_quiz', 'submit_ca', 'update_ca', 'send_message', 'mark_message_read', 'mark_notice_read', 'mark_all_messages_read']
    if (!validActions.includes(val)) {
      return { valid: false, error: 'Invalid action' }
    }
    return { valid: true }
  },
}

// Helper to create a 400 response
function validationError(message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ============================================================
// MAIN HANDLER
// ============================================================

interface StudentLoginRequest {
  name: string
  studentId: string
}

interface StudentDataRequest {
  sessionToken: string
  dataType: 'profile' | 'messages' | 'notices' | 'quizzes' | 'quiz_questions' | 'quiz_submissions' | 'lms_progress' | 'ca_projects' | 'ca_submissions' | 'sections'
  filters?: Record<string, unknown>
}

interface StudentActionRequest {
  sessionToken: string
  action: 'submit_quiz' | 'submit_ca' | 'update_ca' | 'send_message' | 'mark_message_read' | 'mark_notice_read' | 'mark_all_messages_read'
  data: Record<string, unknown>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // Login endpoint - validates student credentials and creates session token
    if (action === 'login' && req.method === 'POST') {
      const { name, studentId }: StudentLoginRequest = await req.json()

      // Validate name
      const nameValidation = validators.name(name)
      if (!nameValidation.valid) {
        return validationError(nameValidation.error!)
      }

      // Validate student ID
      const studentIdValidation = validators.studentId(studentId)
      if (!studentIdValidation.valid) {
        return validationError(studentIdValidation.error!)
      }

      console.log(`[student-auth] Login attempt for student ID: ${studentId}`)

      // Query student using service role (bypasses RLS)
      const { data: students, error: queryError } = await supabaseAdmin
        .from('students')
        .select('id, full_name, student_id, section_id, section_number, course, is_active')
        .ilike('full_name', name.trim())
        .eq('student_id', studentId.trim())
        .limit(1)

      if (queryError) {
        console.error('[student-auth] Query error:', queryError)
        return new Response(
          JSON.stringify({ error: 'Failed to verify credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const student = students?.[0]

      if (!student) {
        console.log(`[student-auth] No student found for: ${name}, ${studentId}`)
        return new Response(
          JSON.stringify({ error: 'Invalid name or student ID' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (student.is_active === false) {
        console.log(`[student-auth] Deactivated student attempted login: ${student.id}`)
        return new Response(
          JSON.stringify({ error: 'Your account has been deactivated' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate secure session token
      const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

      // Store session in user_sessions table
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('user_sessions')
        .insert([{
          student_id: student.id,
          user_type: 'student',
          login_at: new Date().toISOString(),
          is_active: true,
          session_token: sessionToken,
          expires_at: expiresAt,
        }])
        .select('id')
        .single()

      if (sessionError) {
        console.error('[student-auth] Session creation error:', sessionError)
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log activity
      await supabaseAdmin.from('activity_logs').insert([{
        student_id: student.id,
        user_type: 'student',
        action: 'login',
      }])

      console.log(`[student-auth] Login successful for student: ${student.id}`)

      return new Response(
        JSON.stringify({
          student: {
            id: student.id,
            full_name: student.full_name,
            student_id: student.student_id,
            section_id: student.section_id,
            section_number: student.section_number,
            course: student.course,
          },
          sessionToken,
          sessionId: sessionData.id,
          expiresAt,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Logout endpoint
    if (action === 'logout' && req.method === 'POST') {
      const { sessionToken } = await req.json()

      // Validate session token format
      const tokenValidation = validators.sessionToken(sessionToken)
      if (!tokenValidation.valid) {
        return validationError(tokenValidation.error!)
      }

      // Find and end session
      const { data: session } = await supabaseAdmin
        .from('user_sessions')
        .select('id, login_at, student_id')
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .single()

      if (session) {
        const loginTime = new Date(session.login_at).getTime()
        const duration = Math.floor((Date.now() - loginTime) / 60000)

        await supabaseAdmin
          .from('user_sessions')
          .update({
            logout_at: new Date().toISOString(),
            session_duration_minutes: duration,
            is_active: false,
          })
          .eq('id', session.id)

        // Log activity
        await supabaseAdmin.from('activity_logs').insert([{
          student_id: session.student_id,
          user_type: 'student',
          action: 'logout',
        }])

        console.log(`[student-auth] Logout successful for session: ${session.id}`)
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate session helper
    async function validateSession(sessionToken: string) {
      // Validate session token format before querying
      const tokenValidation = validators.sessionToken(sessionToken)
      if (!tokenValidation.valid) return null

      const { data: session } = await supabaseAdmin
        .from('user_sessions')
        .select('id, student_id, expires_at, is_active')
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .single()

      if (!session) return null
      if (new Date(session.expires_at) < new Date()) {
        // Session expired, mark inactive
        await supabaseAdmin
          .from('user_sessions')
          .update({ is_active: false })
          .eq('id', session.id)
        return null
      }

      return session
    }

    // Get student data endpoint
    if (action === 'get-data' && req.method === 'POST') {
      const { sessionToken, dataType, filters }: StudentDataRequest = await req.json()

      // Validate session token format
      const tokenValidation = validators.sessionToken(sessionToken)
      if (!tokenValidation.valid) {
        return validationError(tokenValidation.error!)
      }

      // Validate data type
      const dataTypeValidation = validators.dataType(dataType)
      if (!dataTypeValidation.valid) {
        return validationError(dataTypeValidation.error!)
      }

      const session = await validateSession(sessionToken)
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const studentId = session.student_id
      let data: unknown = null
      let error: unknown = null

      switch (dataType) {
        case 'profile': {
          const result = await supabaseAdmin
            .from('students')
            .select('id, full_name, student_id, section_id, section_number, course')
            .eq('id', studentId)
            .single()
          data = result.data
          error = result.error
          break
        }

        case 'messages': {
          const result = await supabaseAdmin
            .from('messages')
            .select('id, subject, content, sender_type, is_read, read_at, created_at')
            .eq('recipient_student_id', studentId)
            .eq('recipient_type', 'student')
            .order('created_at', { ascending: false })
          data = result.data
          error = result.error
          break
        }

        case 'notices': {
          const result = await supabaseAdmin
            .from('student_notices')
            .select('id, title, content, notice_type, is_read, read_at, created_at')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
          data = result.data
          error = result.error
          break
        }

        case 'quizzes': {
          // Get student's section first
          const { data: student } = await supabaseAdmin
            .from('students')
            .select('section_id')
            .eq('id', studentId)
            .single()

          if (student?.section_id) {
            const result = await supabaseAdmin
              .from('quizzes')
              .select('id, title, description, is_active, created_at')
              .eq('section_id', student.section_id)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
            data = result.data
            error = result.error
          } else {
            data = []
          }
          break
        }

        case 'quiz_questions': {
          const quizId = filters?.quizId as string
          if (quizId) {
            // Validate quiz ID format
            const quizIdValidation = validators.uuid(quizId)
            if (!quizIdValidation.valid) {
              return validationError('Invalid quiz ID format')
            }
            const result = await supabaseAdmin
              .from('quiz_questions')
              .select('id, question_text, reading_passage, option_a, option_b, option_c, option_d, quiz_id')
              .eq('quiz_id', quizId)
            data = result.data
            error = result.error
          } else {
            data = []
          }
          break
        }

        case 'quiz_submissions': {
          const result = await supabaseAdmin
            .from('quiz_submissions')
            .select('id, question_id, selected_answer, is_correct, submitted_at')
            .eq('student_id', studentId)
          data = result.data
          error = result.error
          break
        }

        case 'lms_progress': {
          const result = await supabaseAdmin
            .from('lms_progress')
            .select('id, unit_name, points, is_completed, updated_at')
            .eq('student_id', studentId)
          data = result.data
          error = result.error
          break
        }

        case 'ca_projects': {
          // Get student's section first
          const { data: student } = await supabaseAdmin
            .from('students')
            .select('section_id')
            .eq('id', studentId)
            .single()

          if (student?.section_id) {
            const result = await supabaseAdmin
              .from('ca_projects')
              .select('id, title, description, pdf_url, deadline_ideas, deadline_first_draft, deadline_second_draft, deadline_final_draft')
              .eq('section_id', student.section_id)
            
            // Generate signed URLs for PDFs (since bucket is now private)
            if (result.data) {
              const projectsWithSignedUrls = await Promise.all(
                result.data.map(async (project) => {
                  if (project.pdf_url) {
                    // Generate a signed URL valid for 4 hours
                    const { data: signedUrlData } = await supabaseAdmin.storage
                      .from('ca-project-pdfs')
                      .createSignedUrl(project.pdf_url, 14400) // 4 hours
                    
                    return {
                      ...project,
                      pdf_url: signedUrlData?.signedUrl || null
                    }
                  }
                  return project
                })
              )
              data = projectsWithSignedUrls
            } else {
              data = result.data
            }
            error = result.error
          } else {
            data = []
          }
          break
        }

        case 'ca_submissions': {
          const projectId = filters?.projectId as string
          if (projectId) {
            // Validate project ID format
            const projectIdValidation = validators.uuid(projectId)
            if (!projectIdValidation.valid) {
              return validationError('Invalid project ID format')
            }
            const result = await supabaseAdmin
              .from('ca_submissions')
              .select('id, project_id, stage, content, feedback, submitted_at')
              .eq('student_id', studentId)
              .eq('project_id', projectId)
            data = result.data
            error = result.error
          } else {
            const result = await supabaseAdmin
              .from('ca_submissions')
              .select('id, project_id, stage, content, feedback, submitted_at')
              .eq('student_id', studentId)
            data = result.data
            error = result.error
          }
          break
        }

        case 'sections': {
          // Get student's section info
          const { data: student } = await supabaseAdmin
            .from('students')
            .select('section_id')
            .eq('id', studentId)
            .single()

          if (student?.section_id) {
            const result = await supabaseAdmin
              .from('sections')
              .select('id, name, section_number, course, user_id')
              .eq('id', student.section_id)
              .single()
            data = result.data
            error = result.error
          } else {
            data = null
          }
          break
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid data type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }

      if (error) {
        console.error(`[student-auth] Data fetch error for ${dataType}:`, error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Student actions endpoint
    if (action === 'action' && req.method === 'POST') {
      const { sessionToken, action: studentAction, data: actionData }: StudentActionRequest = await req.json()

      // Validate session token format
      const tokenValidation = validators.sessionToken(sessionToken)
      if (!tokenValidation.valid) {
        return validationError(tokenValidation.error!)
      }

      // Validate action type
      const actionValidation = validators.actionType(studentAction)
      if (!actionValidation.valid) {
        return validationError(actionValidation.error!)
      }

      const session = await validateSession(sessionToken)
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const studentId = session.student_id
      let result: unknown = null
      let actionError: unknown = null

      switch (studentAction) {
        case 'submit_quiz': {
          const { questionId, selectedAnswer } = actionData as {
            questionId: string
            selectedAnswer: string
          }
          
          // Validate question ID
          const questionIdValidation = validators.uuid(questionId)
          if (!questionIdValidation.valid) {
            return validationError('Invalid question ID format')
          }

          // Validate selected answer
          const answerValidation = validators.quizAnswer(selectedAnswer)
          if (!answerValidation.valid) {
            return validationError(answerValidation.error!)
          }

          // Fetch the question to verify the correct answer server-side
          const { data: question, error: questionError } = await supabaseAdmin
            .from('quiz_questions')
            .select('correct_answer')
            .eq('id', questionId)
            .single()

          if (questionError || !question) {
            return new Response(
              JSON.stringify({ error: 'Question not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const isCorrect = selectedAnswer === question.correct_answer

          const insertResult = await supabaseAdmin
            .from('quiz_submissions')
            .insert([{
              student_id: studentId,
              question_id: questionId,
              selected_answer: selectedAnswer,
              is_correct: isCorrect,
            }])
            .select()
            .single()
          result = insertResult.data
          actionError = insertResult.error
          break
        }

        case 'submit_ca': {
          const { projectId, stage, content } = actionData as {
            projectId: string
            stage: string
            content: string
          }

          // Validate project ID
          const projectIdValidation = validators.uuid(projectId)
          if (!projectIdValidation.valid) {
            return validationError('Invalid project ID format')
          }

          // Validate stage
          const stageValidation = validators.caStage(stage)
          if (!stageValidation.valid) {
            return validationError(stageValidation.error!)
          }

          // Validate content
          const contentValidation = validators.caContent(content)
          if (!contentValidation.valid) {
            return validationError(contentValidation.error!)
          }

          const insertResult = await supabaseAdmin
            .from('ca_submissions')
            .insert([{
              student_id: studentId,
              project_id: projectId,
              stage,
              content,
            }])
            .select()
            .single()
          result = insertResult.data
          actionError = insertResult.error
          break
        }

        case 'update_ca': {
          const { submissionId, content } = actionData as {
            submissionId: string
            content: string
          }

          // Validate submission ID
          const submissionIdValidation = validators.uuid(submissionId)
          if (!submissionIdValidation.valid) {
            return validationError('Invalid submission ID format')
          }

          // Validate content
          const contentValidation = validators.caContent(content)
          if (!contentValidation.valid) {
            return validationError(contentValidation.error!)
          }

          // Verify the submission belongs to this student
          const { data: existing } = await supabaseAdmin
            .from('ca_submissions')
            .select('id')
            .eq('id', submissionId)
            .eq('student_id', studentId)
            .single()

          if (!existing) {
            return new Response(
              JSON.stringify({ error: 'Submission not found or unauthorized' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const updateResult = await supabaseAdmin
            .from('ca_submissions')
            .update({ content, updated_at: new Date().toISOString() })
            .eq('id', submissionId)
            .select()
            .single()
          result = updateResult.data
          actionError = updateResult.error
          break
        }

        case 'send_message': {
          const { recipientType, recipientUserId, subject, content } = actionData as {
            recipientType: 'admin' | 'teacher'
            recipientUserId: string | null
            subject: string
            content: string
          }

          // Validate recipient type
          const recipientTypeValidation = validators.recipientType(recipientType)
          if (!recipientTypeValidation.valid) {
            return validationError(recipientTypeValidation.error!)
          }

          // Validate recipient user ID if provided
          if (recipientUserId !== null) {
            const recipientIdValidation = validators.uuid(recipientUserId)
            if (!recipientIdValidation.valid) {
              return validationError('Invalid recipient ID format')
            }
          }

          // Validate subject (optional)
          const subjectValidation = validators.subject(subject)
          if (!subjectValidation.valid) {
            return validationError(subjectValidation.error!)
          }

          // Validate message content
          const contentValidation = validators.messageContent(content)
          if (!contentValidation.valid) {
            return validationError(contentValidation.error!)
          }

          // Validate recipient authorization
          if (recipientUserId) {
            // Get student's section to find assigned teacher
            const { data: student } = await supabaseAdmin
              .from('students')
              .select('section_id')
              .eq('id', studentId)
              .single()

            let isAuthorized = false

            // Check if recipient is assigned teacher
            if (student?.section_id) {
              const { data: section } = await supabaseAdmin
                .from('sections')
                .select('user_id')
                .eq('id', student.section_id)
                .single()

              if (section?.user_id === recipientUserId) {
                isAuthorized = true
              }
            }

            // Check if recipient is an admin
            if (!isAuthorized) {
              const { data: adminRole } = await supabaseAdmin
                .from('user_roles')
                .select('id')
                .eq('user_id', recipientUserId)
                .eq('role', 'admin')
                .single()

              if (adminRole) {
                isAuthorized = true
              }
            }

            if (!isAuthorized) {
              return new Response(
                JSON.stringify({ error: 'You are not authorized to message this recipient' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          }

          // For general admin messages (recipientUserId = null), always allowed
          const insertResult = await supabaseAdmin
            .from('messages')
            .insert([{
              sender_student_id: studentId,
              sender_type: 'student',
              recipient_user_id: recipientUserId,
              recipient_type: recipientType,
              subject,
              content,
            }])
            .select()
            .single()
          result = insertResult.data
          actionError = insertResult.error
          break
        }

        case 'mark_message_read': {
          const { messageId } = actionData as { messageId: string }

          // Validate message ID
          const messageIdValidation = validators.uuid(messageId)
          if (!messageIdValidation.valid) {
            return validationError('Invalid message ID format')
          }

          // Verify message belongs to this student
          const { data: message } = await supabaseAdmin
            .from('messages')
            .select('id')
            .eq('id', messageId)
            .eq('recipient_student_id', studentId)
            .single()

          if (!message) {
            return new Response(
              JSON.stringify({ error: 'Message not found or unauthorized' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const updateResult = await supabaseAdmin
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', messageId)
            .select()
            .single()
          result = updateResult.data
          actionError = updateResult.error
          break
        }

        case 'mark_all_messages_read': {
          const updateResult = await supabaseAdmin
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('recipient_student_id', studentId)
            .eq('is_read', false)
          result = { success: true }
          actionError = updateResult.error
          break
        }

        case 'mark_notice_read': {
          const { noticeId } = actionData as { noticeId: string }

          // Validate notice ID
          const noticeIdValidation = validators.uuid(noticeId)
          if (!noticeIdValidation.valid) {
            return validationError('Invalid notice ID format')
          }

          // Verify notice belongs to this student
          const { data: notice } = await supabaseAdmin
            .from('student_notices')
            .select('id')
            .eq('id', noticeId)
            .eq('student_id', studentId)
            .single()

          if (!notice) {
            return new Response(
              JSON.stringify({ error: 'Notice not found or unauthorized' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const updateResult = await supabaseAdmin
            .from('student_notices')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', noticeId)
            .select()
            .single()
          result = updateResult.data
          actionError = updateResult.error
          break
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }

      if (actionError) {
        console.error(`[student-auth] Action error for ${studentAction}:`, actionError)
        return new Response(
          JSON.stringify({ error: 'Action failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get teacher info for messaging
    if (action === 'get-teacher' && req.method === 'POST') {
      const { sessionToken } = await req.json()

      // Validate session token format
      const tokenValidation = validators.sessionToken(sessionToken)
      if (!tokenValidation.valid) {
        return validationError(tokenValidation.error!)
      }

      const session = await validateSession(sessionToken)
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get student's section
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('section_id')
        .eq('id', session.student_id)
        .single()

      if (!student?.section_id) {
        return new Response(
          JSON.stringify({ data: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get section's teacher
      const { data: section } = await supabaseAdmin
        .from('sections')
        .select('user_id')
        .eq('id', student.section_id)
        .single()

      if (!section?.user_id) {
        return new Response(
          JSON.stringify({ data: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get teacher profile (only public info)
      const { data: teacher } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', section.user_id)
        .single()

      return new Response(
        JSON.stringify({ data: teacher }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get allowed message recipients for student (assigned teacher + admins)
    if (action === 'get-recipients' && req.method === 'POST') {
      const { sessionToken } = await req.json()

      // Validate session token format
      const tokenValidation = validators.sessionToken(sessionToken)
      if (!tokenValidation.valid) {
        return validationError(tokenValidation.error!)
      }

      const session = await validateSession(sessionToken)
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const recipients: Array<{
        user_id: string | null
        full_name: string | null
        type: 'general_admin' | 'admin' | 'teacher'
        label: string
      }> = []

      // Always add general admin option
      recipients.push({
        user_id: null,
        full_name: null,
        type: 'general_admin',
        label: 'Administrator (General Inquiries)',
      })

      // Get student's section
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('section_id')
        .eq('id', session.student_id)
        .single()

      // Get assigned teacher if student has a section
      if (student?.section_id) {
        const { data: section } = await supabaseAdmin
          .from('sections')
          .select('user_id')
          .eq('id', student.section_id)
          .single()

        if (section?.user_id) {
          const { data: teacher } = await supabaseAdmin
            .from('profiles')
            .select('user_id, full_name')
            .eq('user_id', section.user_id)
            .single()

          if (teacher) {
            recipients.push({
              user_id: teacher.user_id,
              full_name: teacher.full_name,
              type: 'teacher',
              label: teacher.full_name || 'My Teacher',
            })
          }
        }
      }

      console.log(`[student-auth] get-recipients: returning ${recipients.length} recipients`)

      return new Response(
        JSON.stringify({ data: recipients }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[student-auth] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
