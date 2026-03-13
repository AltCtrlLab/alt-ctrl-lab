import React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Pass `true` to remove default padding (e.g. for full-bleed layouts) */
  noPadding?: boolean;
}

/**
 * Shared page wrapper for dashboard pages.
 * Responds to html.light via the app-shell CSS class.
 * Usage: replace `<div className="min-h-screen bg-zinc-950 ...">` with `<PageShell>`.
 */
export function PageShell({ children, className, noPadding = false }: PageShellProps) {
  return (
    <div className={cn(
      'app-shell min-h-screen text-zinc-300 antialiased',
      !noPadding && 'p-6',
      className
    )}>
      {children}
    </div>
  );
}
