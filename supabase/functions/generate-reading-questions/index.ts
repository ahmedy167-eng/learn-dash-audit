import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const RequestSchema = z.object({
  passage: z.string().trim().min(100, "Passage must be at least 100 characters").max(15000),
  count: z.number().int().min(10).max(25),
  difficulty: z.enum(["easy", "intermediate", "advanced"]).default("intermediate"),
});

const DIFFICULTY_GUIDE: Record<string, string> = {
  easy: "Use simple vocabulary and direct/literal questions (mostly detail and main idea). Distractors should be clearly wrong.",
  intermediate: "Mix detail, inference, and vocabulary questions with moderately plausible distractors.",
  advanced: "Emphasize inference, nuanced vocabulary, and author's purpose. Distractors must be highly plausible and require careful reading.",
};

async function callAI(body: unknown, timeoutMs = 90_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let r: Response;
  try {
    r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(t);
    if ((err as any)?.name === "AbortError") {
      throw new Response(JSON.stringify({ error: "AI request timed out. Try a shorter passage or fewer questions." }), {
        status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw err;
  }
  clearTimeout(t);
  if (r.status === 429) throw new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (r.status === 402) throw new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!r.ok) {
    const t = await r.text();
    console.error("AI gateway error", r.status, t);
    throw new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return r.json();
}

function sanitizeQuestions(arr: any, count: number) {
  if (!Array.isArray(arr)) return [];
  const valid = arr
    .filter((q) => q && typeof q === "object")
    .map((q) => ({
      question_text: String(q.question_text || "").trim().slice(0, 1000),
      option_a: String(q.option_a || "").trim().slice(0, 500),
      option_b: String(q.option_b || "").trim().slice(0, 500),
      option_c: String(q.option_c || "").trim().slice(0, 500),
      option_d: String(q.option_d || "").trim().slice(0, 500),
      correct_answer: ["A", "B", "C", "D"].includes(String(q.correct_answer)) ? String(q.correct_answer) : "A",
      explanation: String(q.explanation || "").trim().slice(0, 800) || null,
    }))
    .filter((q) => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d)
    .slice(0, count);
  return valid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let raw: unknown;
    try { raw = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { passage, count } = parsed.data;

    const result = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You generate multiple-choice reading-comprehension questions strictly grounded in a provided passage. Each question must be answerable from the passage alone. Vary question types (main idea, detail, inference, vocabulary in context, author's purpose). Provide exactly 4 distinct plausible options and one correct answer letter (A/B/C/D). Include a 1-2 sentence explanation citing the passage.",
        },
        {
          role: "user",
          content: `Generate exactly ${count} reading-comprehension MCQs from this passage.\n\nPASSAGE:\n${passage}`,
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
                  },
                  required: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation"],
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
    });

    const tc = result.choices?.[0]?.message?.tool_calls?.[0];
    let args: any = null;
    try { args = tc ? JSON.parse(tc.function.arguments) : null; } catch { args = null; }
    const questions = sanitizeQuestions(args?.questions, count);

    if (questions.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned no usable questions. Try again." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("generate-reading-questions error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
