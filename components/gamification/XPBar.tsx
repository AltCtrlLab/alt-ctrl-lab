'use client';

import React from 'react';
import { Zap, TrendingUp } from 'lucide-react';
import { xpSystem } from '@/lib/design-system/tokens';

interface XPBarProps {
  currentXP: number;
  streak?: number;
}

export function XPBar({ currentXP, streak = 0 }: XPBarProps) {
  // Trouve le niveau actuel
  const currentLevel = xpSystem.levels.reduce((acc, level, index) => {
    if (currentXP >= level.xpRequired) return index;
    return acc;
  }, 0);
  
  const nextLevel = xpSystem.levels[currentLevel + 1];
  const currentLevelData = xpSystem.levels[currentLevel];
  
  // Calcule l'XP pour le niveau actuel
  const xpForCurrentLevel = currentXP - currentLevelData.xpRequired;
  const xpRequiredForNextLevel = nextLevel 
    ? nextLevel.xpRequired - currentLevelData.xpRequired 
    : 1000;
  const progressPercentage = nextLevel 
    ? (xpForCurrentLevel / xpRequiredForNextLevel) * 100 
    : 100;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ 
              background: `linear-gradient(135deg, ${currentLevelData.color}20, ${currentLevelData.color}10)`,
              border: `2px solid ${currentLevelData.color}50`,
              color: currentLevelData.color,
            }}
          >
            {currentLevel + 1}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{currentLevelData.title}</h4>
            <p className="text-xs text-zinc-400">
              {nextLevel ? `Prochain: ${nextLevel.title}` : 'Niveau Max'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-400">
            <Zap className="w-4 h-4" />
            <span className="text-lg font-bold font-mono">{currentXP.toLocaleString('en-US')}</span>
            <span className="text-xs text-zinc-400">XP</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center justify-end gap-1 text-rose-400 text-xs mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>{streak}j streak</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Barre de progression */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {nextLevel && (
        <p className="text-xs text-zinc-400 mt-2 text-center">
          Encore <span className="text-amber-400 font-medium">{nextLevel.xpRequired - currentXP}</span> XP pour niveau {currentLevel + 2}
        </p>
      )}
    </div>
  );
}
