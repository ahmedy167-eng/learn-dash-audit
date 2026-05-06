
# Premium AI Diary Transformation

Upgrade the existing `/diary` page from a basic CRUD notebook into a luxurious, AI-powered journaling experience. We'll keep the existing `diary_notes` table and exports (PDF/Word/ICS) and build everything else around them.

## Scope (Phase 1 — shippable in one pass)

To stay under build limits and deliver a polished result, we ship a complete v1 covering the **core experience + AI + mood + analytics + voice + search + reminders**. A few "nice-to-have" items (ambient music, multi-theme selector beyond light/dark, onboarding screens, weather widget) are flagged as Phase 2.

---

## 1. Database changes (migration)

Extend `diary_notes`:
- `category` text (Personal | Teaching | Meetings | Ideas | Tasks | Research) — default 'Personal'
- `mood` text (happy | calm | productive | stressed | tired | neutral) — nullable
- `mood_emoji` text — nullable
- `ai_summary` text — nullable
- `ai_action_items` jsonb — nullable
- `ai_tags` text[] — default '{}'
- `voice_url` text — nullable (path in storage bucket)
- `is_pinned` boolean — default false

New table `diary_links` for smart memory linking:
- `id`, `note_id`, `linked_note_id`, `relevance` numeric, `created_at`
- RLS: user can read links where they own both notes

New private storage bucket `diary-voice` (signed URLs only, owner-only access).

## 2. New edge function: `diary-ai`

Single function with three actions (POST `{ action, ... }`):
- `reflect` — given note content, returns `{ summary, mood, mood_emoji, action_items[], tags[], productivity_score }`. Uses Lovable AI (`google/gemini-3-flash-preview`) via tool-calling for structured JSON.
- `transcribe` — accepts base64 audio, returns transcript (Gemini multimodal).
- `search` — natural language query → SQL filter hints (mood, category, date range, keywords) returned as JSON; client applies them to a Supabase query.

Uses `LOVABLE_API_KEY` (already configured). Validates JWT, validates input with Zod-style checks, handles 429/402 with friendly errors.

## 3. Page architecture

Replace `src/pages/Diary.tsx` with a 3-column layout:

```text
┌──────────┬─────────────────────────┬──────────┐
│ Sidebar  │   Editor / Timeline     │ AI Panel │
│ (260px)  │   (flex-1)              │ (320px)  │
└──────────┴─────────────────────────┴──────────┘
```

Collapses to single column on tablet/mobile via Sheet drawers.

### Left sidebar (`DiarySidebar.tsx`)
- Avatar + name + streak counter ("🔥 7 day streak" — computed from distinct `note_date`)
- Today's mood pill
- Mini month calendar with dots on days with notes (uses existing shadcn `Calendar`)
- Categories list with counts and active glow
- Floating "+ New Entry" button (gradient, soft glow)

### Center (`DiaryEditor.tsx` + `DiaryTimeline.tsx`)
- Tabs: **Today** (focused editor) / **Timeline** (all notes as paper cards) / **Focus** (distraction-free fullscreen)
- Editor: Playfair Display title input, paper-textured writing area, autosave indicator, mood selector (emoji row), category chip, reminder bell, voice record button
- Timeline: vertical timeline with date dividers, paper-card notes showing title/category icon/mood emoji/preview/AI tags
- Smooth Framer Motion page/card transitions, "notebook page flip" animation on open

### Right AI panel (`AIAssistantPanel.tsx`)
- **AI Reflection** card — summary + mood + action items for selected note (button: "Reflect with AI" → calls `diary-ai`)
- **Today's insights** — count, productivity score, dominant mood
- **On This Day** — notes from same date in prior weeks/months
- **Linked Memories** — related notes from `diary_links`
- **Daily quote** (rotating curated list, no API needed)

## 4. Other new routes/components

- `DiaryAnalytics.tsx` (modal/dialog from sidebar) — mood trend line, productivity heatmap (recharts), category breakdown pie, most productive weekday
- `DiarySearch.tsx` — command palette (Cmd+K) with natural-language search via `diary-ai` `search` action
- `VoiceRecorder.tsx` — MediaRecorder → upload to `diary-voice` bucket → call `diary-ai` `transcribe` → append transcript to note content
- `MoodPicker.tsx`, `CategoryChip.tsx`, `PaperCard.tsx`, `AmbientBackground.tsx` (animated gradient blobs)

## 5. Design system additions

In `src/index.css`:
- Add notebook color tokens: `--paper`, `--paper-line`, `--ink`, mood accents (`--mood-happy`, `--mood-calm`, etc.) — all HSL
- Dark mode: deep charcoal `--background: 220 18% 7%`, soft glow shadows
- Add `--font-serif: 'Playfair Display'`, `--font-display: 'Plus Jakarta Sans'`, body Inter
- Load fonts via Google Fonts link in `index.html`
- Utilities: `.glass` (backdrop-blur + translucent bg), `.paper-texture` (SVG noise data-URI), `.glow-soft`, `.notebook-shadow`
- Framer Motion animations: page fade-slide, card hover-lift, sticky-note tilt

## 6. Reminders

Keep existing `.ics` download. Add in-app floating reminder toast (uses existing sonner) when a note's `reminder_at` is within next 10 min — checked via interval on dashboard mount.

## 7. Sidebar nav

Update icon for "Diary" entry to convey premium feel (keep `NotebookPen`); no other nav changes.

---

## Technical notes

- Add deps: `framer-motion`, `recharts` (already present? will check; if so, reuse)
- All AI calls go through the edge function — never client-side
- Voice notes use `MediaRecorder` API → `audio/webm` → base64 to edge function for transcription (no separate STT key needed; Gemini handles audio)
- Search: client builds Supabase query from AI-returned filters (safer than free-form SQL)
- All new tables/buckets get strict RLS (`auth.uid() = user_id`)
- Existing PDF/Word/ICS export keeps working — extended to include mood + AI summary

---

## Phase 2 (not in this pass)

Onboarding tour, weather widget, ambient music toggle, multi-theme selector beyond light/dark, Google Calendar 2-way sync, shareable public journal pages.

---

## Files

**New:** `supabase/functions/diary-ai/index.ts`, `src/pages/Diary.tsx` (rewrite), `src/components/diary/DiarySidebar.tsx`, `DiaryEditor.tsx`, `DiaryTimeline.tsx`, `AIAssistantPanel.tsx`, `DiaryAnalytics.tsx`, `DiarySearch.tsx`, `VoiceRecorder.tsx`, `MoodPicker.tsx`, `PaperCard.tsx`, `AmbientBackground.tsx`, `src/hooks/useDiary.tsx`, `src/lib/diary-streak.ts`

**Edited:** `src/index.css`, `index.html` (fonts), `src/lib/diary-export.ts` (include mood/AI), one migration SQL file

**Deps added:** `framer-motion` (and `recharts` if not present)
