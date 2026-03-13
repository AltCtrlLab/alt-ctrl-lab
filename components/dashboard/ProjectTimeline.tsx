'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  title: string;
  agentName: string;
  agentColor: string;
  status: 'completed' | 'rejected' | 'pending';
  date: string;
  xpEarned?: number;
}

interface ProjectTimelineProps {
  items: TimelineItem[];
}

export function ProjectTimeline({ items }: ProjectTimelineProps) {
  // Group by date
  const grouped = items.reduce((acc, item) => {
    const date = new Date(item.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  if (items.length === 0) {
    return (
      <Card variant="default" className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
          <Clock className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-zinc-300 font-medium mb-1">Aucun historique</h3>
        <p className="text-zinc-500 text-sm">Vos projets validés apparaîtront ici</p>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historique des Projets</CardTitle>
          <Badge variant="default">{items.length} projets</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayItems]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {date}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-zinc-800/50",
                      item.status === 'completed' 
                        ? "border-emerald-500/20 bg-emerald-500/5" 
                        : item.status === 'rejected'
                        ? "border-rose-500/20 bg-rose-500/5"
                        : "border-zinc-800 bg-zinc-900/30"
                    )}
                  >
                    {/* Status Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      item.status === 'completed' && "bg-emerald-500/20 text-emerald-400",
                      item.status === 'rejected' && "bg-rose-500/20 text-rose-400",
                      item.status === 'pending' && "bg-amber-500/20 text-amber-400"
                    )}>
                      {item.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                      {item.status === 'rejected' && <XCircle className="w-4 h-4" />}
                      {item.status === 'pending' && <Clock className="w-4 h-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-zinc-200 truncate">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span style={{ color: item.agentColor }}>{item.agentName}</span>
                        {item.xpEarned && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400">+{item.xpEarned} XP</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
