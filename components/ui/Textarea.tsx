'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex w-full rounded-lg border bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-100',
          'placeholder:text-zinc-600',
          'focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          error ? 'border-rose-500/50 focus:border-rose-500' : 'border-zinc-800',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
