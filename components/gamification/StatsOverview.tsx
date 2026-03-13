'use client';

import React from 'react';
import { CheckCircle2, Clock, Target, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface StatsOverviewProps {
  tasksCompleted: number;
  tasksPending: number;
  approvalRate: number;
  avgResponseTime: string;
}

export function StatsOverview({
  tasksCompleted,
  tasksPending,
  approvalRate,
  avgResponseTime,
}: StatsOverviewProps) {
  const stats = [
    {
      label: 'Tâches Complétées',
      value: tasksCompleted,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'En Attente',
      value: tasksPending,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Taux d\'Approbation',
      value: `${approvalRate}%`,
      icon: Target,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Temps Moyen',
      value: avgResponseTime,
      icon: TrendingUp,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} variant="default" padding="sm" className="hover:border-zinc-700 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-zinc-100">{stat.value}</p>
            </div>
            <div className={cn('p-2 rounded-lg', stat.bgColor)}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
