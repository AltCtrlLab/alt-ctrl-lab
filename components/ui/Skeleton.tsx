'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-white/[0.06] rounded ${className}`} />
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3 ${className}`}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-3 ${className}`} />;
}

export function SkeletonAvatar({ className = '' }: SkeletonProps) {
  return <Skeleton className={`w-10 h-10 rounded-full ${className}`} />;
}

export function SkeletonList({ count = 5, className = '' }: SkeletonProps & { count?: number }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
