'use client';

import React from 'react';
import { Status } from './types';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<Status, { label: string; bgColor: string; textColor: string; dotColor: string; ringColor: string }> = {
  idle: {
    label: 'Inactif',
    bgColor: 'bg-neutral-800',
    textColor: 'text-neutral-400',
    dotColor: 'bg-neutral-500',
    ringColor: 'ring-neutral-500/20',
  },
  running: {
    label: 'En cours',
    bgColor: 'bg-blue-950/50',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-500',
    ringColor: 'ring-blue-500/20',
  },
  completed: {
    label: 'Terminé',
    bgColor: 'bg-emerald-950/50',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-500',
    ringColor: 'ring-emerald-500/20',
  },
  error: {
    label: 'Erreur',
    bgColor: 'bg-red-950/50',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    ringColor: 'ring-red-500/20',
  },
  paused: {
    label: 'En pause',
    bgColor: 'bg-amber-950/50',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
    ringColor: 'ring-amber-500/20',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

const dotSizeClasses = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showLabel = true 
}) => {
  const config = statusConfig[status];
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        border border-neutral-800
        ${config.bgColor}
        ${config.textColor}
        ${config.ringColor}
        ${sizeClasses[size]}
      `}
    >
      <span
        className={`
          rounded-full
          ${config.dotColor}
          ${dotSizeClasses[size]}
          ${status === 'running' ? 'animate-pulse' : ''}
        `}
      />
      {showLabel && config.label}
    </span>
  );
};

export default StatusBadge;
