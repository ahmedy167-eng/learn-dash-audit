import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ABBREVIATIONS, getColorForAbbr, getMeaningForAbbr, generateAnnotationId } from '@/lib/annotations';
import { sanitizeHtml } from '@/lib/sanitize';
import { X, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnotatableTextProps {
  html: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}

interface ToolbarState {
  visible: boolean;
  top: number;
  left: number;
  mode: 'create' | 'edit';
  abbr: string;
  comment: string;
  customLabel: string;
  isCustom: boolean;
  targetMarkId: string | null;
  // for create mode, we serialize range info as start/end via a temporary placeholder
  pendingRange: Range | null;
}

const initialToolbar: ToolbarState = {
  visible: false, top: 0, left: 0, mode: 'create',
  abbr: '', comment: '', customLabel: '', isCustom: false,
  targetMarkId: null, pendingRange: null,
};

export function AnnotatableText({ html, onChange, readOnly = false }: AnnotatableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<ToolbarState>(initialToolbar);

  // Render HTML into the container (sanitized)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = sanitizeHtml(html);
      // attach colour classes / tooltips to existing marks
      containerRef.current.querySelectorAll('mark[data-abbr]').forEach((el) => {
        const abbr = el.getAttribute('data-abbr') || '';
        el.className = cn('rounded px-0.5 cursor-pointer relative', getColorForAbbr(abbr));
      });
    }
  }, [html]);

  const closeToolbar = () => setToolbar(initialToolbar);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    const target = e.target as HTMLElement;
    const markEl = target.closest('mark[data-abbr]') as HTMLElement | null;
    if (markEl) {
      const rect = markEl.getBoundingClientRect();
      const containerRect = containerRef.current!.getBoundingClientRect();
      const abbr = markEl.getAttribute('data-abbr') || '';
      const comment = markEl.getAttribute('data-comment') || '';
      const id = markEl.getAttribute('data-id') || '';
      const isCustom = !ABBREVIATIONS.some(a => a.code === abbr);
      setToolbar({
        visible: true,
        top: rect.bottom - containerRect.top + 6,
        left: rect.left - containerRect.left,
        mode: 'edit',
        abbr,
        comment,
        customLabel: isCustom ? abbr : '',
        isCustom,
        targetMarkId: id,
        pendingRange: null,
      });
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setToolbar({
      visible: true,
      top: rect.bottom - containerRect.top + 6,
      left: rect.left - containerRect.left,
      mode: 'create',
      abbr: '',
      comment: '',
      customLabel: '',
      isCustom: false,
      targetMarkId: null,
      pendingRange: range.cloneRange(),
    });
  }, [readOnly]);

  const persist = () => {
    if (containerRef.current) {
      onChange(sanitizeHtml(containerRef.current.innerHTML));
    }
  };

  const handleSave = () => {
    const finalAbbr = toolbar.isCustom ? toolbar.customLabel.trim() : toolbar.abbr;
    if (!finalAbbr) return;

    if (toolbar.mode === 'edit' && toolbar.targetMarkId) {
      const mark = containerRef.current?.querySelector(`mark[data-id="${toolbar.targetMarkId}"]`) as HTMLElement | null;
      if (mark) {
        mark.setAttribute('data-abbr', finalAbbr);
        mark.setAttribute('data-comment', toolbar.comment);
        mark.className = cn('rounded px-0.5 cursor-pointer relative', getColorForAbbr(finalAbbr));
      }
    } else if (toolbar.mode === 'create' && toolbar.pendingRange) {
      try {
        const range = toolbar.pendingRange;
        const mark = document.createElement('mark');
        const id = generateAnnotationId();
        mark.setAttribute('data-abbr', finalAbbr);
        mark.setAttribute('data-comment', toolbar.comment);
        mark.setAttribute('data-id', id);
        mark.className = cn('rounded px-0.5 cursor-pointer relative', getColorForAbbr(finalAbbr));
        // Surround contents (only works on simple ranges; fallback to extract+wrap)
        try {
          range.surroundContents(mark);
        } catch {
          const contents = range.extractContents();
          mark.appendChild(contents);
          range.insertNode(mark);
        }
        window.getSelection()?.removeAllRanges();
      } catch (err) {
        console.error('Failed to wrap selection', err);
      }
    }

    persist();
    closeToolbar();
  };

  const handleRemove = () => {
    if (toolbar.targetMarkId) {
      const mark = containerRef.current?.querySelector(`mark[data-id="${toolbar.targetMarkId}"]`) as HTMLElement | null;
      if (mark && mark.parentNode) {
        while (mark.firstChild) mark.parentNode.insertBefore(mark.firstChild, mark);
        mark.parentNode.removeChild(mark);
        persist();
      }
    }
    closeToolbar();
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="prose prose-sm dark:prose-invert max-w-none p-3 bg-muted/30 rounded-md min-h-[80px] cursor-text"
      />
      {toolbar.visible && (
        <div
          className="absolute z-50 bg-popover border border-border shadow-lg rounded-lg p-3 w-80"
          style={{ top: toolbar.top, left: Math.min(toolbar.left, (containerRef.current?.clientWidth ?? 400) - 320) }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {toolbar.mode === 'edit' ? 'Edit annotation' : 'Tag selection'}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={closeToolbar}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {ABBREVIATIONS.map((a) => (
              <button
                key={a.code}
                onClick={() => setToolbar(s => ({ ...s, abbr: a.code, isCustom: false }))}
                title={a.meaning}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium border transition-all',
                  a.colorClass,
                  toolbar.abbr === a.code && !toolbar.isCustom ? 'ring-2 ring-primary border-primary' : 'border-transparent'
                )}
              >
                {a.code}
              </button>
            ))}
            <button
              onClick={() => setToolbar(s => ({ ...s, isCustom: true }))}
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium border transition-all bg-muted text-foreground',
                toolbar.isCustom ? 'ring-2 ring-primary border-primary' : 'border-transparent'
              )}
            >
              + Custom
            </button>
          </div>
          {toolbar.isCustom && (
            <Input
              value={toolbar.customLabel}
              onChange={(e) => setToolbar(s => ({ ...s, customLabel: e.target.value }))}
              placeholder="Custom label (e.g. Awk)"
              className="mb-2 h-8 text-xs"
            />
          )}
          {toolbar.abbr && !toolbar.isCustom && (
            <p className="text-[11px] text-muted-foreground mb-2">{getMeaningForAbbr(toolbar.abbr)}</p>
          )}
          <Textarea
            value={toolbar.comment}
            onChange={(e) => setToolbar(s => ({ ...s, comment: e.target.value }))}
            placeholder="Add a comment (optional)"
            rows={2}
            className="text-xs mb-2"
          />
          <div className="flex justify-between gap-2">
            {toolbar.mode === 'edit' ? (
              <Button variant="outline" size="sm" onClick={handleRemove} className="text-destructive">
                <Trash2 className="h-3 w-3 mr-1" /> Remove
              </Button>
            ) : <span />}
            <Button size="sm" onClick={handleSave} disabled={toolbar.isCustom ? !toolbar.customLabel.trim() : !toolbar.abbr}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
