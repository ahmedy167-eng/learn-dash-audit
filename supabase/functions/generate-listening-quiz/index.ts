import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SKILL_ENUM = ["main_idea", "detail", "inference", "vocabulary", "purpose"] as const;

const RequestSchema = z.object({
  script: z.string().trim().min(100, "Script must be at least 100 characters").max(4000),
  count: z.number().int().min(10).max(25),
  voice_id: z.string().min(1).max(100),
  quiz_id: z.string().uuid(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function generateAudio(script: string, voiceId: string): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
        signal: ctrl.signal,
      }
    );
    if (!r.ok) {
      const t = await r.text();
      console.error("ElevenLabs error", r.status, t);
      throw new Response(JSON.stringify({ error: `Audio generation failed (${r.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return await r.arrayBuffer();
  } finally {
    clearTimeout(t);
  }
}

async function generateQuestions(script: string, count: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You generate multiple-choice listening-comprehension questions strictly grounded in a provided audio script. Each question must be answerable from the script alone. Vary skill types and tag each question with one of: main_idea, detail, inference, vocabulary, purpose. Provide exactly 4 distinct plausible options and one correct answer letter (A/B/C/D). Include a 1-2 sentence explanation citing the script.",
          },
          {
            role: "user",
            content: `Generate exactly ${count} listening-comprehension MCQs from this script.\n\nSCRIPT:\n${script}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_questions",
            description: "Emit the generated MCQs",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  description: `Exactly ${count} questions`,
                  items: {
                    type: "object",
                    properties: {
                      question_text: { type: "string" },
                      option_a: { type: "string" },
                      option_b: { type: "string" },
                      option_c: { type: "string" },
                      option_d: { type: "string" },
                      correct_answer: { type: "string", description: "A, B, C, or D" },
                      explanation: { type: "string" },
                      skill: { type: "string", enum: [...SKILL_ENUM] },
                    },
                    required: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation", "skill"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_questions" } },
      }),
      signal: ctrl.signal,
    });
    if (r.status === 429) throw new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) throw new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      console.error("AI error", r.status, t);
      throw new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = await r.json();
    const tc = result.choices?.[0]?.message?.tool_calls?.[0];
    let args: any = null;
    try { args = tc ? JSON.parse(tc.function.arguments) : null; } catch { args = null; }
    return sanitizeQuestions(args?.questions, count);
  } finally {
    clearTimeout(t);
  }
}

function sanitizeQuestions(arr: any, count: number) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((q) => q && typeof q === "object")
    .map((q) => ({
      question_text: String(q.question_text || "").trim().slice(0, 1000),
      option_a: String(q.option_a || "").trim().slice(0, 500),
      option_b: String(q.option_b || "").trim().slice(0, 500),
      option_c: String(q.option_c || "").trim().slice(0, 500),
      option_d: String(q.option_d || "").trim().slice(0, 500),
      correct_answer: ["A", "B", "C", "D"].includes(String(q.correct_answer)) ? String(q.correct_answer) : "A",
      explanation: String(q.explanation || "").trim().slice(0, 800) || null,
      skill: SKILL_ENUM.includes(q.skill) ? q.skill : "detail",
    }))
    .filter((q) => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d)
    .slice(0, count);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    let raw: unknown;
    try { raw = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid request", details: parsed.error.flatten() }, 400);
    }
    const { script, count, voice_id, quiz_id } = parsed.data;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the quiz belongs to this user
    const { data: quiz, error: quizErr } = await admin
      .from("quizzes")
      .select("id, user_id")
      .eq("id", quiz_id)
      .single();
    if (quizErr || !quiz || quiz.user_id !== user.id) {
      return jsonResponse({ error: "Quiz not found or unauthorized" }, 403);
    }

    // 1. Generate audio
    const audioBuffer = await generateAudio(script, voice_id);

    // 2. Upload to storage
    const path = `${user.id}/${quiz_id}.mp3`;
    const { error: upErr } = await admin.storage
      .from("quiz-audio")
      .upload(path, new Uint8Array(audioBuffer), {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (upErr) {
      console.error("Storage upload error", upErr);
      return jsonResponse({ error: "Failed to store audio" }, 500);
    }

    // 3. Generate questions
    const questions = await generateQuestions(script, count);
    if (questions.length === 0) {
      return jsonResponse({ error: "AI returned no usable questions. Try again." }, 502);
    }

    // 4. Update quiz row with audio path + script
    await admin
      .from("quizzes")
      .update({ audio_url: path, audio_script: script, voice_id })
      .eq("id", quiz_id);

    return jsonResponse({ audio_path: path, questions });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("generate-listening-quiz error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
