import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const MOODS = ["happy", "calm", "productive", "stressed", "tired", "neutral"] as const;
const CATEGORIES = ["Personal", "Teaching", "Meetings", "Ideas", "Tasks", "Research"] as const;

const ReflectSchema = z.object({
  action: z.literal("reflect"),
  title: z.string().trim().max(200).optional().default(""),
  content: z.string().trim().min(1, "content required").max(8000),
});

const TranscribeSchema = z.object({
  action: z.literal("transcribe"),
  audio_base64: z.string().min(1, "audio_base64 required").max(15_000_000),
  mime: z.string().trim().max(100).optional().default("audio/webm"),
});

const SearchSchema = z.object({
  action: z.literal("search"),
  query: z.string().trim().min(1, "query required").max(500),
});

const CategorizeSchema = z.object({
  action: z.literal("categorize"),
  title: z.string().trim().max(200).optional().default(""),
  content: z.string().trim().max(8000).optional().default(""),
});

const RequestSchema = z.discriminatedUnion("action", [ReflectSchema, TranscribeSchema, SearchSchema, CategorizeSchema]);

// Output sanitizer: enforce mood/category enum membership; coerce invalid → empty
function sanitizeFilters(f: any) {
  if (!f || typeof f !== "object") return null;
  const mood = typeof f.mood === "string" && (MOODS as readonly string[]).includes(f.mood) ? f.mood : "";
  const category = typeof f.category === "string" && (CATEGORIES as readonly string[]).includes(f.category) ? f.category : "";
  const keywords = Array.isArray(f.keywords)
    ? f.keywords.filter((k: unknown) => typeof k === "string" && k.trim().length > 0).slice(0, 10).map((k: string) => k.trim().slice(0, 80))
    : [];
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const date_from = typeof f.date_from === "string" && dateRe.test(f.date_from) ? f.date_from : "";
  const date_to = typeof f.date_to === "string" && dateRe.test(f.date_to) ? f.date_to : "";
  return { mood, category, keywords, date_from, date_to };
}

function sanitizeReflection(r: any) {
  if (!r || typeof r !== "object") return null;
  const mood = typeof r.mood === "string" && (MOODS as readonly string[]).includes(r.mood) ? r.mood : "neutral";
  return {
    summary: typeof r.summary === "string" ? r.summary.slice(0, 500) : "",
    mood,
    mood_emoji: typeof r.mood_emoji === "string" ? r.mood_emoji.slice(0, 8) : "✨",
    action_items: Array.isArray(r.action_items)
      ? r.action_items.filter((x: unknown) => typeof x === "string").slice(0, 5).map((x: string) => x.slice(0, 200))
      : [],
    tags: Array.isArray(r.tags)
      ? r.tags.filter((x: unknown) => typeof x === "string").slice(0, 6).map((x: string) => x.slice(0, 40))
      : [],
    productivity_score: typeof r.productivity_score === "number" ? Math.max(0, Math.min(100, r.productivity_score)) : 0,
    insight: typeof r.insight === "string" ? r.insight.slice(0, 300) : "",
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function callAI(body: unknown) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (r.status === 429) throw new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (r.status === 402) throw new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!r.ok) {
    const t = await r.text();
    console.error("AI gateway error", r.status, t);
    throw new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return r.json();
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

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const input = parsed.data;

    if (input.action === "reflect") {
      const { title, content } = input;

      const result = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a thoughtful journaling assistant. Analyze the diary entry and return structured reflection." },
          { role: "user", content: `Title: ${title}\n\nEntry:\n${content}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "reflect",
            description: "Return reflection analysis",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "1-2 sentence summary" },
                mood: { type: "string", description: `One of: ${MOODS.join(", ")}` },
                mood_emoji: { type: "string", description: "Single emoji matching mood" },
                action_items: { type: "array", items: { type: "string" }, description: "Up to 5 actionable items" },
                tags: { type: "array", items: { type: "string" }, description: "Up to 6 short topic tags" },
                productivity_score: { type: "number", description: "0-100" },
                insight: { type: "string", description: "One brief encouraging insight" },
              },
              required: ["summary", "mood", "mood_emoji", "action_items", "tags", "productivity_score", "insight"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "reflect" } },
      });

      const tc = result.choices?.[0]?.message?.tool_calls?.[0];
      let args: any = null;
      try { args = tc ? JSON.parse(tc.function.arguments) : null; } catch { args = null; }
      const reflection = sanitizeReflection(args);
      return new Response(JSON.stringify({ reflection }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (input.action === "transcribe") {
      const { audio_base64, mime } = input;
      const result = await callAI({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Transcribe the audio verbatim. Return only the transcript text, no commentary." },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this audio." },
              { type: "input_audio", input_audio: { data: audio_base64, format: mime.includes("mp3") ? "mp3" : "webm" } },
            ],
          },
        ],
      });
      const text = (result.choices?.[0]?.message?.content || "").toString().slice(0, 20000);
      return new Response(JSON.stringify({ transcript: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (input.action === "search") {
      const { query } = input;
      const result = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Convert a natural-language diary search into structured filters. Use empty string when a field is not specified." },
          { role: "user", content: query },
        ],
        tools: [{
          type: "function",
          function: {
            name: "to_filters",
            description: "Return structured filters",
            parameters: {
              type: "object",
              properties: {
                mood: { type: "string", description: `One of: ${MOODS.join(", ")}. Empty string if unspecified.` },
                category: { type: "string", description: `One of: ${CATEGORIES.join(", ")}. Empty string if unspecified.` },
                keywords: { type: "array", items: { type: "string" } },
                date_from: { type: "string", description: "YYYY-MM-DD or empty" },
                date_to: { type: "string", description: "YYYY-MM-DD or empty" },
              },
              required: ["mood", "category", "keywords", "date_from", "date_to"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "to_filters" } },
      });
      const tc = result.choices?.[0]?.message?.tool_calls?.[0];
      let args: any = null;
      try { args = tc ? JSON.parse(tc.function.arguments) : null; } catch { args = null; }
      const filters = sanitizeFilters(args);
      return new Response(JSON.stringify({ filters }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (input.action === "categorize") {
      const { title, content } = input;
      const text = `${title}\n\n${content}`.trim();
      if (!text) {
        return new Response(JSON.stringify({ category: "Personal" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const result = await callAI({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `Classify a diary entry into exactly one category from: ${CATEGORIES.join(", ")}. Choose the most appropriate based on the title and content.` },
          { role: "user", content: text.slice(0, 4000) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "categorize",
            description: "Pick the single best category",
            parameters: {
              type: "object",
              properties: {
                category: { type: "string", description: `One of: ${CATEGORIES.join(", ")}` },
              },
              required: ["category"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "categorize" } },
      });
      const tc = result.choices?.[0]?.message?.tool_calls?.[0];
      let args: any = null;
      try { args = tc ? JSON.parse(tc.function.arguments) : null; } catch { args = null; }
      const category = args && typeof args.category === "string" && (CATEGORIES as readonly string[]).includes(args.category)
        ? args.category
        : "Personal";
      return new Response(JSON.stringify({ category }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("diary-ai error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
