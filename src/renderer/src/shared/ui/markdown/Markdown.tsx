import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useMemo, type MouseEvent } from 'react';
import { cn } from '@/shared/lib';
import './markdown.css';

export interface MarkdownProps {
  source: string;
  className?: string;
  /** Called for http(s) links instead of navigating (the editor window never navigates). */
  onOpenLink?(url: string): void;
}

/** Markdown (release notes) rendered to sanitized HTML: no scripts, styles, images or forms. */
export function Markdown({ source, className, onOpenLink }: MarkdownProps) {
  const html = useMemo(
    () =>
      DOMPurify.sanitize(marked.parse(source, { async: false, gfm: true }), {
        FORBID_TAGS: ['img', 'style', 'form', 'input', 'button', 'iframe'],
        FORBID_ATTR: ['style', 'class', 'id'],
      }),
    [source],
  );

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element).closest('a');
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href') ?? '';
    if (/^https?:\/\//i.test(href)) onOpenLink?.(href);
  };

  // Sanitized above; links are handled by the click listener.
  return <div className={cn('markdown', className)} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
