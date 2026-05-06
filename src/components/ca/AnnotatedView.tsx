import { useEffect, useRef } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { getColorForAbbr, getMeaningForAbbr } from '@/lib/annotations';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AnnotatedViewProps {
  html: string;
}

interface Annotation {
  id: string;
  abbr: string;
  comment: string;
  text: string;
}

/**
 * Read-only renderer for teacher-annotated submission HTML.
 * Highlights stay inline in the markup; we attach an absolutely-positioned
 * tooltip via the browser's native title for graceful fallback, plus we render
 * a list of annotations underneath for clarity on small screens.
 */
export function AnnotatedView({ html }: AnnotatedViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const annotations: Annotation[] = [];

  // Parse to extract annotations
  if (typeof window !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = sanitizeHtml(html);
    tmp.querySelectorAll('mark[data-abbr]').forEach((el) => {
      annotations.push({
        id: el.getAttribute('data-id') || '',
        abbr: el.getAttribute('data-abbr') || '',
        comment: el.getAttribute('data-comment') || '',
        text: el.textContent || '',
      });
    });
  }

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = sanitizeHtml(html);
    ref.current.querySelectorAll('mark[data-abbr]').forEach((el) => {
      const abbr = el.getAttribute('data-abbr') || '';
      const comment = el.getAttribute('data-comment') || '';
      el.className = cn('rounded px-0.5', getColorForAbbr(abbr));
      el.setAttribute('title', comment ? `${abbr}: ${comment}` : abbr);
      // append a small superscript badge
      const sup = document.createElement('sup');
      sup.textContent = abbr;
      sup.className = 'ml-0.5 text-[9px] font-bold opacity-70';
      el.appendChild(sup);
    });
  }, [html]);

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="prose prose-sm dark:prose-invert max-w-none p-3 bg-primary/5 border border-primary/20 rounded-md"
      />
      {annotations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Teacher comments</p>
          <TooltipProvider>
            <ul className="space-y-1">
              {annotations.map((a) => (
                <li key={a.id} className="text-xs flex gap-2 items-start">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn('px-1.5 py-0.5 rounded font-bold shrink-0', getColorForAbbr(a.abbr))}>
                        {a.abbr}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{getMeaningForAbbr(a.abbr)}</TooltipContent>
                  </Tooltip>
                  <span className="text-muted-foreground">
                    <span className="italic">"{a.text}"</span>
                    {a.comment && <> — {a.comment}</>}
                  </span>
                </li>
              ))}
            </ul>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
