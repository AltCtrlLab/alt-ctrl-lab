import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass';
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  return (
    <div className={cn(
      'rounded-xl border',
      variant === 'glass'
        ? 'bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-black/30 shadow-lg'
        : 'bg-zinc-900 border-zinc-800',
      className
    )}>
      {children}
    </div>
  );
}
