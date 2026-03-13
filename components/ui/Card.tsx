import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      'bg-zinc-900 border border-zinc-800 rounded-xl',
      className
    )}>
      {children}
    </div>
  );
}
