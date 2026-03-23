'use client';

import React from 'react';
import { Flame, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyStreakProps {
  currentStreak: number;
  longestStreak: number;
  weekActivity: boolean[]; // 7 jours, true = actif
}

const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function DailyStreak({ currentStreak, longestStreak, weekActivity }: DailyStreakProps) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className={cn(
            "w-5 h-5",
            currentStreak > 0 ? "text-rose-500" : "text-zinc-400"
          )} />
          <span className="font-semibold text-zinc-100">Streak Quotidien</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-rose-500">{currentStreak}</div>
          <div className="text-xs text-zinc-400">jours</div>
        </div>
      </div>
      
      {/* Visualisation de la semaine */}
      <div className="flex justify-between mb-3">
        {days.map((day, index) => {
          const isActive = weekActivity[index];
          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isActive 
                  ? "bg-rose-500/20 border border-rose-500/50 text-rose-400" 
                  : "bg-zinc-800 border border-zinc-700 text-zinc-400"
              )}>
                {isActive && <Check className="w-4 h-4" />}
              </div>
              <span className="text-xs text-zinc-400">{day}</span>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between text-xs text-zinc-400 border-t border-zinc-800 pt-3">
        <span>Record: <span className="text-zinc-300 font-medium">{longestStreak} jours</span></span>
        <span className="text-rose-400">
          {currentStreak >= 7 ? '🔥 En feu!' : currentStreak >= 3 ? '⚡ Ça monte!' : '💪 Continue!'}
        </span>
      </div>
    </div>
  );
}
