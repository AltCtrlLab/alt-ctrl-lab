import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'accent';
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variantStyles = {
    default: 'bg-zinc-900 border-zinc-800',
    glass: 'bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-black/30 shadow-lg',
    accent: 'bg-fuchsia-500/[0.03] border-fuchsia-500/[0.08] backdrop-blur-xl shadow-lg',
  };

  return (
    <div className={cn('rounded-xl border', variantStyles[variant], className)}>
      {children}
    </div>
  );
}
