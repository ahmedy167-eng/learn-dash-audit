# Diary UI/UX Polish

Pure visual refinement of the existing diary at `/diary`. No layout restructure, no new features, no data changes.

## 1. Global tokens & utilities (`src/index.css`)

Add reusable utilities so polish stays consistent and themable:

- `.glass-diary` — upgrade to layered glass: subtle top-highlight inset, soft outer shadow, dual gradient surface (light/dark variants).
- `.btn-premium` — gradient fill (accent → glow), inset highlight, hover lift + glow ring, active scale-down.
- `.gradient-ring` — animated gradient border via mask trick, driven by `--ring-from` / `--ring-to` CSS vars (per-category color).
- `.diary-bg-wash` — very soft multi-radial gradient background for the page.
- `.sidebar-item` — hover slide + icon scale/rotate.
- `.notebook-shadow` — refined layered shadow (1px hairline + close + far).
- `.fade-in-up` keyframe for staggered card entrance.

## 2. Page shell (`src/pages/Diary.tsx`)

- Wrap content in `diary-bg-wash` for a soft global gradient.
- Increase header spacing; add subtle muted serif tagline.
- Add staggered `fade-in-up` to the three columns on mount.

## 3. Cards (`src/components/diary/PaperCard.tsx`)

- Replace plain border with `gradient-ring` driven by category accent (per-card CSS vars).
- Stronger title typography (serif, larger, tighter tracking); softer secondary text color.
- Hover: lift `-y-4` + scale `1.01`, deeper shadow, accent stripe widens slightly.
- Active: dual-tone gradient ring + glow.
- Tighter, more generous internal spacing (p-5, mb-3); tag chips with subtle border + bg gradient.

## 4. Sidebar (`src/components/diary/DiarySidebar.tsx`)

- Apply `.sidebar-item` to category buttons (hover slide + icon spring).
- Active category: gradient pill background (`color → transparent`) plus left accent bar with glow.
- Streak/Mood tiles: gradient background, inner highlight, tiny pulsing flame icon for streak.
- "New Entry" button uses `.btn-premium`.
- Tools row gets soft hover background & icon scale.
- Section headings: smaller uppercase tracking, more whitespace between groups.

## 5. Calendar

- Replace single dot with up-to-3 colored dots per day (one per distinct mood/category that day).
- Today: ring + soft glow background.
- Selected day: filled gradient (accent → glow).
- Day cell hover: scale-105 + tooltip-style title attribute showing entry count.
- Improve cell typography (font-medium, slightly larger).

## 6. Right panel (`src/components/diary/AIAssistantPanel.tsx`)

- Each card: full glass-diary + subtle category-tinted gradient overlay.
- AI Reflection: prominent gradient icon badge (already present) + small animated sparkle pulse; section labels in uppercase tracking; action items as styled chips with hover.
- Add subtle staggered fade-in on mount via framer-motion.
- Daily quote card: serif italic enlarged, decorative quote glyph in corner with very low opacity.

## 7. Typography

- Titles: `font-serif-diary text-lg/xl` with `tracking-tight`.
- Body/preview: `text-sm leading-relaxed text-muted-foreground/85`.
- Section labels: `text-[10px] uppercase tracking-[0.14em] text-muted-foreground`.

## 8. Buttons (global within diary)

- All primary CTAs use `.btn-premium`.
- Secondary buttons get `hover:bg-muted/60` + `hover:shadow-sm` and `active:scale-[0.98]`.

## 9. Micro-interactions

- Card hover: spring lift via existing framer-motion.
- Button hover: glow ring (CSS).
- Sidebar item hover: translateX + icon rotate.
- Calendar hover: scale + dot bounce.
- Page-load: staggered column fade-in.

## Files to edit

- `src/index.css` — new utilities & keyframes
- `src/pages/Diary.tsx` — wash + stagger
- `src/components/diary/PaperCard.tsx` — gradient ring, typography, hover
- `src/components/diary/DiarySidebar.tsx` — hover effects, gradient tiles, calendar dots
- `src/components/diary/AIAssistantPanel.tsx` — stacked glass cards, polish
- `src/components/diary/DiaryTimeline.tsx` — date divider styling, stagger

## Out of scope

No changes to data hooks, edge functions, routes, or feature behavior.
