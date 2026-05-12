import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const RATE_LIMIT_MAX_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/
const SESSION_TOKEN_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  const userAgent = req.headers.get('user-agent') || 'unknown'
  return `ua-${userAgent.slice(0, 50)}`
}

async function checkRateLimit(supabaseAdmin: SupabaseClient, clientIP: string) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS)
  await supabaseAdmin.from('login_rate_limits').delete().lt('window_start', windowStart.toISOString())

  const { data: existing } = await supabaseAdmin
    .from('login_rate_limits')
    .select('id, attempts, window_start')
    .eq('client_ip', `guest:${clientIP}`)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    if (existing.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      const windowEnd = new Date(new Date(existing.window_start).getTime() + RATE_LIMIT_WINDOW_MS)
      const retryAfterSeconds = Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)
      return { allowed: false, retryAfterSeconds: Math.max(0, retryAfterSeconds) }
    }
    await supabaseAdmin.from('login_rate_limits').update({ attempts: existing.attempts + 1 }).eq('id', existing.id)
    return { allowed: true }
  }
  await supabaseAdmin.from('login_rate_limits').insert({ client_ip: `guest:${clientIP}`, attempts: 1, window_start: now.toISOString() })
  return { allowed: true }
}

// Password hashing using PBKDF2 (Web Crypto API; available in Deno)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const hash = new Uint8Array(bits)
  const toB64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
  return `pbkdf2$200000$${toB64(salt)}$${toB64(hash)}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$')
    if (scheme !== 'pbkdf2') return false
    const iterations = parseInt(iterStr, 10)
    const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
    const salt = fromB64(saltB64)
    const expected = fromB64(hashB64)
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial, expected.length * 8
    )
    const actual = new Uint8Array(bits)
    if (actual.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
    return diff === 0
  } catch {
    return false
  }
}

async function getGuestSectionForGuest(supabaseAdmin: SupabaseClient, guestId: string): Promise<{ id: string } | null> {
  const { data: guest } = await supabaseAdmin
    .from('guest_students').select('assigned_teacher_id').eq('id', guestId).maybeSingle()
  if (!guest?.assigned_teacher_id) return null
  const { data: section } = await supabaseAdmin
    .from('sections').select('id')
    .eq('is_guest_section', true)
    .eq('user_id', guest.assigned_teacher_id)
    .maybeSingle()
  return section || null
}

async function validateSession(supabaseAdmin: SupabaseClient, sessionToken: string) {
  if (typeof sessionToken !== 'string' || !SESSION_TOKEN_REGEX.test(sessionToken)) return null
  const { data: session } = await supabaseAdmin
    .from('guest_sessions')
    .select('id, guest_id, expires_at')
    .eq('session_token', sessionToken)
    .single()
  if (!session) return null
  if (new Date(session.expires_at) < new Date()) {
    await supabaseAdmin.from('guest_sessions').delete().eq('id', session.id)
    return null
  }
  return session
}

Deno.serve(async (req) => {
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

    // ── SIGNUP ───────────────────────────────────
    if (action === 'signup' && req.method === 'POST') {
      const rl = await checkRateLimit(supabaseAdmin, getClientIP(req))
      if (!rl.allowed) {
        return jsonResponse({ error: `Too many attempts. Try again in ${Math.ceil((rl.retryAfterSeconds || 900) / 60)} minutes.` }, 429)
      }

      const body = await req.json().catch(() => ({}))
      const username = String(body.username || '').toLowerCase().trim()
      const password = String(body.password || '')
      const displayName = String(body.displayName || '').trim()

      if (!USERNAME_REGEX.test(username)) {
        return jsonResponse({ error: 'Username must be 3-30 chars, lowercase letters, numbers, or underscores' }, 400)
      }
      if (password.length < 8 || password.length > 200) {
        return jsonResponse({ error: 'Password must be 8-200 characters' }, 400)
      }
      if (displayName.length < 2 || displayName.length > 100) {
        return jsonResponse({ error: 'Display name must be 2-100 characters' }, 400)
      }

      const { data: existing } = await supabaseAdmin
        .from('guest_students').select('id').eq('username', username).maybeSingle()
      if (existing) {
        return jsonResponse({ error: 'Username already taken' }, 409)
      }

      const password_hash = await hashPassword(password)
      const { data: created, error: insertErr } = await supabaseAdmin
        .from('guest_students')
        .insert([{ username, password_hash, display_name: displayName, is_active: false }])
        .select('id, username, display_name')
        .single()
      if (insertErr || !created) {
        console.error('[guest-auth] signup insert error', insertErr)
        return jsonResponse({ error: 'Failed to create account' }, 500)
      }

      // Account created but not active — admin approval required before login
      return jsonResponse({
        pendingApproval: true,
        message: 'Your account was created and is pending admin approval. You will be able to sign in once an administrator activates your account.',
      })
    }

    // ── LOGIN ────────────────────────────────────
    if (action === 'login' && req.method === 'POST') {
      const rl = await checkRateLimit(supabaseAdmin, getClientIP(req))
      if (!rl.allowed) {
        return jsonResponse({ error: `Too many attempts. Try again in ${Math.ceil((rl.retryAfterSeconds || 900) / 60)} minutes.` }, 429)
      }

      const body = await req.json().catch(() => ({}))
      const username = String(body.username || '').toLowerCase().trim()
      const password = String(body.password || '')

      if (!USERNAME_REGEX.test(username) || password.length === 0) {
        return jsonResponse({ error: 'Invalid username or password' }, 401)
      }

      const { data: guest } = await supabaseAdmin
        .from('guest_students')
        .select('id, username, display_name, password_hash, is_active')
        .eq('username', username)
        .maybeSingle()
      if (!guest) return jsonResponse({ error: 'Invalid username or password' }, 401)
      if (!guest.is_active) return jsonResponse({ error: 'Account is deactivated' }, 403)

      const ok = await verifyPassword(password, guest.password_hash)
      if (!ok) return jsonResponse({ error: 'Invalid username or password' }, 401)

      const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID()
      const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString()
      await supabaseAdmin.from('guest_sessions').insert({ guest_id: guest.id, session_token: sessionToken, expires_at: expiresAt })
      await supabaseAdmin.from('guest_students').update({ last_login_at: new Date().toISOString() }).eq('id', guest.id)

      return jsonResponse({
        guest: { id: guest.id, username: guest.username, display_name: guest.display_name },
        sessionToken, expiresAt,
      })
    }

    // ── LOGOUT ──────────────────────────────────
    if (action === 'logout' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const sessionToken = String(body.sessionToken || '')
      if (SESSION_TOKEN_REGEX.test(sessionToken)) {
        await supabaseAdmin.from('guest_sessions').delete().eq('session_token', sessionToken)
      }
      return jsonResponse({ success: true })
    }

    // All remaining endpoints require a session
    const body = await req.json().catch(() => ({}))
    const sessionToken = String(body.sessionToken || '')
    const session = await validateSession(supabaseAdmin, sessionToken)
    if (!session) return jsonResponse({ error: 'Invalid or expired session' }, 401)

    // ── LIST QUIZZES (guest section only) ──────
    if (action === 'list-quizzes' && req.method === 'POST') {
      const { data: guestSection } = await supabaseAdmin
        .from('sections').select('id').eq('is_guest_section', true).maybeSingle()
      if (!guestSection) return jsonResponse({ quizzes: [] })

      const { data: quizzes } = await supabaseAdmin
        .from('quizzes')
        .select('id, title, description, quiz_type, difficulty, audio_url, audio_script, transcript_visibility, max_plays, reading_passage')
        .eq('section_id', guestSection.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const sanitized = (quizzes || []).map((q: any) => {
        const { audio_url, ...rest } = q
        return {
          ...rest,
          has_audio: !!audio_url,
          audio_script: q.transcript_visibility === 'never' ? null : q.audio_script,
        }
      })
      return jsonResponse({ quizzes: sanitized })
    }

    // ── GET SIGNED AUDIO URL ───────────────────
    if (action === 'get-audio-url' && req.method === 'POST') {
      const quizId = String(body.quizId || '')
      if (!UUID_REGEX.test(quizId)) return jsonResponse({ error: 'Invalid quizId' }, 400)

      const { data: guestSection } = await supabaseAdmin
        .from('sections').select('id').eq('is_guest_section', true).maybeSingle()
      if (!guestSection) return jsonResponse({ error: 'No guest section configured' }, 403)

      const { data: quiz } = await supabaseAdmin
        .from('quizzes').select('id, section_id, is_active, audio_url').eq('id', quizId).maybeSingle()
      if (!quiz || quiz.section_id !== guestSection.id || !quiz.is_active || !quiz.audio_url) {
        return jsonResponse({ error: 'Audio not available' }, 403)
      }

      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from('quiz-audio')
        .createSignedUrl(quiz.audio_url, 3600)
      if (signErr || !signed?.signedUrl) {
        console.error('[guest-auth] signed url error', signErr)
        return jsonResponse({ error: 'Failed to generate audio URL' }, 500)
      }
      return jsonResponse({ signedUrl: signed.signedUrl })
    }

    // ── GET QUIZ QUESTIONS ─────────────────────
    if (action === 'get-questions' && req.method === 'POST') {
      const quizId = String(body.quizId || '')
      if (!UUID_REGEX.test(quizId)) return jsonResponse({ error: 'Invalid quizId' }, 400)

      // Confirm quiz belongs to guest section
      const { data: guestSection } = await supabaseAdmin
        .from('sections').select('id').eq('is_guest_section', true).maybeSingle()
      if (!guestSection) return jsonResponse({ error: 'No guest section configured' }, 403)

      const { data: quiz } = await supabaseAdmin
        .from('quizzes').select('id, section_id, is_active').eq('id', quizId).maybeSingle()
      if (!quiz || quiz.section_id !== guestSection.id || !quiz.is_active) {
        return jsonResponse({ error: 'Quiz not available' }, 403)
      }

      const { data: questions } = await supabaseAdmin
        .from('quiz_questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, reading_passage, skill')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true })

      return jsonResponse({ questions: questions || [] })
    }

    // ── SUBMIT ANSWERS ─────────────────────────
    if (action === 'submit-quiz' && req.method === 'POST') {
      const quizId = String(body.quizId || '')
      const answers = body.answers as Record<string, string>
      if (!UUID_REGEX.test(quizId) || !answers || typeof answers !== 'object') {
        return jsonResponse({ error: 'Invalid payload' }, 400)
      }

      const { data: guestSection } = await supabaseAdmin
        .from('sections').select('id').eq('is_guest_section', true).maybeSingle()
      if (!guestSection) return jsonResponse({ error: 'No guest section configured' }, 403)

      const { data: quiz } = await supabaseAdmin
        .from('quizzes').select('id, section_id, is_active').eq('id', quizId).maybeSingle()
      if (!quiz || quiz.section_id !== guestSection.id || !quiz.is_active) {
        return jsonResponse({ error: 'Quiz not available' }, 403)
      }

      const { data: questions } = await supabaseAdmin
        .from('quiz_questions').select('id, correct_answer, explanation').eq('quiz_id', quizId)
      if (!questions) return jsonResponse({ error: 'No questions' }, 400)

      const rows = []
      const results = []
      for (const q of questions) {
        const selected = answers[q.id]
        if (typeof selected !== 'string' || !/^[A-Da-d]$/.test(selected)) continue
        const upper = selected.toUpperCase()
        const isCorrect = upper === String(q.correct_answer).toUpperCase()
        rows.push({ guest_id: session.guest_id, question_id: q.id, selected_answer: upper, is_correct: isCorrect })
        results.push({ question_id: q.id, selected_answer: upper, is_correct: isCorrect, correct_answer: q.correct_answer, explanation: q.explanation })
      }

      // Replace prior submissions for this guest+quiz
      await supabaseAdmin.from('quiz_submissions').delete().eq('guest_id', session.guest_id).in('question_id', questions.map((q: any) => q.id))

      if (rows.length > 0) {
        const { error: insErr } = await supabaseAdmin.from('quiz_submissions').insert(rows)
        if (insErr) {
          console.error('[guest-auth] submit insert error', insErr)
          return jsonResponse({ error: 'Failed to save submission' }, 500)
        }
      }

      const score = results.filter(r => r.is_correct).length
      return jsonResponse({ score, total: results.length, results })
    }

    // ── RETAKE: clear submissions ──────────────
    if (action === 'retake-quiz' && req.method === 'POST') {
      const quizId = String(body.quizId || '')
      if (!UUID_REGEX.test(quizId)) return jsonResponse({ error: 'Invalid quizId' }, 400)

      const { data: questions } = await supabaseAdmin
        .from('quiz_questions').select('id').eq('quiz_id', quizId)
      if (questions && questions.length > 0) {
        await supabaseAdmin
          .from('quiz_submissions').delete()
          .eq('guest_id', session.guest_id)
          .in('question_id', questions.map((q: any) => q.id))
      }
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Unknown action' }, 404)
  } catch (err) {
    console.error('[guest-auth] unexpected error', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
