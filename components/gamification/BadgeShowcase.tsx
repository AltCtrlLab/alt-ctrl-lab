'use client';

import React from 'react';
import { Award, Lock } from 'lucide-react';
import { badges } from '@/lib/design-system/tokens';

interface BadgeShowcaseProps {
  earnedBadges?: string[];
}

export function BadgeShowcase({ earnedBadges = [] }: BadgeShowcaseProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-100 mb-4">Badges & Achievements</h3>
      
      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge) => {
          const isEarned = earnedBadges.includes(badge.id);
          
          return (
            <div 
              key={badge.id}
              className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                isEarned 
                  ? 'bg-zinc-800/50 border-zinc-700' 
                  : 'bg-zinc-950/50 border-zinc-800 opacity-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                isEarned ? 'bg-zinc-100' : 'bg-zinc-800'
              }`}>
                {isEarned ? (
                  <Award className={`w-5 h-5`} style={{ color: badge.color }} />
                ) : (
                  <Lock className="w-4 h-4 text-zinc-400" />
                )}
              </div>
              <span className={`text-xs font-medium text-center ${isEarned ? 'text-zinc-200' : 'text-zinc-400'}`}>
                {badge.name}
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 text-center leading-tight">
                {badge.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
