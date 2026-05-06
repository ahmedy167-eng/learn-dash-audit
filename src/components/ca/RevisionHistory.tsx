import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnnotatedView } from './AnnotatedView';
import { sanitizeHtml } from '@/lib/sanitize';
import { format } from 'date-fns';
import { History } from 'lucide-react';

export interface Revision {
  id: string;
  submission_id: string;
  round_number: number;
  content_snapshot: string | null;
  feedback_html_snapshot: string | null;
  created_at: string;
}

interface RevisionHistoryProps {
  revisions: Revision[];
}

export function RevisionHistory({ revisions }: RevisionHistoryProps) {
  if (!revisions || revisions.length === 0) return null;
  const sorted = [...revisions].sort((a, b) => a.round_number - b.round_number);
  return (
    <div className="border border-muted rounded-md">
      <Accordion type="single" collapsible>
        <AccordionItem value="revisions" className="border-0">
          <AccordionTrigger className="px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Previous feedback ({sorted.length} round{sorted.length > 1 ? 's' : ''})
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 space-y-4">
            {sorted.map((r) => (
              <div key={r.id} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Round {r.round_number} — {format(new Date(r.created_at), 'PPp')}
                </p>
                {r.content_snapshot && (
                  <div className="text-xs">
                    <p className="font-medium mb-1">Your text at the time:</p>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none p-2 bg-muted/40 rounded"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.content_snapshot) }}
                    />
                  </div>
                )}
                {r.feedback_html_snapshot && (
                  <AnnotatedView html={r.feedback_html_snapshot} />
                )}
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
